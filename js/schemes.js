// Схемы пролива, воронки, вода и расчёт плана под дозу.
import { validateScheme } from './validation.js';
import { BASE_UM } from './grinders.js';

// Базовые схемы — из Origami Brew Lab (светлая обжарка, Origami + конусный фильтр Hario).
// Согласовано 30.10.2026: база K-Ultra 0.7.0; обе мытые схемы на два щелчка крупнее.
// Доли воды и тайминги — как в проверенных планах на 14 г.
const K = 7.6; // мкм на щелчок K-Ultra по шкале HCG
export const BUILTIN = [
  {
    // Рабочая схема автора на 14 г: блуминг и три пролива. Два пролива дают пустоватую чашку, четыре — тяжёлую.
    // На ней найден оптимум помола: K-Ultra 0.6.8–0.7.5, Timemore S3 5.5–6.0.
    id: 'base', builtin: true, name: 'Основная', icon: '⭐',
    about: 'Блуминг и три пролива, опорный помол 1Zpresso K-Ultra 0.7.0. Стартовая схема: с неё начинайте незнакомый лот.',
    temp: 93, ratio: 230 / 14, grindUm: BASE_UM, pourEnd: 130, drawdown: 40,
    steps: [
      { at: 0, frac: 45 / 230, name: 'Блуминг', hint: 'Смочите всю поверхность кофе и дайте таблетке раскрыться' },
      { at: 35, frac: 60 / 230, name: 'Пролив 1', hint: 'Спиралью из центра, в конце вращение Рао', spin: 'gentle' },
      { at: 70, frac: 60 / 230, name: 'Пролив 2', hint: 'Спокойной спиралью, без вращения' },
      { at: 105, frac: 65 / 230, name: 'Пролив 3', hint: 'Последний пролив, затем вращение Рао или лёгкая вибрация — ровное плоское дно', spin: 'gentle' },
    ],
  },
  {
    id: 'wdense', builtin: true, name: 'Мытая плотная', icon: '💧',
    about: 'Кения, мытая Эфиопия. Плотное высокогорное зерно не боится жара.',
    temp: 95, ratio: 16, grindUm: BASE_UM + 2 * K, pourEnd: 120, drawdown: 40,
    steps: [
      { at: 0, frac: 55 / 225, name: 'Блуминг +', hint: 'Увеличенное первое вливание смещает чашку в кислотность. Смочите всю поверхность, затем лёгкий swirl', spin: 'gentle' },
      { at: 35, frac: 35 / 225, name: 'Импульс I', hint: 'Укороченный второй пролив: баланс уже задан, дальше набираем экстракцию' },
      { at: 55, frac: 45 / 225, name: 'Импульс II', hint: 'Лейте на подсохшую таблетку, не по стенкам' },
      { at: 75, frac: 45 / 225, name: 'Импульс III', hint: 'Держите ритм: таблетка не должна пересыхать' },
      { at: 95, frac: 45 / 225, name: 'Импульс IV', hint: 'Финальный пролив, дальше не трогаем' },
    ],
  },
  {
    id: 'wsoft', builtin: true, name: 'Мытая мягкая', icon: '🌿',
    about: 'Колумбия, Перу. Кислотность спокойнее, перегрев уводит в резкость.',
    temp: 93, ratio: 16, grindUm: BASE_UM + 2 * K, pourEnd: 120, drawdown: 40,
    steps: [
      { at: 0, frac: 55 / 225, name: 'Блуминг +', hint: 'Увеличенное первое вливание выводит кислотность вперёд' },
      { at: 35, frac: 50 / 225, name: 'Импульс I', hint: 'Укороченный второй пролив, спокойной спиралью из центра' },
      { at: 65, frac: 60 / 225, name: 'Импульс II', hint: 'Ровный уровень воды, без агрессии' },
      { at: 95, frac: 60 / 225, name: 'Финиш', hint: 'Последнее вливание и одно лёгкое вращение', spin: 'gentle' },
    ],
  },
  {
    id: 'honey', builtin: true, name: 'Хани', icon: '🍯',
    about: 'Карамель, косточковые, мягкая кислотность. Тело важнее яркости.',
    temp: 93, ratio: 15, grindUm: BASE_UM, pourEnd: 105, drawdown: 50,
    steps: [
      { at: 0, frac: 52 / 210, name: 'Блуминг +', hint: 'Увеличенный блуминг, swirl только здесь — дальше таблетку не трогаем', spin: 'gentle' },
      { at: 40, frac: 74 / 210, name: 'Основной пролив', hint: 'Один длинный спокойный круг, минимум турбулентности' },
      { at: 75, frac: 84 / 210, name: 'Финиш', hint: 'Долейте ровно, без вращения — бережём тело' },
    ],
  },
  {
    id: 'natural', builtin: true, name: 'Натуральная', icon: '🍒',
    about: 'Схема 4:6 Касуи в варианте на кислотность: первое вливание больше второго.',
    temp: 92, ratio: 16, grindUm: BASE_UM, pourEnd: 125, drawdown: 40,
    steps: [
      { at: 0, frac: 50 / 225, name: '40% · первое', hint: 'Первое вливание больше второго — вариант 4:6 на кислотность. Захотите слаще — переключите баланс на «Слаще»' },
      { at: 40, frac: 40 / 225, name: '40% · второе', hint: 'Укороченное второе. Верх таблетки должен чуть подсохнуть, но не досуха' },
      { at: 70, frac: 68 / 225, name: '60% · крепость', hint: 'С этого момента работаем на плотность, а не на баланс' },
      { at: 100, frac: 67 / 225, name: '60% · финиш', hint: 'Последнее вливание, дальше только дренаж' },
    ],
  },
  {
    id: 'funky', builtin: true, name: 'Фанки / анаэроб', icon: '🍷',
    about: 'Ферментные ноты легко перекрывают всё остальное. Сознательно низкая экстракция.',
    temp: 90, ratio: 17, grindUm: BASE_UM, pourEnd: 100, drawdown: 45,
    steps: [
      { at: 0, frac: 55 / 240, name: 'Блуминг +', hint: 'Смочить и оставить в покое — никакого swirl' },
      { at: 40, frac: 90 / 240, name: 'Основной пролив', hint: 'Крупный спокойный пролив. Цель — низкая экстракция, а не полнота' },
      { at: 75, frac: 95 / 240, name: 'Финиш', hint: 'Короткое время здесь не проблема, а задача' },
    ],
  },
];

