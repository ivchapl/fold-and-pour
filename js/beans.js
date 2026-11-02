// Пачки кофе: обжарщик, лот, дни после обжарки, остаток в граммах, своя поправка помола и схема лота.
import { t, WORDS } from './i18n.js';
import { store, makeBean } from './store.js';
import { $, esc, toast, sheet, confirmSheet } from './ui.js';
import { allSchemes, schemeById, beanById, currentBean, currentGrinder, signed } from './core.js';
import { stepsBetween, unitWord, BASE_UM } from './grinders.js';

export const PROCESSES = ['Мытая', 'Хани', 'Натуральная', 'Анаэробная', 'Другая'];
// Обработка подсказывает базовую схему. Мытую на плотную и мягкую делит сам бариста — по зерну
const SCHEME_BY_PROCESS = { 'Хани': 'honey', 'Натуральная': 'natural', 'Анаэробная': 'funky' };

export const beanName = b => b.lot || b.roaster || t('bean.unnamed');
export const beanTitle = b => (b.lot && b.roaster ? `${b.lot} · ${b.roaster}` : beanName(b));

// Дни после обжарки по календарю: в день обжарки — 0
export function restDays(b, ts = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b?.roastDate || '');
  if (!m) return null;
  const today = new Date(ts); today.setHours(0, 0, 0, 0);
  const days = Math.round((today - new Date(+m[1], m[2] - 1, +m[3])) / 864e5);
  return days >= 0 ? days : null;
}
export const restLabel = n => (n == null ? '' : n === 0 ? t('bean.roastDay') : t('bean.rest', { n }));

export function leftLabel(b, dose) {
  if (b.left == null) return '';
  const g = Math.round(b.left), n = dose ? Math.floor(b.left / dose) : 0;
  return n ? t('bean.leftFor', { g, n, brews: WORDS.brew(n) }) : t('bean.leftG', { g });
}

// Строка под названием пачки: обработка, отдых, остаток
export const beanSub = (b, dose) => [b.process, restLabel(restDays(b)), leftLabel(b, dose)].filter(Boolean).join(' · ');

// Поправка лота в делениях выбранной кофемолки
function lotShift(b) {
  const g = currentGrinder(), n = stepsBetween(g, BASE_UM, BASE_UM + (b.grindUm || 0));
  return n ? `${signed(n)} ${unitWord(g, Math.abs(n))}` : '';
}

// Список пачек. switchScheme — переключать ли схему на схему лота (во время заварки — нет)
export function openBeanPicker({ onChange, switchScheme = true } = {}) {
  const s = sheet(t('bean.title'), '<div class="bean-picker" id="bp"></div>', { onClose: () => onChange?.() });
  const box = $('#bp', s.body);
  const item = (b, cur, dose) => `<div class="bean-item${b.id === cur ? ' on' : ''}">
      <button class="bean-pick" data-pick="${esc(b.id)}"><b>${esc(beanTitle(b))}</b>
        <span class="muted small">${esc([beanSub(b, dose), lotShift(b) && t('bean.lotShift', { v: lotShift(b) })].filter(Boolean).join(' · '))}</span></button>
      <button class="icon-btn" data-edit="${esc(b.id)}" aria-label="${esc(t('bean.edit'))}" title="${esc(t('bean.edit'))}">✎</button></div>`;
  const render = () => {
    const st = store.get(), dose = st.settings.dose, cur = currentBean()?.id || '';
    const active = st.beans.filter(b => !b.done), done = st.beans.filter(b => b.done);
    box.innerHTML = `
      <button class="btn btn-main" data-new>＋ ${esc(t('bean.new'))}</button>
      ${active.length ? `<div class="bean-list">${active.map(b => item(b, cur, dose)).join('')}</div>` : `<p class="empty">${esc(t('bean.empty'))}</p>`}
      <button class="g-item bean-none${cur ? '' : ' on'}" data-pick=""><b>${esc(t('bean.none'))}</b></button>
      ${done.length ? `<details class="bean-done"><summary>${esc(t('bean.finished', { n: done.length }))}</summary>
        <div class="bean-list">${done.map(b => item(b, cur, dose)).join('')}</div></details>` : ''}`;
  };
  const pick = id => {
    let switched = null;
    store.update(st => {
      st.settings.beanId = id || null;
      const b = st.beans.find(x => x.id === id);
      if (!b) return;
      b.done = false;
      if (switchScheme && b.schemeId && b.schemeId !== st.settings.schemeId && allSchemes().some(x => x.id === b.schemeId)) {
        st.settings.schemeId = b.schemeId; switched = b.schemeId;
      }
    });
    if (switched) toast(t('bean.schemeSwitched', { name: schemeById(switched).name }));
    s.close();
  };
  box.onclick = e => {
    const p = e.target.closest('[data-pick]');
    if (p) return pick(p.dataset.pick);
    const ed = e.target.closest('[data-edit]');
    if (ed) return openBeanEditor(beanById(ed.dataset.edit), { onClose: render });
    if (e.target.closest('[data-new]')) openBeanEditor(null, { onSave: b => pick(b.id) });
  };
  render();
}

