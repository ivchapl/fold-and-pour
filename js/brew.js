// Экран «Заварка»: схема, пачка, доза, помол, ручки вкуса, таймер, запись результата и совет по помолу.
import { t, WORDS } from './i18n.js';
import { store, uid } from './store.js';
import { $, $$, html, raw, esc, toast, sheet, confirmSheet } from './ui.js';
import { Dial, BrewClock, cue, ALERT_MODES, fmt } from './timer.js';
import { plan, brewerById, knobLimits, snapshotScheme, MIN_DOSE, MAX_DOSE, waterLabel } from './schemes.js';
import { currentScheme, allSchemes, grindFor, currentWater, currentBean, beanById, knobsFor, alertMode, signed } from './core.js';
import { umPerStep, shiftBy, settingFor } from './grinders.js';
import { brewerChipsHtml } from './settings.js';
import { openBeanPicker, openBeanEditor, beanTitle, beanName, beanSub, restDays } from './beans.js';

// P — план заварки, GI — помол, KN — ручки вкуса: всё на момент последнего пересчёта экрана; RUN — ход текущей заварки
let root, dial, clock, P = null, GI = null, KN = { acid: 0, body: 0 }, RUN = null, phase = 'idle', drainedAt = null, onChanged = () => {};
let CTX = null, resultSaved = false, confirmingReset = false;
const S = () => store.get().settings;
export const displayWater = () => phase !== 'idle' && CTX ? CTX.water : currentWater();
const ALERT_ICON = { sound: '🔔', both: '🔔📳', vibro: '📳', off: '🔕' };

