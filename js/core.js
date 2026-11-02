// Производные значения: текущая кофемолка, схема, пачка, итоговый помол, вода и режим сигналов.
import { store } from './store.js';
import { allGrinders, grinderById, settingFor, stepsBetween, unitWord } from './grinders.js';
import { BUILTIN, brewerById, BASE_DOSE, DOSE_UM_PER_G, WATER, readWaterLab, snapshotScheme } from './schemes.js';
import { ALERT_MODES } from './timer.js';

export const currentGrinder = () => {
  const s = store.get().settings;
  return grinderById(s.grinderId, s.custom);
};

export const allSchemes = () => [...store.get().schemes, ...BUILTIN];
export const schemeById = id => allSchemes().find(x => x.id === id) || BUILTIN[0];
export const currentScheme = () => schemeById(store.get().settings.schemeId);

export const calibUm = (g = currentGrinder()) => store.get().calibration[g.id] || 0;

export const beanById = id => store.get().beans.find(b => b.id === id) || null;
// Текущая пачка; закончившуюся не подставляем
export const currentBean = () => {
  const b = beanById(store.get().settings.beanId);
  return b && !b.done ? b : null;
};

// Ручки вкуса схемы: acid −1 слаще … +1 кислее, body −1 легче … +1 крепче
export const knobsFor = id => ({ acid: 0, body: 0, ...store.get().settings.knobs[id] });

export const alertMode = () => {
  const m = store.get().settings.alerts;
  return ALERT_MODES.includes(m) ? m : 'sound';
};

// Итоговый помол: схема + воронка + доза + калибровка кофемолки + поправка лота
export function grindFor(scheme, dose, g = currentGrinder(), bean = currentBean(), brewerId = store.get().settings.brewer) {
  const brewer = brewerById(brewerId);
  const doseUm = (dose - BASE_DOSE) * DOSE_UM_PER_G;
  const cal = calibUm(g), lot = bean?.grindUm || 0;
  const repeat = store.get().settings.replay;
  const replayOffset = repeat && repeat.key === repeatKey(scheme, dose, g, bean, brewerId) ? repeat.offset : 0;
  const um = scheme.grindUm + brewer.um + doseUm + cal + lot + replayOffset;
  const set = settingFor(g, um);
  // Сколько делений даёт каждая поправка — для подписи под помолом
  const base = scheme.grindUm;
  const steps = (from, to) => stepsBetween(g, from, to);
  return {
    g, um, set, unit: n => unitWord(g, n),
    parts: {
      brewer: steps(base, base + brewer.um),
      dose: steps(base + brewer.um, base + brewer.um + doseUm),
      calib: steps(base + brewer.um + doseUm, base + brewer.um + doseUm + cal),
      lot: steps(base + brewer.um + doseUm + cal, base + brewer.um + doseUm + cal + lot),
      replay: steps(base + brewer.um + doseUm + cal + lot, um),
    },
  };
}

export function currentWater() {
  const s = store.get().settings, repeat = s.replay;
  if (repeat?.water && repeat.waterPreset === s.waterPreset &&
      repeat.key === repeatKey(currentScheme(), s.dose, currentGrinder(), currentBean(), s.brewer))
    return { ...repeat.water, fromLab: false, fromJournal: true };
  const lab = readWaterLab();
  if (lab) return { ...lab, fromLab: true };
  const p = WATER.find(w => w.id === store.get().settings.waterPreset) || WATER[1];
  return { ...p, fromLab: false };
}

export const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

// Поправка повтора привязана только к выбранной заварке, не меняет общую калибровку.
function repeatKey(scheme, dose, g, bean, brewer) {
  return JSON.stringify([scheme.id, snapshotScheme(scheme), dose, g.id, g.custom ? g.scale : null,
    bean?.id || null, brewer, knobsFor(scheme.id)]);
}

export function restoreBrewSettings(b, schemeId) {
  const warnings = [];
  store.update(s => {
    delete s.settings.replay;
    s.settings.schemeId = schemeId;
    s.settings.knobs[schemeId] = { acid: 0, body: 0, ...b.knobs };
    s.settings.dose = b.dose;
    if (b.brewer) s.settings.brewer = brewerById(b.brewer).id;
    if (b.grinderId === 'custom' && b.customGrinder) {
      s.settings.grinderId = 'custom'; s.settings.custom = structuredClone(b.customGrinder);
    } else if (allGrinders().some(g => g.id === b.grinderId)) s.settings.grinderId = b.grinderId;
    else warnings.push('В записи нет доступной кофемолки: проверьте помол');
    const bean = s.beans.find(x => x.id === b.beanId && !x.done);
    s.settings.beanId = bean?.id || null;
    if (b.beanId && !bean) warnings.push('Пачка закончилась или удалена: выберите кофе');
  });
  const s = store.get().settings, sc = currentScheme(), g = currentGrinder(), bean = currentBean();
  const normal = grindFor(sc, s.dose, g, bean);
  const water = b.waterProfile || WATER.find(w => `${w.name} · GH ${+w.gh.toFixed(1)} · KH ${+w.kh.toFixed(1)}` === b.waterLabel);
  if (!water) warnings.push('Состав воды в старой записи не сохранён: проверьте воду');
  const offset = Number.isFinite(b.um) ? b.um - normal.um : 0;
  store.update(st => st.settings.replay = {
    key: repeatKey(sc, s.dose, g, bean, s.brewer), offset,
    water: water ? structuredClone(water) : null, waterPreset: s.waterPreset,
  });
  return warnings;
}
