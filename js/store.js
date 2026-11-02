import { parseBackup } from './validation.js';
// Состояние приложения в localStorage. Формат версионирован, чтобы позже подключить облако без переделки.
const KEY = 'fold-and-pour-v1';
const LEGACY_KEY = 'bloomline-v1';

const DEFAULTS = {
  v: 1,
  settings: {
    onboarded: false,
    grinderId: '1zpresso-k-ultra',
    custom: null,            // {name, filter, espresso, step}
    brewer: 'origami-air-cone',
    dose: 14,
    schemeId: 'base',
    alerts: 'sound',         // сигналы таймера: sound | both | vibro | off
    waitTap: false,          // следующий пролив только по кнопке «Лью дальше», а не по таймеру
    waterPreset: 'melb',
    beanId: null,            // текущая пачка
    knobs: {},               // schemeId → {acid, body}: ручки вкуса, −1…1
  },
  calibration: {},           // grinderId → поправка кофемолки в мкм, общая для всех лотов
  beans: [],                 // пачки кофе, у каждой своя поправка помола
  schemes: [],               // свои схемы
  journal: [],               // заварки, новые сверху
};

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Новая пачка. grindUm — поправка помола этого лота в мкм поверх калибровки кофемолки
export function makeBean(c = {}) {
  return {
    id: uid(), roaster: c.roaster || '', lot: c.lot || '', process: c.process || '', roastDate: c.roastDate || '',
    weight: c.weight ?? null, left: c.left ?? c.weight ?? null, grindUm: 0, schemeId: c.schemeId ?? null,
    done: false, created: Date.now(),
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const saved = localStorage.getItem(KEY);
    const legacy = saved == null ? localStorage.getItem(LEGACY_KEY) : null;
    const raw = JSON.parse(saved ?? legacy ?? 'null');
    if (raw && typeof raw === 'object') return migrate(raw, legacy != null);
  } catch (e) { /* пустое или недоступное хранилище — начинаем с умолчаний */ }
  return structuredClone(DEFAULTS);
}

// Ранние версии: звук вкл/выкл вместо режима сигналов и поле «последний кофе» вместо пачек
function migrate(raw, fromLegacy = false) {
  const d = structuredClone(DEFAULTS);
  const s = { ...d, ...raw, settings: { ...d.settings, ...raw.settings } };
  if (!raw.settings?.alerts && raw.settings?.sound === false) s.settings.alerts = 'off';
  delete s.settings.sound;
  const lc = raw.lastCoffee;
  if (lc && (lc.lot || lc.roaster) && !s.beans.length) {
    const bean = makeBean(lc);
    s.beans.push(bean); s.settings.beanId = bean.id;
    const key = c => `${c?.roaster || ''}|${c?.lot || ''}`.toLowerCase();
    for (const b of s.journal) if (key(b.coffee) === key(lc)) b.beanId = bean.id;
  }
  const changed = fromLegacy || 'lastCoffee' in raw || 'sound' in (raw.settings || {});
  delete s.lastCoffee;
  if (changed) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* приватный режим */ }
  return s;
}

function replayContext(s) {
  const t = s.settings;
  return JSON.stringify([t.schemeId, t.dose, t.brewer, t.grinderId, t.custom, t.beanId,
    t.waterPreset, t.knobs[t.schemeId], s.schemes.find(x => x.id === t.schemeId)]);
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
}

export const store = {
  get: () => state,
  update(fn) {
    const replay = state.settings.replay, before = replay ? replayContext(state) : null;
    fn(state);
    if (replay && state.settings.replay === replay && before !== replayContext(state)) delete state.settings.replay;
    persist(); listeners.forEach(l => l(state));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  exportJSON() {
    return JSON.stringify({ app: 'fold-and-pour', exported: new Date().toISOString(), ...state }, null, 2);
  },
  // Слияние: пачки, свои схемы и записи журнала добавляются по id, настройки берутся из копии
  importJSON(text) {
    const data = parseBackup(text);
    const next = structuredClone(state);
    let added = 0;
    for (const key of ['journal', 'schemes', 'beans']) {
      const ids = new Set(next[key].map(x => x.id));
      for (const x of data[key] || []) if (!ids.has(x.id)) {
        next[key].push(x); ids.add(x.id); added++;
      }
    }
    next.journal.sort((a, b) => b.ts - a.ts);
    next.settings = { ...next.settings, ...(data.settings || {}) };
    next.settings.knobs = { ...state.settings.knobs, ...(data.settings?.knobs || {}) };
    delete next.settings.replay;
    if (data.settings?.sound === false && !data.settings.alerts) next.settings.alerts = 'off';
    delete next.settings.sound;
    next.calibration = { ...next.calibration, ...(data.calibration || {}) };
    state = next;
    persist(); listeners.forEach(l => l(state));
    return added;
  },
};