export function mountBrew(el, { changed } = {}) {
  root = el; if (changed) onChanged = changed;
  const seg = (knob, a, b, c) => `<div class="seg" data-knob="${knob}">
      <button type="button" data-v="-1">${a}</button><button type="button" data-v="0">${b}</button><button type="button" data-v="1">${c}</button></div>`;
  root.innerHTML = `
    <div class="scheme-strip" id="scheme-strip" role="tablist" aria-label="${t('schemes.title')}"></div>
    <div class="brew-grid">
      <section class="card dial-card" aria-label="Таймер">
        <div class="dial-wrap">
          <svg id="dial" viewBox="0 0 320 320" aria-hidden="true"></svg>
          <div class="dial-center">
            <div class="t-phase" id="t-phase"></div>
            <div class="t-time" id="t-time">0:00</div>
            <div class="t-sub" id="t-sub"></div>
          </div>
        </div>
        <div class="pour-now">
          <div class="pour-box" id="box-add"><div class="k">${t('brew.pourNow')}</div><div class="v accent" id="val-add"></div></div>
          <div class="pour-box"><div class="k">${t('brew.target')}</div><div class="v" id="val-target"></div></div>
        </div>
        <p class="pour-hint" id="pour-hint"></p>
        <p class="next-step" id="next-step"></p>
        <div class="btn-row">
          <button class="btn btn-main" id="btn-main">${t('brew.start')}</button>
          <button class="btn btn-sun" id="btn-next" hidden>${t('brew.pourNext')}</button>
          <button class="btn btn-sun" id="btn-drained" hidden>${t('brew.drained')}</button>
          <button class="btn btn-ghost icon" id="btn-reset" aria-label="${t('brew.reset')}" title="${t('brew.reset')}">↺</button>
          <button class="btn btn-ghost icon" id="btn-sound"></button>
        </div>
        <div class="meta-row">
          <span>${t('brew.interval')} <b id="m-interval"></b></span>
          <span>${t('brew.pourTime')} <b id="m-pour"></b></span>
          <span>${t('brew.finish')} <b id="m-finish"></b></span>
        </div>
      </section>
      <section class="card">
        <div class="dose-row">
          <span class="label">${t('brew.dose')}</span>
          <div class="stepper">
            <button class="btn btn-ghost icon" id="dose-minus" aria-label="−0,5 г">−</button>
            <label class="dose-val"><input id="dose" type="number" inputmode="decimal" step="0.5" min="${MIN_DOSE}" max="${MAX_DOSE}"><span>г</span></label>
            <button class="btn btn-ghost icon" id="dose-plus" aria-label="+0,5 г">+</button>
          </div>
          <div class="chips" id="dose-chips">${[14, 15, 18, 22].map(d => `<button class="chip" data-dose="${d}">${d}</button>`).join('')}</div>
        </div>
        <div class="params">
          <button class="param wide" id="p-bean"><span class="k">${t('brew.coffee')}</span><span class="v small" id="v-bean"></span><span class="s" id="s-bean"></span></button>
          <button class="param wide" id="p-grind"><span class="k">${t('brew.grind')}</span><span class="v" id="v-grind"></span><span class="s" id="s-grind"></span></button>
          <div class="param"><span class="k">${t('brew.temp')}</span><span class="v" id="v-temp"></span><span class="s">${t('brew.tempSub')}</span></div>
          <div class="param"><span class="k">${t('brew.ratio')}</span><span class="v" id="v-ratio"></span><span class="s" id="s-ratio"></span></div>
          <button class="param wide" id="p-brewer"><span class="k">${t('brew.brewer')}</span><span class="v small" id="v-brewer"></span><span class="s" id="s-brewer"></span></button>
        </div>
        <div class="knobs" id="knobs">
          <div class="knob"><span class="label">${t('knobs.acid')}</span>${seg('acid', t('knobs.sweeter'), t('knobs.asIs'), t('knobs.brighter'))}</div>
          <div class="knob"><span class="label">${t('knobs.body')}</span>${seg('body', t('knobs.lighter'), t('knobs.asIs'), t('knobs.stronger'))}</div>
          <p class="knob-note" id="knob-note"></p>
        </div>
        <div class="steps-head"><h2>${t('brew.steps')}</h2><span class="total-chip" id="total-chip"></span></div>
        <ol class="steps" id="steps"></ol>
      </section>
    </div>
    <div id="log-slot"></div>`;

  dial = new Dial($('#dial', root));
  clock = new BrewClock({ onTick: update, onBoundary });

  $('#btn-main', root).onclick = () => (clock.running ? pauseClock() : startClock());
  $('#btn-reset', root).onclick = requestReset;
  $('#btn-drained', root).onclick = () => finish(clock.now());
  $('#btn-next', root).onclick = pourNext;
  // Сигналы по кругу: звук → звук и вибрация → вибрация → без сигналов (вибрация только там, где она есть)
  $('#btn-sound', root).onclick = () => {
    const m = ALERT_MODES[(ALERT_MODES.indexOf(alertMode()) + 1) % ALERT_MODES.length];
    store.update(s => (s.settings.alerts = m)); paintAlerts();
    cue('step', m); toast(t('alerts.toast', { m: t(`alerts.${m}`) }));
  };

  const setDose = d => {
    if (phase !== 'idle') { $('#dose', root).value = CTX.dose; toast('Дозу можно изменить после завершения или сброса заварки'); return; }
    d = Math.round(Math.min(MAX_DOSE, Math.max(MIN_DOSE, +d || 14)) * 2) / 2;
    store.update(s => (s.settings.dose = d)); refresh();
  };
  $('#dose-minus', root).onclick = () => setDose(S().dose - 0.5);
  $('#dose-plus', root).onclick = () => setDose(S().dose + 0.5);
  $('#dose', root).onchange = e => setDose(e.target.value);
  $('#dose-chips', root).onclick = e => { const b = e.target.closest('[data-dose]'); if (b) setDose(b.dataset.dose); };
  $('#p-bean', root).onclick = openBeans;
  $('#p-grind', root).onclick = openGrindSheet;
  $('#p-brewer', root).onclick = openBrewerSheet;
  $('#knobs', root).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
    if (phase !== 'idle') { toast(t('knobs.locked')); return; }
    const key = b.closest('[data-knob]').dataset.knob, id = currentScheme().id;
    store.update(s => (s.settings.knobs[id] = { ...knobsFor(id), [key]: +b.dataset.v }));
    refresh();
  };

  // Пробел — следующее действие: старт, «Лью дальше», «Сток закончился»
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || /input|textarea|button|select/i.test(e.target.tagName) || root.hidden || document.querySelector('.sheet-wrap')) return;
    e.preventDefault();
    if (!clock.running) startClock();
    else if (RUN.cur < lastIdx()) pourNext();
    else if (phase === 'running') finish(clock.now());
  });
  refresh();
}