// Воронки. um — поправка помола: ориентировочная стартовая, калибровка её уточняет.
// Все конусы 60° считаются как V60 (0); материал на помол не влияет, только на прогрев — это в подсказке.
const HEAT = {
  plastic: 'Пластик почти не забирает тепло: прогрев не нужен, достаточно пролить фильтр',
  porcelain: 'Фарфор забирает тепло: прогрейте воронку кипятком 20–30 с, иначе чашка выйдет как на 2 °C холоднее',
  glass: 'Стекло греется быстрее фарфора: хватит короткого прогрева 10–15 с',
};
export const BREWER_TYPES = [['cone', 'Конус'], ['flat', 'Плоское дно'], ['immersion', 'Настаивание']];
export const BREWERS = [
  { id: 'origami-air-cone', type: 'cone', name: 'Origami Air S/M + конусный фильтр', um: 0, note: HEAT.plastic },
  { id: 'origami-cone', type: 'cone', name: 'Origami фарфор + конусный фильтр', um: 0, note: HEAT.porcelain },
  { id: 'v60', type: 'cone', name: 'Hario V60 02 · пластик', um: 0, note: HEAT.plastic },
  { id: 'v60-ceramic', type: 'cone', name: 'Hario V60 02 · фарфор', um: 0, note: HEAT.porcelain },
  { id: 'v60-glass', type: 'cone', name: 'Hario V60 02 · стекло', um: 0, note: HEAT.glass },
  // конус 60° с десятью рёбрами-лепестками, фильтры как у V60
  { id: 'cafec-flower', type: 'cone', name: 'Cafec Flower', um: 0, note: 'Конус 60° с рёбрами-лепестками: зазор у фильтра, поток ровный, как у V60, фильтры конусные. Фарфоровую версию прогрейте' },
  // конус 27° вместо 60°, тритан, на одну чашку, свои фильтры (shop.tastycoffee.ru/accessories/purover-cafec-deep-27-black)
  { id: 'cafec-deep27', type: 'cone', name: 'Cafec Deep 27 · тритан', um: 0, note: 'Конус 27° вместо обычных 60°: слой кофе выше, сток медленнее, чашка слаще и плотнее. Нужны свои фильтры Deep 27, объём на одну чашку. Тритан тепло почти не забирает. Если финиш затягивается — мелите чуть крупнее' },
  { id: 'origami-air-wave', type: 'flat', name: 'Origami Air S/M + волновой фильтр', um: -15, note: HEAT.plastic },
  { id: 'origami-wave', type: 'flat', name: 'Origami фарфор + волновой фильтр', um: -15, note: HEAT.porcelain },
  { id: 'kalita', type: 'flat', name: 'Kalita Wave', um: -15, note: 'Плоское дно и три отверстия: лейте в центр, поток сдерживает сама воронка' },
  { id: 'orea', type: 'flat', name: 'Orea', um: -15, note: 'Плоское дно и быстрый сток: лейте в центр небольшими порциями' },
  { id: 'april', type: 'flat', name: 'April', um: -15, note: 'Плоское дно и быстрый сток: лейте в центр небольшими порциями' },
  { id: 'switch', type: 'immersion', name: 'Hario Switch', um: 60, note: 'Настаивание: схемы с проливами здесь условны' },
  { id: 'clever', type: 'immersion', name: 'Clever Dripper', um: 60, note: 'Настаивание: схемы с проливами здесь условны' },
];
export const brewerById = id => BREWERS.find(b => b.id === id) || BREWERS[0];

