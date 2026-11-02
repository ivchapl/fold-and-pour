// Экран «Журнал»: сохранённые заварки, проливы по плану и по факту, повтор, схема из заварки и удаление.
import { t } from './i18n.js';
import { store, uid } from './store.js';
import { html, raw, esc, toast, confirmSheet, sheet, fmtDate } from './ui.js';
import { brewerById } from './schemes.js';
import { schemeById } from './core.js';
import { fmt } from './timer.js';
import { restLabel } from './beans.js';

let root, onRepeat, onChanged = () => {};
const TASTE = { sour: ['log.sour', 'bad'], ok: ['log.ok', 'good'], bitter: ['log.bitter', 'bad'] };
// имя воронки сохраняется в записи; у ранних записей его нет — берём из списка
const brewerName = b => b.brewerName || brewerById(b.brewer).name;
const knobsText = k => [k.acid < 0 && 'knobs.sweeter', k.acid > 0 && 'knobs.brighter', k.body < 0 && 'knobs.lighter', k.body > 0 && 'knobs.stronger']
  .filter(Boolean).map(key => t(key).toLowerCase()).join(' · ');

export function mountJournal(el, { repeat, changed }) { root = el; onRepeat = repeat; if (changed) onChanged = changed; render(); }

export function render() {
  if (!root) return;
  const list = store.get().journal;
  root.innerHTML = `<div class="view-head"><h1>${t('journal.title')}</h1><span class="muted">${list.length || ''}</span></div>
    ${list.length ? `<div class="journal">${list.map(row).join('')}</div>` : `<p class="empty">${t('journal.empty')}</p>`}`;
  root.onclick = e => {
    const item = e.target.closest('[data-id]'); if (!item) return;
    open(list.find(b => b.id === item.dataset.id));
  };
}

function row(b) {
  const c = b.coffee || {};
  const [tk, cls] = TASTE[b.taste] || TASTE.ok;
  return html`<button class="card brew-row" data-id="${b.id}">
    <span class="br-top"><b>${c.lot || b.schemeName}</b><span class="muted">${fmtDate(b.ts)}</span></span>
    <span class="br-mid">${c.roaster ? c.roaster + ' · ' : ''}${b.schemeName} · ${String(b.dose).replace('.', ',')} г · ${b.grinderName} ${b.setting} · ${brewerName(b)}</span>
    <span class="br-bot"><span class="pill ${cls}">${t(tk)}</span><span>сток ${fmt(b.drawdown)}</span>
      ${raw(b.restDays != null ? `<span>${esc(t('bean.restShort', { n: b.restDays }))}</span>` : '')}
      ${raw(b.rating ? `<span class="stars-ro" aria-label="Оценка ${b.rating} из 5">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}</span>` : '')}</span>
  </button>`;
}

// Проливы записи: начало по схеме и фактическое (после «Лью дальше» или ожидания стока)
function poursTable(b) {
  const steps = b.steps || [];
  if (!steps.length) return '';
  const fact = steps.some(x => x.at != null);
  const rowHtml = (x, i) => {
    const d = x.at != null ? Math.round(x.at - x.s) : 0;
    const diff = d ? ` <small class="${d > 0 ? 'late' : 'early'}">${d > 0 ? '+' : '−'}${Math.abs(d)} с</small>` : '';
    return `<tr><td>${i + 1}. ${esc(x.name)}${x.spin ? ` <span class="spin-mark">${esc(t(`spin.mark.${x.spin}`))}</span>` : ''}</td>
      <td>${fmt(x.s)}</td>${fact ? `<td>${x.at != null ? fmt(x.at) + diff : '—'}</td>` : ''}<td>+${x.add} г</td></tr>`;
  };
  return `<h3 class="pf-title">${t('journal.pours')}</h3><div class="pf-wrap"><table class="pf"><thead><tr>
    <th>${t('journal.step')}</th><th>${t('journal.plan')}</th>${fact ? `<th>${t('journal.fact')}</th>` : ''}<th>${t('journal.water')}</th>
    </tr></thead><tbody>${steps.map(rowHtml).join('')}</tbody></table></div>`;
}