// Полная перерисовка при смене схемы, дозы, пачки, ручек вкуса, кофемолки или воронки
export function refresh() {
  if (!root) return;
  // Экран и журнал продолжают использовать снимок текущей заварки.
  if (phase !== 'idle' && !(phase === 'done' && resultSaved)) { paintAlerts(); toast('Изменения применятся к следующей заварке'); return; }
  resetClockOnly();
  const sc = currentScheme(), dose = S().dose, lim = knobLimits(sc), k = knobsFor(sc.id);
  // ручка, которой у этой схемы нет (например, после правки шагов), стоит в среднем положении
  KN = { acid: lim.acid ? k.acid : 0, body: (k.body < 0 && !lim.lighter) || (k.body > 0 && !lim.stronger) ? 0 : k.body };
  P = plan(sc, dose, KN);
  GI = grindFor(sc, dose);
  CTX = { sc: structuredClone(sc), dose, brewer: S().brewer, custom: structuredClone(S().custom),
    waitTap: S().waitTap, water: structuredClone(currentWater()), beanId: currentBean()?.id || null };

  $('#scheme-strip', root).innerHTML = allSchemes().map(x =>
    `<button class="chip scheme-chip${x.id === sc.id ? ' on' : ''}" role="tab" aria-selected="${x.id === sc.id}" data-id="${esc(x.id)}">${esc(x.icon || '☕')} ${esc(x.name)}</button>`).join('');
  const strip = $('#scheme-strip', root), on = $('.scheme-chip.on', strip);
  if (on) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - 16);
  strip.onclick = e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    if (phase !== 'idle') { toast('Схему можно изменить после завершения или сброса заварки'); return; }
    store.update(s => (s.settings.schemeId = b.dataset.id)); refresh();
  };

  $('#dose', root).value = dose;
  $$('#dose-chips .chip', root).forEach(c => c.classList.toggle('on', +c.dataset.dose === dose));
  $('#v-temp', root).textContent = `${sc.temp} °C`;
  $('#v-ratio', root).textContent = `1:${(Math.round(P.ratio * 10) / 10).toString().replace('.', ',')}`;
  $('#s-ratio', root).textContent = t('brew.ratioSub', { dose: String(dose).replace('.', ','), water: P.total });
  $('#v-brewer', root).textContent = brewerById(S().brewer).name;
  $('#s-brewer', root).textContent = brewerById(S().brewer).note || '';
  paintBean();

  const gi = GI;
  $('#v-grind', root).innerHTML = html`<span class="gname">${gi.g.name}</span> <b>${gi.set.label}</b>`;
  const parts = [t('brew.grindSub', { um: Math.round(gi.set.um) })];
  if (gi.set.sub) parts.unshift(gi.set.sub);
  const p = gi.parts, u = gi.unit, d = n => `${signed(n)} ${u(Math.abs(n))}`;
  if (p.calib) parts.push(t('brew.calib', { d: d(p.calib) }));
  if (p.replay) parts.push('помол из журнала');
  if (p.lot) parts.push(t('brew.lotShift', { d: d(p.lot) }));
  if (p.dose) parts.push(t('brew.doseShift', { d: d(p.dose) }));
  if (p.brewer) parts.push(t('brew.brewerShift', { d: d(p.brewer) }));
  $('#s-grind', root).textContent = parts.join(' · ');

  paintKnobs(sc, dose, lim);

  $('#steps', root).innerHTML = P.steps.map((s, i) => html`
    <li class="step" id="step-${i}">
      <div class="row1"><span class="name"><span class="tick">✓</span>${i + 1}. ${s.name}${
        raw(s.spin ? ` <span class="spin-mark">${esc(t(`spin.mark.${s.spin}`))}</span>` : '')}</span><span class="time">${fmt(s.s)}–${fmt(s.e)}</span></div>
      <div class="row2"><span>${t('brew.pour')} <b>+${s.add} г</b></span><span>${t('brew.onScale')} <b>${s.cum} г</b></span></div>
      <div class="bar"><i id="bar-${i}"></i></div>
    </li>`).join('');
  $('#total-chip', root).textContent = t('brew.total', { w: P.total, n: P.steps.length, pours: WORDS.pour(P.steps.length) });
  $('#m-interval', root).textContent = `${P.interval} с`;
  $('#m-pour', root).textContent = `≈${P.pourSec} с`;
  $('#m-finish', root).textContent = `≈${fmt(P.drawEnd)}`;
  paintAlerts();

  dial.build(P.steps.length);
  update(0);
  onChanged();
}

function paintAlerts() {
  const b = $('#btn-sound', root), m = alertMode(), label = `${t('alerts.title')}: ${t(`alerts.${m}`)}`;
  b.textContent = ALERT_ICON[m]; b.title = label; b.setAttribute('aria-label', label);
}

function paintBean() {
  const b = currentBean();
  $('#v-bean', root).textContent = b ? beanTitle(b) : t('bean.notChosen');
  $('#s-bean', root).textContent = b ? beanSub(b, S().dose) || t('bean.noDetails') : t('bean.addHint');
  const sel = $('#log-bean', root);
  if (sel) sel.innerHTML = beanOptions(b?.id || '');
}