// Доза: проверено на 22 г — на 3 щелчка K-Ultra крупнее, чем на 14 г
export const BASE_DOSE = 14;
export const DOSE_UM_PER_G = (3 * K) / 8;
export const MIN_DOSE = 12, MAX_DOSE = 40;

// Вода: пресеты Origami Water Lab (тот же адрес ivchapl.github.io — её выбор читается напрямую)
export const WATER_LAB_URL = 'https://ivchapl.github.io/origami-water-lab/';
export const WATER = [
  { id: 'bhm', name: 'BH Melbourne', gh: 24, kh: 12 },
  { id: 'melb', name: 'Melbourne', gh: 50, kh: 20 },
  { id: 'holy', name: 'Holy Water', gh: 62, kh: 23 },
  { id: 'lb', name: 'Light & Bright', gh: 60, kh: 25 },
  { id: 'rp2', name: 'Rao/Perger ½', gh: 43.5, kh: 20 },
  { id: 'rp', name: 'Rao/Perger', gh: 87.5, kh: 40 },
  { id: 'bud', name: 'Budapest', gh: 51, kh: 40 },
];
export function readWaterLab() {
  try {
    const s = JSON.parse(localStorage.getItem('owl-v1') || 'null');
    if (!s || typeof s !== 'object') return null;
    const p = WATER.find(w => w.id === s.preset);
    const gh = +s.gh, kh = +s.kh;
    if (s.gh == null || s.kh == null || !Number.isFinite(gh) || !Number.isFinite(kh) || gh < 0 || kh < 0) return null;
    const same = p && Math.abs(p.gh - gh) < 0.01 && Math.abs(p.kh - kh) < 0.01;
    return { name: same ? p.name : 'Своя вода', gh, kh };
  } catch (e) { return null; }
}
export const waterLabel = w => `${w.name} · GH ${+w.gh.toFixed(1)} · KH ${+w.kh.toFixed(1)}`;

// --- редактор: схема по параметрам (как у Fellow Aiden) ---
// Новая схема по умолчанию повторяет «Основную»: блуминг ×3,2 дозы, три пролива через 35 с,
// мягкое вращение после первого и последнего
export const DEFAULT_PARAMS = {
  bloomX: 3.2, bloomTime: 35, pulses: 3, interval: 35, dist: 'custom', shares: [60, 60, 65],
  spinBloom: '', spinFirst: 'gentle', spinLast: 'gentle',
};

// Вращение после пролива: сильное (у Рао — на блуминге), мягкое (меньше секунды, вода заполняет рёбра), лёгкая вибрация
export const SPINS = ['strong', 'gentle', 'tap'];
// Обычная скорость струи из чайника, г/с: по ней оценивается длительность налива; вращение начинается после расчётного окончания налива
export const POUR_RATE = 6;

export function stepsFromParams(ratio, p) {
  const bloomFrac = Math.min(0.6, p.bloomX / ratio);
  const n = Math.max(1, Math.min(10, p.pulses | 0));
  let shares = p.dist === 'custom' && Array.isArray(p.shares) && p.shares.length >= n ? p.shares.slice(0, n).map(x => Math.max(0, +x || 0)) : Array(n).fill(1);
  // Старый некорректный рецепт остаётся открываемым; редактор не даст сохранить нулевые доли.
  if (shares.some(x => x <= 0)) shares = Array(n).fill(1);
  const sum = shares.reduce((a, b) => a + b, 0);
  shares = shares.map(x => x / sum);
  const steps = [{ at: 0, frac: bloomFrac, name: 'Блуминг', hint: 'Смочите всю поверхность кофе', spin: p.spinBloom || '' }];
  for (let i = 0; i < n; i++) {
    steps.push({
      at: p.bloomTime + i * p.interval, frac: (1 - bloomFrac) * shares[i],
      name: i === n - 1 ? 'Финиш' : `Вливание ${i + 1}`,
      hint: i === n - 1 ? 'Последнее вливание, дальше не трогаем' : 'Спокойной спиралью из центра, не по стенкам',
      spin: (i === n - 1 ? p.spinLast || (i === 0 && p.spinFirst) : i === 0 && p.spinFirst) || '',
    });
  }
  return { steps, pourEnd: p.bloomTime + n * p.interval };
}