// Схема из записи: фактические моменты проливов и доли воды; подсказки — из снимка схемы
function schemeFromBrew(b) {
  const steps = b.steps, total = steps.reduce((a, x) => a + x.add, 0) || 1, snap = b.scheme;
  const at = x => x.at ?? x.s, t0 = at(steps[0]), last = steps[steps.length - 1];
  const day = new Date(b.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return {
    id: uid(), builtin: false, mode: 'steps', icon: '📓', name: `${b.schemeName} · ${day}`.slice(0, 60),
    referenceDose: b.dose, ratio: +(total / b.dose).toFixed(2), temp: b.temp, grindUm: snap?.grindUm ?? schemeById(b.schemeId).grindUm,
    drawdown: snap?.drawdown ?? 40, pourEnd: Math.round(at(last) - t0 + (last.e != null ? last.e - last.s : 15)),
    steps: steps.map(x => ({ at: Math.round(at(x) - t0), frac: x.add / total, name: x.name,
      hint: snap?.steps.find(y => y.name === x.name)?.hint || '', spin: x.spin || '' })),
  };
}

function open(b) {
  const c = b.coffee || {};
  const rows = [
    ['Схема', b.schemeName], ['Доза', `${String(b.dose).replace('.', ',')} г → ${b.water} г воды (1:${String(b.ratio).replace('.', ',')})`],
    ['Температура', `${b.temp} °C`], ['Помол', `${b.grinderName} · ${b.setting} (≈${b.um} мкм)`],
    ['Воронка', brewerName(b)], ['Вода', b.waterLabel],
    ['Сток', `${fmt(b.drawdown)} при цели ${fmt(b.drawdownTarget)}`],
    ['Кофе', [c.roaster, c.lot, c.process].filter(Boolean).join(' · ') || '—'],
    ['Дата обжарки', c.roastDate ? new Date(c.roastDate).toLocaleDateString('ru-RU') : '—'],
  ];
  if (b.restDays != null) rows.push([t('journal.rest'), restLabel(b.restDays)]);
  if (b.knobs) rows.push([t('journal.knobs'), knobsText(b.knobs)]);
  if (b.calibApplied) {
    const d = `${b.calibApplied > 0 ? '+' : '−'}${Math.abs(b.calibApplied)}`;
    rows.push(['Поправка помола', t(b.calibTarget === 'lot' ? 'journal.calibLot' : 'journal.calibGrinder', { d })]);
  }
  const s = sheet(fmtDate(b.ts), `
    <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${poursTable(b)}
    ${b.notes ? `<p class="notes">${esc(b.notes)}</p>` : ''}
    <div class="row-btns"><button class="btn btn-main" data-repeat>${t('journal.repeat')}</button>
      ${b.steps?.length ? `<button class="btn btn-ghost" data-save>${t('journal.saveScheme')}</button>` : ''}
      <button class="btn btn-ghost danger-text" data-del>${t('journal.delete')}</button></div>`);
  s.body.querySelector('[data-repeat]').onclick = () => { s.close(); onRepeat(b); };
  const sv = s.body.querySelector('[data-save]');
  if (sv) sv.onclick = () => {
    const x = schemeFromBrew(b);
    store.update(st => st.schemes.unshift(x));
    s.close(); toast(t('journal.schemeSaved', { name: x.name })); onChanged();
  };
  s.body.querySelector('[data-del]').onclick = async () => {
    if (!await confirmSheet(t('journal.confirmDelete', { date: fmtDate(b.ts) }), t('journal.delete'))) return;
    store.update(st => { st.journal = st.journal.filter(x => x.id !== b.id); });
    s.close(); toast(t('journal.deleted')); render();
  };
}