function paintKnobs(sc, dose, lim) {
  $$('#knobs [data-knob]', root).forEach(seg => {
    const key = seg.dataset.knob;
    $$('button', seg).forEach(b => {
      const v = +b.dataset.v;
      b.classList.toggle('on', KN[key] === v);
      b.setAttribute('aria-pressed', KN[key] === v);
      b.disabled = key === 'acid' ? v !== 0 && !lim.acid : (v < 0 && !lim.lighter) || (v > 0 && !lim.stronger);
    });
  });
  const P0 = plan(sc, dose), notes = [];
  if (KN.acid) notes.push(t(KN.acid < 0 ? 'knobs.noteSweet' : 'knobs.noteBright',
    { a: P.steps[0].add, b: P.steps[1].add, a0: P0.steps[0].add, b0: P0.steps[1].add }));
  if (KN.body) notes.push(t('knobs.noteBody', { n: P.steps.length, pours: WORDS.pour(P.steps.length), n0: P0.steps.length, t: fmt(P.drawEnd) }));
  $('#knob-note', root).textContent = notes.join(' · ') || t('knobs.hint');
}

// ---------- ход заварки ----------
// Начавшиеся шаги хранят фактическое время начала, ещё не начавшиеся идут по плану со сдвигом shift.
// «Лью дальше» начинает следующий пролив сейчас и сдвигает весь остаток плана.
const newRun = () => ({ cur: 0, shift: 0, at: [0], tap: [false], spun: -1, actionAt: -Infinity });
const lastIdx = () => P.steps.length - 1;
const startOf = j => (j <= RUN.cur ? RUN.at[j] : P.steps[j].s + RUN.shift);
const endOf = j => (j < lastIdx() ? startOf(j + 1) : startOf(j) + (P.steps[j].e - P.steps[j].s));
const brewEnd = () => endOf(lastIdx());
const drawEnd = () => brewEnd() + (P.drawEnd - P.brewEnd);
// Вращение после расчётного окончания налива (масса порции / скорость струи).
const spinAt = j => startOf(j) + P.steps[j].pourSec;

function advance(tm, tapped) {
  const j = RUN.cur + 1;
  if (j > lastIdx()) return;
  if (tapped) RUN.shift = tm - P.steps[j].s;
  RUN.at[j] = P.steps[j].s + RUN.shift; RUN.tap[j] = tapped; RUN.cur = j;
}

function pourNext() {
  if (phase !== 'running' || !clock.running || RUN.cur >= lastIdx()) return;
  const tm = clock.now();
  if (tm - RUN.actionAt < 0.5) return;
  RUN.actionAt = tm;
  advance(tm, true);
  update(tm);
}