export function resolveSteps(scheme) {
  if (scheme.mode === 'params') return stepsFromParams(scheme.ratio, scheme.params);
  return { steps: scheme.steps, pourEnd: scheme.pourEnd };
}

// --- ручки вкуса, как в методе 4:6 Касуи ---
// Баланс: часть воды переходит между первым и вторым проливом, шаг — 10% их суммы (у Касуи 20/20 → 16/24 или 24/16).
// Крепость: вода после второго пролива делится на пролив больше или меньше; пауза между проливами сохраняется.
const ACID_STEP = 0.1;

export function knobLimits(scheme) {
  const n = resolveSteps(scheme).steps.length;
  return { acid: n >= 2, lighter: n >= 4, stronger: n >= 3 && n < 15 };
}

// Нумерация в названии шага: «Пролив 3», «Импульс IV». Новые шаги продолжают её
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
function numbering(name) {
  const m = /^(.*?)(\d+|[IVX]+)$/.exec(String(name || '').trim());
  if (!m) return null;
  const roman = !/\d/.test(m[2]), n = roman ? ROMAN.indexOf(m[2]) : +m[2];
  return n >= 1 ? { prefix: m[1], n, roman } : null;
}
const numbered = (f, k) => f.prefix + (f.roman ? ROMAN[k] || k : k);

export function applyKnobs(steps, pourEnd, k, ratio) {
  const sum = steps.reduce((a, s) => a + s.frac, 0) || 1;
  let out = steps.map(s => ({ ...s, frac: s.frac / sum }));
  if (k.acid && out.length >= 2) {
    const pair = out[0].frac + out[1].frac;
    // первый пролив — он же блуминг: не меньше двух доз воды; второму остаётся не меньше 15% пары
    const lo = Math.min(out[0].frac, 2 / ratio), hi = Math.max(lo, pair * 0.85);
    const first = Math.min(hi, Math.max(lo, out[0].frac + k.acid * ACID_STEP * pair));
    out[0].frac = first; out[1].frac = pair - first;
  }
  const rest = out.slice(2), n = rest.length, m = n + (k.body || 0);
  if (k.body && n && m >= 1 && m <= 13) {
    const start = rest[0].at, gap = Math.max(10, (pourEnd - start) / n);
    const water = rest.reduce((a, s) => a + s.frac, 0), last = rest[n - 1];
    const f = numbering(rest[0].name), fl = numbering(last.name);
    const finalName = f && fl && fl.prefix === f.prefix && fl.roman === f.roman ? numbered(f, f.n + m - 1)
      : fl && !f ? numbered(fl, fl.n + m - n) : last.name;
    const fresh = Array.from({ length: m }, (_, j) => {
      if (j === m - 1) return { at: Math.round(start + j * gap), frac: water / m, name: finalName, hint: last.hint || '', spin: last.spin || '' };
      const src = rest[Math.min(j, Math.max(0, n - 2))];
      const name = f ? numbered(f, f.n + j) : n >= 2 ? src.name : 'Доп. пролив';
      return { at: Math.round(start + j * gap), frac: water / m, name, hint: src.hint || '', spin: src.spin || '' };
    });
    out = [...out.slice(0, 2), ...fresh];
    pourEnd = Math.round(start + m * gap);
  }
  return { steps: out, pourEnd };
}

