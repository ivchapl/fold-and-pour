// Таймер заварки: циферблат с сегментами вливаний, сигналы звуком и вибрацией, удержание экрана.
const NS = 'http://www.w3.org/2000/svg';
const CX = 160, CY = 160, R = 138, GAP = 7;

const polar = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
function arc(r, a0, a1) {
  const [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export class Dial {
  constructor(svg) { this.svg = svg; this.segs = []; this.n = 0; }
  build(n) {
    const svg = this.svg; svg.innerHTML = ''; this.n = n; this.segs = [];
    // воронка сверху: 16 рёбер и край — эта часть покачивается при вращении
    const cone = el('g', { class: 'dial-cone' });
    for (let i = 0; i < 16; i++) {
      const [x0, y0] = polar(84, i * 22.5), [x1, y1] = polar(120, i * 22.5);
      cone.appendChild(el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'dial-rib' }));
    }
    cone.appendChild(el('circle', { cx: CX, cy: CY, r: 78, class: 'dial-inner' }));
    svg.appendChild(cone);
    const span = (360 - n * GAP) / n;
    for (let i = 0; i < n; i++) {
      const a0 = i * (span + GAP) + GAP / 2, a1 = a0 + span;
      svg.appendChild(el('path', { d: arc(R, a0, a1), class: 'dial-track' }));
      const fg = el('path', { d: arc(R, a0, a1), class: 'dial-fill' });
      svg.appendChild(fg);
      const len = fg.getTotalLength();
      fg.style.strokeDasharray = len; fg.style.strokeDashoffset = len; fg.dataset.len = len;
      this.segs.push(fg);
    }
  }
  // Вращение воронки: strong — несколько энергичных кругов, gentle — один мягкий, tap — лёгкая дрожь
  spin(kind) {
    const wrap = this.svg.parentElement, cls = ['spin-strong', 'spin-gentle', 'spin-tap'];
    wrap.classList.remove(...cls);
    void wrap.offsetWidth;   // перезапуск анимации, если она ещё идёт
    wrap.classList.add(`spin-${kind}`);
    clearTimeout(this.spinTimer);
    this.spinTimer = setTimeout(() => wrap.classList.remove(...cls), 2600);
  }
  set(i, frac) {
    const fg = this.segs[i]; if (!fg) return;
    fg.style.strokeDashoffset = +fg.dataset.len * (1 - frac);
    fg.classList.toggle('done', frac >= 1);
  }
}

let actx = null;
// iOS усыпляет звук страницы, пока приложение в фоне: будим при возврате и при первом касании
const wakeAudio = () => { if (actx && actx.state !== 'running') actx.resume().catch(() => {}); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeAudio(); });
document.addEventListener('pointerdown', wakeAudio, { passive: true });

export function beep(freq = 880, dur = 0.12, delay = 0, vol = 0.18) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    wakeAudio();
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* звук недоступен */ }
}

// Звук с плавно меняющейся высотой — для сигнала вращения
function glide(f0, f1, dur, vol = 0.14) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    wakeAudio();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* звук недоступен */ }
}

// Режимы сигналов. Вибрацию даёт Android, iPhone веб-приложениям её не открывает
export const CAN_VIBRATE = typeof navigator.vibrate === 'function';
export const ALERT_MODES = CAN_VIBRATE ? ['sound', 'both', 'vibro', 'off'] : ['sound', 'off'];
const SOUND = {
  step: () => { beep(880, 0.1); beep(1175, 0.14, 0.13); },
  warn: () => beep(660, 0.08, 0, 0.12),
  finish: () => { beep(784, 0.12); beep(988, 0.12, 0.15); beep(1319, 0.28, 0.3); },
  unlock: () => beep(880, 0.06, 0, 0.08),
  spin: () => glide(520, 300, 0.4),
};
const VIBRO = { step: [180, 90, 180], warn: [60], finish: [300, 120, 300, 120, 600], unlock: null, spin: [40, 40, 40, 40, 40] };
export function cue(kind, mode) {
  if (mode === 'sound' || mode === 'both') SOUND[kind]();
  if ((mode === 'vibro' || mode === 'both') && VIBRO[kind]) try { navigator.vibrate(VIBRO[kind]); } catch (e) { /* без вибрации */ }
}

// Секундомер с событиями на границах этапов. Время считается от момента старта по часам (Date.now()),
// а не суммой кадров: в фоне кадры не идут, а часы идут, и после возврата таймер сразу показывает верное время.
export class BrewClock {
  constructor({ onTick, onBoundary }) {
    this.onTick = onTick; this.onBoundary = onBoundary;
    this.elapsed = 0; this.base = 0; this.t0 = 0; this.running = false; this.raf = 0; this.lock = null;
    // Браузер снимает удержание экрана, когда приложение уходит в фон, — при возврате просим снова
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.running) this.keepAwake(); });
  }
  async keepAwake() {
    if (!navigator.wakeLock || (this.lock && !this.lock.released)) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (this.running) this.lock = lock; else lock.release();
    } catch (e) { /* без удержания экрана */ }
  }
  start() {
    if (this.running) return;
    this.running = true; this.base = this.elapsed; this.t0 = Date.now();
    const loop = () => {
      if (!this.running) return;
      const prev = this.elapsed;
      this.elapsed = this.base + (Date.now() - this.t0) / 1000;
      // скачок больше секунды — приложение было в фоне: сигналы за пропущенное время не играем
      this.onBoundary(prev, this.elapsed, this.elapsed - prev > 1);
      this.onTick(this.elapsed);
      if (this.running) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.keepAwake();
  }
  now() {
    if (this.running) this.elapsed = this.base + (Date.now() - this.t0) / 1000;
    return this.elapsed;
  }
  pause() {
    this.now();
    this.running = false; cancelAnimationFrame(this.raf);
    try { this.lock?.release(); } catch (e) { /* уже отпущен */ }
    this.lock = null;
  }
  reset() { this.pause(); this.elapsed = 0; this.base = 0; }
}

export const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