function update(tm) {
  const steps = P.steps, L = lastIdx(), c = RUN.cur;
  const draining = c === L && tm >= brewEnd();
  // режим «по кнопке»: время следующего пролива по плану прошло, ждём «Лью дальше»
  const waiting = c < L && tm >= steps[c + 1].s + RUN.shift;
  $('#t-time', root).textContent = fmt(tm);
  const setBox = (add, target, hint, next = '') => {
    $('#val-add', root).textContent = add; $('#val-target', root).textContent = target;
    $('#pour-hint', root).textContent = hint; $('#next-step', root).textContent = next;
  };
  // Что дальше: следующий пролив (и вращение после него) или дренаж после последнего
  const nextAfter = i => {
    const n = steps[i + 1];
    if (!n) return t('brew.nextDrain', { t: fmt(drawEnd()) });
    const txt = t('brew.next', { name: n.name, add: n.add, at: fmt(startOf(i + 1)) });
    return n.spin ? txt + t('brew.nextSpin', { spin: t(`spin.${n.spin}`).toLowerCase() }) : txt;
  };
  let spinning = false;
  if (phase === 'done') {
    $('#t-phase', root).textContent = `${t('brew.done')} ☕`;
    $('#t-sub', root).textContent = t('brew.doneSub', { t: fmt(drainedAt ?? tm) });
    setBox('—', `${P.total} г`, t('brew.doneHint'));
  } else if (!clock.running && tm === 0) {
    $('#t-phase', root).textContent = t('brew.ready');
    $('#t-sub', root).textContent = t('brew.stageRange', { from: fmt(steps[0].s), to: fmt(steps[0].e) });
    setBox(`+${steps[0].add} г`, `${steps[0].cum} г`, steps[0].hint, nextAfter(0));
  } else if (waiting) {
    const n = steps[c + 1];
    $('#t-phase', root).textContent = t('brew.waitPour', { name: n.name });
    $('#t-sub', root).textContent = t('brew.waitSub', { s: Math.floor(tm - (n.s + RUN.shift)) });
    setBox(`+${n.add} г`, `${n.cum} г`, n.hint, nextAfter(c + 1));
  } else if (!draining) {
    const s = steps[c], a = s.spin ? spinAt(c) : Infinity;
    spinning = tm >= a && tm < a + 4;
    $('#t-phase', root).textContent = t('brew.stage', { n: c + 1, name: s.name });
    $('#t-sub', root).textContent = c === L ? t('brew.lastPour') : t('brew.untilNext', { s: Math.max(0, Math.ceil(endOf(c) - tm)) });
    setBox(`+${s.add} г`, `${s.cum} г`, spinning ? `${t(`spin.${s.spin}`)}: ${t(`spin.${s.spin}Hint`)}` : s.hint, nextAfter(c));
  } else {
    $('#t-phase', root).textContent = t('brew.drawdown');
    $('#t-sub', root).textContent = t('brew.finishTarget', { t: fmt(drawEnd()) });
    setBox('—', `${P.total} г`, t('brew.drawdownHint'));
  }
  $('#pour-hint', root).classList.toggle('spin-now', spinning);
  $('#box-add', root).classList.toggle('hot', clock.running && !draining && (waiting || tm - startOf(c) < 12));
  $('#btn-next', root).hidden = !(phase === 'running' && c < L);
  $('#btn-next', root).classList.toggle('pulse', waiting);
  $('#btn-drained', root).hidden = !(phase === 'running' && c === L);
  $('#knobs', root).classList.toggle('locked', phase !== 'idle');
  $('#m-finish', root).textContent = `≈${fmt(drawEnd())}`;

  steps.forEach((s, i) => {
    const a = startOf(i), b = endOf(i);
    const f = i < c ? 1 : i > c ? 0 : Math.min(1, Math.max(0, (tm - a) / (b - a)));
    dial.set(i, f);
    const li = $(`#step-${i}`, root); if (!li) return;
    li.classList.toggle('active', i === c && !draining && phase !== 'done');
    li.classList.toggle('done', i < c || (i === c && tm >= b));
    $('.time', li).textContent = `${fmt(a)}–${fmt(b)}`;
    $(`#bar-${i}`, root).style.width = `${f * 100}%`;
  });
}

// jumped — время скакнуло (приложение было в фоне): пропущенные сигналы и вращение не показываем
function onBoundary(prev, now, jumped) {
  // если «Сток закончился» так и не нажали — останавливаемся через 2 минуты после цели
  if (now >= drawEnd() + 120) { finish(null); return; }
  const m = alertMode(), sound = !jumped && m !== 'off';
  // следующий пролив: по таймеру начинается сам, в режиме «по кнопке» звучит только «пора»
  while (RUN.cur < lastIdx()) {
    const sj = P.steps[RUN.cur + 1].s + RUN.shift;
    if (now < sj) { if (sound && prev < sj - 5 && now >= sj - 5) cue('warn', m); break; }
    if (CTX.waitTap) { if (sound && prev < sj) cue('step', m); break; }
    advance(sj, false);
    if (sound && prev < sj) cue('step', m);
  }
  const c = RUN.cur, sp = P.steps[c].spin;
  if (sp && RUN.spun < c && now >= spinAt(c)) {
    RUN.spun = c;
    if (!jumped && now - spinAt(c) < 2) { dial.spin(sp); if (m !== 'off') cue('spin', m); }
  }
  if (c === lastIdx()) {
    if (sound && prev < brewEnd() && now >= brewEnd()) cue('step', m);
    if (sound && prev < drawEnd() && now >= drawEnd()) cue('finish', m);
  }
}