// Карточка пачки: новая (bean = null) или правка существующей
export function openBeanEditor(bean, { onSave, onClose } = {}) {
  const isNew = !bean, b = bean ? { ...bean } : makeBean();
  // у новой пачки схема следует за обработкой, пока её не выбрали руками
  let schemeTouched = !isNew;
  const num = v => (v == null ? '' : String(v).replace('.', ','));
  const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  const shift = isNew ? '' : lotShift(b);
  const s = sheet(isNew ? t('bean.new') : beanName(b), `<form class="editor" id="bf" autocomplete="off">
    <div class="form-grid">
      <label class="field"><span>${t('bean.roaster')}</span><input id="bf-roaster" value="${esc(b.roaster)}"></label>
      <label class="field"><span>${t('bean.lot')}</span><input id="bf-lot" value="${esc(b.lot)}" placeholder="${esc(t('bean.lotPh'))}"></label>
      <label class="field"><span>${t('bean.process')}</span><select id="bf-process">${opt('', '', !b.process)}${PROCESSES.map(p => opt(p, p, p === b.process)).join('')}</select></label>
      <label class="field"><span>${t('bean.roastDate')}</span><input id="bf-roast" type="date" value="${esc(b.roastDate)}"></label>
      <label class="field"><span>${t('bean.weight')}</span><input id="bf-weight" type="text" inputmode="decimal" value="${esc(num(b.weight))}"></label>
      ${isNew ? '' : `<label class="field"><span>${t('bean.left')}</span><input id="bf-left" type="text" inputmode="decimal" value="${esc(num(b.left))}"></label>`}
    </div>
    <label class="field"><span>${t('bean.scheme')}</span><select id="bf-scheme">${opt('', t('bean.schemeAny'), !b.schemeId)}${
      allSchemes().map(x => opt(x.id, `${x.icon || '☕'} ${x.name}`, x.id === b.schemeId)).join('')}</select></label>
    <p class="muted small">${t('bean.schemeHint')}</p>
    ${shift ? `<div class="bean-grind"><span>${esc(t('bean.grind', { v: shift }))}</span>
      <button type="button" class="btn btn-ghost sm" id="bf-grind-reset">${t('bean.grindReset')}</button></div>` : ''}
    <p class="err" id="bf-err" hidden>${t('bean.need')}</p>
    <div class="row-btns"><button class="btn btn-main" type="submit">${t('bean.save')}</button>
      ${isNew ? '' : `<button type="button" class="btn btn-ghost" id="bf-done">${t(b.done ? 'bean.revive' : 'bean.finish')}</button>
      <button type="button" class="btn btn-ghost danger-text" id="bf-del">${t('bean.delete')}</button>`}</div>
  </form>`, { onClose });
  const f = $('#bf', s.body), val = id => $(id, f)?.value.trim() ?? '';
  const grams = id => { const v = parseFloat(val(id).replace(',', '.')); return isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null; };

  $('#bf-scheme', f).onchange = () => (schemeTouched = true);
  $('#bf-process', f).onchange = e => {
    if (!schemeTouched) $('#bf-scheme', f).value = SCHEME_BY_PROCESS[e.target.value] || '';
  };
  const gr = $('#bf-grind-reset', f);
  if (gr) gr.onclick = () => {
    store.update(st => (st.beans.find(x => x.id === b.id).grindUm = 0));
    gr.parentElement.remove(); toast(t('bean.grindResetDone'));
  };
  f.onsubmit = e => {
    e.preventDefault();
    const data = {
      roaster: val('#bf-roaster'), lot: val('#bf-lot'), process: val('#bf-process'), roastDate: val('#bf-roast'),
      weight: grams('#bf-weight'), schemeId: val('#bf-scheme') || null,
    };
    if (!data.lot && !data.roaster) { $('#bf-err', f).hidden = false; return; }
    // остаток: у новой пачки — весь вес; у старой без остатка — вес, если его только что указали
    data.left = isNew ? data.weight : grams('#bf-left') ?? (b.left == null ? data.weight : null);
    let saved;
    store.update(st => {
      if (isNew) { saved = { ...b, ...data }; st.beans.unshift(saved); }
      else { saved = st.beans.find(x => x.id === b.id); Object.assign(saved, data); }
    });
    toast(t('bean.saved')); s.close(); onSave?.(saved);
  };
  if (isNew) return;
  $('#bf-done', f).onclick = () => {
    store.update(st => {
      const x = st.beans.find(y => y.id === b.id);
      x.done = !x.done;
      if (x.done && st.settings.beanId === x.id) st.settings.beanId = null;
    });
    s.close(); onSave?.(beanById(b.id));
  };
  $('#bf-del', f).onclick = async () => {
    if (!await confirmSheet(t('bean.confirmDelete', { name: beanName(b) }), t('bean.delete'))) return;
    store.update(st => {
      st.beans = st.beans.filter(x => x.id !== b.id);
      if (st.settings.beanId === b.id) st.settings.beanId = null;
    });
    toast(t('bean.deleted')); s.close(); onSave?.(null);
  };
}