// План под конкретную дозу: граммы на каждый шаг, цели на весах, время финиша
export function plan(scheme, dose, knobs) {
  let { steps, pourEnd } = resolveSteps(scheme);
  if (knobs && (knobs.acid || knobs.body)) ({ steps, pourEnd } = applyKnobs(steps, pourEnd, knobs, scheme.ratio));
  const total = Math.round((dose * scheme.ratio) / 5) * 5;
  const fsum = steps.reduce((a, s) => a + s.frac, 0) || 1;
  let acc = 0, prevCum = 0, prevReference = 0, shift = 0;
  const referenceDose = scheme.referenceDose || BASE_DOSE;
  const referenceTotal = Math.round(referenceDose * scheme.ratio / 5) * 5;
  const out = steps.map((s, i) => {
    acc += s.frac / fsum;
    const cum = i === steps.length - 1 ? total : Math.round(total * acc);
    const add = cum - prevCum; prevCum = cum;
    const e = i < steps.length - 1 ? steps[i + 1].at : Math.max(pourEnd, s.at + 10);
    const pourSec = Math.max(1, add / POUR_RATE);
    const referenceCum = i === steps.length - 1 ? referenceTotal : Math.round(referenceTotal * acc);
    const referencePour = Math.max(1, (referenceCum - prevReference) / POUR_RATE);
    prevReference = referenceCum;
    // Удлиняется только налив: исходное ожидание между порциями не умножается на дозу.
    const duration = Math.max(Math.ceil(pourSec + (s.spin ? 4 : 0)),
      e - s.at + Math.ceil(pourSec - referencePour - 1e-9));
    const start = s.at + shift;
    shift += duration - (e - s.at);
    return { s: start, e: start + duration, pourSec, add, cum, name: s.name, hint: s.hint || '', spin: s.spin || '' };
  });
  const drawEnd = Math.round(out[out.length - 1].e + (scheme.drawdown ?? 40) + (dose - BASE_DOSE) * 0.6);
  const gaps = out.slice(1).map((s, i) => s.s - out[i].s).slice(1);
  const interval = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : (out[1] ? out[1].s : 0);
  const maxAdd = Math.max(...out.map(s => s.add));
  return {
    total, steps: out, brewEnd: out[out.length - 1].e, drawEnd,
    ratio: total / dose, interval, pourSec: Math.max(3, Math.round(maxAdd / POUR_RATE)),
  };
}

// --- ссылка на схему: компактный JSON в base64url ---
export function encodeScheme(s) {
  const { steps, pourEnd } = resolveSteps(s);
  const c = { rd: s.referenceDose || BASE_DOSE, n: s.name, r: s.ratio, t: s.temp, g: Math.round(s.grindUm), p: pourEnd, d: s.drawdown,
    s: steps.map(x => (x.spin ? [x.at, Math.round(x.frac * 1000), x.name, x.spin[0]] : [x.at, Math.round(x.frac * 1000), x.name])) };
  const bytes = new TextEncoder().encode(JSON.stringify(c));
  let bin = ''; bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeScheme(str) {
  const bin = atob(str.replaceAll('-', '+').replaceAll('_', '/'));
  const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  if (!c || !Array.isArray(c.s) || !c.s.length) throw new Error('bad scheme');
  const num = (v, lo, hi, def) => (isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : def);
  return validateScheme({
    referenceDose: num(c.rd, 12, 40, BASE_DOSE),
    name: String(c.n || 'Схема').slice(0, 60), ratio: num(c.r, 10, 22, 16), temp: num(c.t, 80, 100, 93),
    grindUm: num(c.g, 200, 1400, BASE_UM), pourEnd: num(c.p, 10, 600, 120), drawdown: num(c.d, 10, 300, 40),
    mode: 'steps',
    steps: c.s.slice(0, 15).map(x => ({ at: num(x[0], 0, 600, 0), frac: num(x[1], 0, 1000, 0) / 1000, name: String(x[2] || '').slice(0, 40), hint: '',
      spin: SPINS.find(k => k[0] === x[3]) || '' })),
  });
}

// --- снимок схемы для журнала ---
// Шаги без ручек вкуса: «Повторить» воспроизводит заварку, даже если схему потом изменили или удалили
export function snapshotScheme(sc) {
  const { steps, pourEnd } = resolveSteps(sc);
  return {
    referenceDose: sc.referenceDose || BASE_DOSE, name: sc.name, icon: sc.icon || '☕', ratio: sc.ratio, temp: sc.temp, grindUm: Math.round(sc.grindUm), drawdown: sc.drawdown ?? 40, pourEnd,
    steps: steps.map(x => ({ at: x.at, frac: +x.frac.toFixed(4), name: x.name, hint: x.hint || '', spin: x.spin || '' })),
  };
}
// Совпадают ли две схемы по сути (название и значок не важны)
const comparableScheme = s => [s.referenceDose || BASE_DOSE, s.ratio, s.temp, Math.round(s.grindUm), s.drawdown ?? 40, s.pourEnd,
  s.steps.map(x => [x.at, x.frac, x.name, x.hint || '', x.spin || ''])];
export const sameScheme = (a, b) => !!a && !!b && JSON.stringify(comparableScheme(a)) === JSON.stringify(comparableScheme(b));
export const schemeFromSnapshot = snap => ({ ...structuredClone(snap), mode: 'steps', builtin: false });