async function startClock() {
  if (phase === 'done') { if (!await requestReset()) return; }
  if (phase === 'idle') CTX.water = structuredClone(currentWater());
  phase = 'running';
  if (alertMode() !== 'off') cue('unlock', alertMode());
  clock.start();
  const b = $('#btn-main', root); b.textContent = t('brew.pause'); b.classList.add('running');
}
function pauseClock() {
  clock.pause();
  const b = $('#btn-main', root); b.textContent = t('brew.resume'); b.classList.remove('running');
  update(clock.elapsed);
}
function resetClockOnly() {
  clock?.reset();
  phase = 'idle'; drainedAt = null; resultSaved = false; RUN = newRun();
  const b = root && $('#btn-main', root);
  if (b) { b.textContent = t('brew.start'); b.classList.remove('running'); }
  if (root) $('#log-slot', root).innerHTML = '';
}
function resetAll() { resetClockOnly(); refresh(); }
async function requestReset() {
  if (confirmingReset) return false;
  if (phase === 'running' || (phase === 'done' && !resultSaved)) {
    confirmingReset = true;
    const ok = await confirmSheet('Сбросить текущую заварку? Несохранённый результат будет потерян.', 'Сбросить');
    confirmingReset = false;
    if (!ok) return false;
  }
  resetAll(); return true;
}

function finish(at) {
  clock.pause();
  phase = 'done'; drainedAt = at;
  const b = $('#btn-main', root); b.textContent = t('brew.start'); b.classList.remove('running');
  update(at ?? clock.elapsed);
  showLogForm(at);
}

// ---------- пачка ----------
// Во время заварки схема и помол не пересчитываются: молоть уже поздно, меняется только подпись
function openBeans() {
  if (phase !== 'idle') { toast('Пачку этой заварки можно выбрать в форме результата'); return; }
  openBeanPicker({
    switchScheme: phase === 'idle',
    onChange: () => { if (phase === 'idle') { refresh(); onChanged(); } else paintBean(); },
  });
}

function beanOptions(selected) {
  const list = store.get().beans.filter(b => !b.done || b.id === selected);
  return `<option value="">${esc(t('bean.none'))}</option>`
    + list.map(b => `<option value="${esc(b.id)}"${b.id === selected ? ' selected' : ''}>${esc(beanTitle(b))}</option>`).join('')
    + `<option value="__new">＋ ${esc(t('bean.new'))}…</option>`;
}

// ---------- запись заварки ----------
function showLogForm(at) {
  const target = P.drawEnd, time = at != null ? Math.round(at) : target;
  const slot = $('#log-slot', root);
  slot.innerHTML = html`
  <form class="card log-card" id="log-form" autocomplete="off">
    <h2>${t('log.title')}</h2>
    <label class="field"><span>${t('log.coffee')}</span><select id="log-bean">${raw(beanOptions(CTX.beanId || ''))}</select></label>
    <div class="form-grid">
      <label class="field"><span>${t('log.time')} <small>${t('log.target', { t: fmt(target) })}</small></span>
        <input id="log-time" inputmode="numeric" pattern="[0-9]{1,3}:[0-5][0-9]" value="${fmt(time)}" required></label>
      <fieldset class="field"><legend>${t('log.taste')}</legend>
        <div class="seg" id="log-taste">
          <button type="button" data-v="sour">${t('log.sour')}</button>
          <button type="button" data-v="ok" class="on">${t('log.ok')}</button>
          <button type="button" data-v="bitter">${t('log.bitter')}</button>
        </div></fieldset>
      <fieldset class="field"><legend>${t('log.rating')}</legend>
        <div class="stars" id="log-stars">${raw([1, 2, 3, 4, 5].map(n => `<button type="button" data-v="${n}" aria-label="${n}">★</button>`).join(''))}</div></fieldset>
    </div>
    <label class="field"><span>${t('log.notes')}</span><textarea id="log-notes" rows="2" placeholder="${t('log.notesPh')}"></textarea></label>
    <div class="row-btns">
      <button class="btn btn-main" type="submit">${t('log.save')}</button>
      <button class="btn btn-ghost" type="button" id="log-skip">${t('log.skip')}</button>
    </div>
  </form>`;
  let taste = 'ok', rating = 0;
  const bs = $('#log-bean', slot);
  let prevBean = bs.value;
  bs.onchange = () => {
    if (bs.value !== '__new') { prevBean = bs.value; return; }
    let made = null;
    openBeanEditor(null, {
      onSave: b => (made = b),
      onClose: () => { prevBean = made?.id ?? prevBean; bs.innerHTML = beanOptions(prevBean); },
    });
  };
  $('#log-taste', slot).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    taste = b.dataset.v; $$('#log-taste button', slot).forEach(x => x.classList.toggle('on', x === b));
  };
  $('#log-stars', slot).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    rating = +b.dataset.v; $$('#log-stars button', slot).forEach(x => x.classList.toggle('on', +x.dataset.v <= rating));
  };
  $('#log-skip', slot).onclick = () => { slot.innerHTML = ''; resetAll(); };
  $('#log-form', slot).onsubmit = e => {
    e.preventDefault();
    const m = /^(\d{1,3}):([0-5]\d)$/.exec($('#log-time', slot).value.trim());
    if (!m) { toast('Введите время в формате минуты:секунды'); return; }
    const sec = +m[1] * 60 + +m[2];
    saveBrew({ sec, taste, rating, notes: $('#log-notes', slot).value.trim(), beanId: bs.value === '__new' ? '' : bs.value });
  };
  slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveBrew({ sec, taste, rating, notes, beanId }) {
  if (resultSaved) return;
  const sc = CTX.sc, dose = CTX.dose, gi = GI, w = CTX.water, ts = Date.now(), bean = beanById(beanId);
  const brew = {
    id: uid(), ts, schemeId: sc.id, schemeName: sc.name, dose, water: P.total, ratio: +P.ratio.toFixed(2),
    temp: sc.temp, brewer: CTX.brewer, brewerName: brewerById(CTX.brewer).name, grinderId: gi.g.id, grinderName: gi.g.name, setting: gi.set.label, um: gi.set.um,
    customGrinder: gi.g.custom ? structuredClone(CTX.custom) : null, waterProfile: structuredClone(w),
    waterLabel: waterLabel(w), drawdown: sec, drawdownTarget: P.drawEnd, taste, rating, notes,
    beanId: bean?.id || null,
    coffee: bean ? { roaster: bean.roaster, lot: bean.lot, process: bean.process, roastDate: bean.roastDate } : {},
    restDays: bean ? restDays(bean, ts) : null,
    knobs: KN.acid || KN.body ? { ...KN } : null,
    // план и факт: s, e — по схеме, at — когда пролив начался на самом деле, tap — по кнопке «Лью дальше»
    steps: P.steps.map((s, i) => ({ s: s.s, e: s.e, add: s.add, name: s.name, spin: s.spin || '',
      at: i <= RUN.cur ? Math.round(RUN.at[i]) : null, tap: !!RUN.tap[i] })),
    scheme: snapshotScheme(sc),
  };
  let left = null;
  store.update(s => {
    s.journal.unshift(brew);
    s.settings.beanId = brew.beanId;
    const b = s.beans.find(x => x.id === brew.beanId);
    if (!b) return;
    b.schemeId = sc.id;   // лот запоминает схему, по которой его варили
    if (b.left != null) left = b.left = Math.max(0, Math.round((b.left - dose) * 10) / 10);
  });
  toast(left != null && left < dose * 2 ? t('log.savedLeft', { g: String(left).replace('.', ',') }) : t('log.saved'));
  resultSaved = true;
  showSuggestion(brew);
}

// Совет: вкус главнее времени. Кисло → мельче, горько → крупнее; время усиливает поправку.
export function suggestion(brew, g, um) {
  const dt = brew.drawdown - brew.drawdownTarget;
  let delta = 0;
  if (brew.taste === 'sour') delta = dt < -15 ? -30 : -23;
  if (brew.taste === 'bitter') delta = dt > 15 ? 30 : 23;
  if (!delta) return { n: 0, dt };
  let n = Math.round(delta / umPerStep(g, um));
  if (!n) n = Math.sign(delta);
  return { n, dt, toUm: shiftBy(g, um, n) };
}

// Поправка уходит в пачку («для этого лота») или в калибровку кофемолки («для всех лотов»)
function showSuggestion(brew) {
  const gi = GI, sg = suggestion(brew, gi.g, gi.set.um), bean = beanById(brew.beanId);
  const slot = $('#log-slot', root);
  const unit = gi.unit(Math.abs(sg.n));
  let text, actions = '', note = '';
  if (!sg.n) {
    text = t('calib.keep', { setting: gi.set.label });
    if (Math.abs(sg.dt) > 30) text += `. ${t('calib.timeNote', { d: `${sg.dt > 0 ? '+' : '−'}${Math.abs(sg.dt)} с` })}`;
  } else {
    const to = settingFor(gi.g, sg.toUm).label;
    text = t(sg.n < 0 ? 'calib.finer' : 'calib.coarser', { n: Math.abs(sg.n), unit, from: gi.set.label, to });
    actions = bean
      ? `<button class="btn btn-main" data-apply="lot">${esc(t('calib.applyLot'))}</button><button class="btn btn-ghost" data-apply="grinder">${esc(t('calib.applyGrinder'))}</button>`
      : `<button class="btn btn-main" data-apply="grinder">${esc(t('calib.apply'))}</button>`;
    note = bean ? t('calib.whereLot', { lot: beanName(bean) }) : t('calib.whereNoBean');
  }
  slot.innerHTML = `<section class="card suggest-card"><h2>${t('calib.suggest')}</h2><p>${esc(text)}</p>
    ${note ? `<p class="muted small">${esc(note)}</p>` : ''}
    <div class="row-btns">${actions}<button class="btn btn-ghost" id="calib-close">${t('common.close')}</button></div></section>`;
  $('#calib-close', slot).onclick = () => { slot.innerHTML = ''; resetAll(); };
  $$('[data-apply]', slot).forEach(btn => (btn.onclick = () => {
    const target = btn.dataset.apply;
    // разница между целью и тем, что сейчас дал бы расчёт для этой пачки
    const d = sg.toUm - grindFor(CTX.sc, CTX.dose, gi.g, bean, CTX.brewer).set.um;
    store.update(s => {
      if (target === 'lot') { const b = s.beans.find(x => x.id === bean.id); b.grindUm = (b.grindUm || 0) + d; }
      else s.calibration[gi.g.id] = (s.calibration[gi.g.id] || 0) + d;
      const j = s.journal.find(x => x.id === brew.id);
      if (j) { j.calibApplied = Math.round(d); j.calibTarget = target; }
    });
    toast(t(target === 'lot' ? 'calib.appliedLot' : 'calib.applied')); slot.innerHTML = ''; resetAll();
  }));
}

// Смена воронки прямо с экрана заварки
function openBrewerSheet() {
  if (phase !== 'idle') { toast('Воронку можно изменить после завершения или сброса заварки'); return; }
  const s = sheet(t('brew.brewer'), `<div id="br-pick">${brewerChipsHtml(S().brewer)}</div>
    <p class="muted small">${esc(t('settings.brewerHint'))}</p>`);
  $('#br-pick', s.body).onclick = e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    store.update(st => (st.settings.brewer = b.dataset.b));
    s.close(); refresh(); onChanged();
  };
}

// Быстрая ручная поправка помола: ±1 деление для этого лота или для кофемолки
function openGrindSheet() {
  if (phase !== 'idle') { toast('Помол можно изменить после завершения или сброса заварки'); return; }
  const sc = currentScheme(), gi = grindFor(sc, S().dose), bean = currentBean();
  const u1 = esc(gi.unit(1)), d = n => (n ? `${signed(n)} ${gi.unit(Math.abs(n))}` : t('grind.none'));
  const pair = target => `<div class="row-btns">
      <button class="btn btn-ghost" data-t="${target}" data-n="-1">${t('grind.finer', { u: u1 })}</button>
      <button class="btn btn-ghost" data-t="${target}" data-n="1">${t('grind.coarser', { u: u1 })}</button></div>`;
  const s = sheet(gi.g.name, `
    <p class="sheet-lead">${esc(gi.set.label)}${gi.set.sub ? ' · ' + esc(gi.set.sub) : ''} · ≈${Math.round(gi.set.um)} мкм</p>
    ${bean ? `<div class="grind-block"><h3>${esc(t('grind.lot', { lot: beanName(bean) }))}</h3>
      <p class="muted small">${esc(t('grind.lotHint', { v: d(gi.parts.lot) }))}</p>${pair('lot')}</div>`
      : `<p class="muted small">${esc(t('grind.noBean'))}</p>`}
    <div class="grind-block"><h3>${t('grind.grinder')}</h3>
      <p class="muted small">${esc(t('grind.grinderHint', { v: d(gi.parts.calib) }))}</p>${pair('grinder')}</div>
    <p><a href="#settings" data-go>${t('grind.more')}</a></p>`);
  s.body.addEventListener('click', e => {
    const b = e.target.closest('[data-n]');
    if (b) {
      const cur = grindFor(sc, S().dose), to = shiftBy(cur.g, cur.set.um, +b.dataset.n), delta = to - cur.set.um;
      store.update(st => {
        if (b.dataset.t === 'lot') { const x = st.beans.find(y => y.id === bean.id); x.grindUm = (x.grindUm || 0) + delta; }
        else st.calibration[cur.g.id] = (st.calibration[cur.g.id] || 0) + delta;
      });
      s.close();
      if (phase === 'idle') { refresh(); onChanged(); toast(t(b.dataset.t === 'lot' ? 'calib.appliedLot' : 'calib.applied')); }
      else toast(t('calib.nextTime'));
    }
    if (e.target.closest('[data-go]')) s.close();
  });
}
