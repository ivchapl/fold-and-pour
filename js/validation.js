// Проверки перед сохранением/импортом. Проверяется весь документ до изменения состояния.
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw new Error(message); };
const number = (x, min, max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const text = (x, max = 1000) => typeof x === 'string' && x.length <= max;
const spin = x => x == null || ['', 'strong', 'gentle', 'tap'].includes(x);
const id = x => text(x, 200) && x.length > 0 && !['__proto__', 'prototype', 'constructor'].includes(x);
const optionalNumber = (o, key, min, max) => o[key] == null || number(o[key], min, max);

export function validateScheme(s) {
  if (!object(s) || !text(s.name, 60) || !s.name.trim() || !number(s.ratio, 1, 100) ||
      !number(s.temp, 0, 100) || !number(s.grindUm, 0, 10000) ||
      !optionalNumber(s, 'drawdown', 0, 3600) || !optionalNumber(s, 'referenceDose', 12, 40))
    fail('Проверьте название, пропорцию, температуру и помол схемы');
  if (s.mode === 'params') {
    const p = s.params;
    if (!object(p) || !number(p.bloomX, 1, 6) || !number(p.bloomTime, 10, 90) ||
        !Number.isInteger(p.pulses) || !number(p.pulses, 1, 10) || !number(p.interval, 10, 90) ||
        !['equal', 'custom'].includes(p.dist) || ![p.spinBloom, p.spinFirst, p.spinLast].every(spin))
      fail('Проверьте параметры вливаний');
    if ('shares' in p && (!Array.isArray(p.shares) || !p.shares.every(x => number(x, 0, 100)))) fail('Некорректные доли вливаний');
    if (p.dist === 'custom' && (!Array.isArray(p.shares) || p.shares.length < p.pulses ||
        !p.shares.slice(0, p.pulses).every(x => number(x, 0.01, 100))))
      fail('Доля каждого вливания должна быть больше нуля и не больше 100');
  } else {
    if (s.mode != null && s.mode !== 'steps') fail('Неизвестный режим схемы');
    if (!Array.isArray(s.steps) || !s.steps.length || s.steps.length > 15) fail('Нужно от 1 до 15 вливаний');
    s.steps.forEach((x, i) => {
      if (!object(x) || !number(x.at, 0, 3600) || !number(x.frac, Number.MIN_VALUE, 1) ||
          !text(x.name, 60) || !spin(x.spin) || (x.hint != null && !text(x.hint, 2000)))
        fail('Проверьте время и объём каждого вливания');
      if ((i === 0 && x.at !== 0) || (i && x.at <= s.steps[i - 1].at))
        fail('Первый шаг начинается в 0 с; следующие — строго позже предыдущего');
    });
    if (!number(s.pourEnd, s.steps.at(-1).at + 1, 7200)) fail('Конец вливания должен быть позже начала последнего шага');
  }
  return s;
}

function validateCustom(c) {
  if (!object(c) || !text(c.name) || !number(c.filter, 0, 10000) || !number(c.espresso, 0, 10000) ||
      c.filter === c.espresso || !number(c.step, 0.001, 1000)) fail('Некорректная собственная кофемолка');
}

function validateSettings(s) {
  if (!object(s)) fail('Некорректные настройки');
  for (const k of ['grinderId', 'brewer', 'schemeId', 'waterPreset']) if (k in s && !id(s[k])) fail('Некорректный идентификатор настройки');
  if (s.beanId != null && !id(s.beanId)) fail('Некорректная пачка');
  if ('dose' in s && !number(s.dose, 12, 40)) fail('Доза должна быть от 12 до 40 г');
  for (const k of ['onboarded', 'waitTap', 'sound']) if (k in s && typeof s[k] !== 'boolean') fail('Некорректный переключатель');
  if ('alerts' in s && !['sound', 'both', 'vibro', 'off'].includes(s.alerts)) fail('Некорректный режим сигналов');
  if (s.custom != null) validateCustom(s.custom);
  if (s.knobs != null) {
    if (!object(s.knobs)) fail('Некорректные настройки вкуса');
    for (const k of Object.values(s.knobs)) if (!object(k) ||
      ![k.acid ?? 0, k.body ?? 0].every(x => [-1, 0, 1].includes(x))) fail('Некорректные настройки вкуса');
  }
}

export function parseBackup(source) {
  const data = JSON.parse(source, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('Недопустимый ключ в резервной копии');
    return value;
  });
  if (!object(data) || !['fold-and-pour', 'bloomline'].includes(data.app) || (data.v != null && data.v !== 1)) fail('Неподдерживаемая резервная копия');
  if (data.settings != null) validateSettings(data.settings);
  if (data.calibration != null && (!object(data.calibration) || !Object.values(data.calibration).every(x => number(x, -10000, 10000)))) fail('Некорректная калибровка');
  for (const key of ['beans', 'schemes', 'journal']) {
    if (data[key] == null) continue;
    if (!Array.isArray(data[key])) fail('Ожидался список: ' + key);
    for (const x of data[key]) {
      if (!object(x) || !id(x.id)) fail('Некорректная запись: ' + key);
      if (key === 'schemes') validateScheme(x);
      if (key === 'beans') {
        for (const k of ['roaster', 'lot', 'process', 'roastDate']) if (x[k] != null && !text(x[k])) fail('Некорректное поле пачки');
        for (const k of ['weight', 'left']) if (!optionalNumber(x, k, 0, 1e7)) fail('Некорректная масса пачки');
        if (!optionalNumber(x, 'grindUm', -10000, 10000) || (x.done != null && typeof x.done !== 'boolean')) fail('Некорректная пачка');
      }
      if (key === 'journal') {
        if (!number(x.ts, 0, 1e15) || !number(x.dose, 0.1, 1000) || !number(x.water, 1, 1e5) ||
            !number(x.drawdown, 0, 86400) || !optionalNumber(x, 'drawdownTarget', 0, 86400) ||
            !optionalNumber(x, 'rating', 0, 5) || (x.rating != null && !Number.isInteger(x.rating))) fail('Некорректная запись заварки');
        if (x.um != null && !number(x.um, 0, 10000)) fail('Некорректный помол');
        if (x.knobs != null) validateSettings({knobs: {journal: x.knobs}});
        for (const k of ['grinderId', 'brewer', 'schemeId', 'beanId']) if (x[k] != null && !id(x[k])) fail('Некорректный идентификатор записи');
        if (x.scheme) validateScheme(x.scheme);
        if (x.customGrinder) validateCustom(x.customGrinder);
        if (x.waterProfile && (!object(x.waterProfile) || !text(x.waterProfile.name) ||
            !number(x.waterProfile.gh, 0, 10000) || !number(x.waterProfile.kh, 0, 10000))) fail('Некорректная вода');
        if (x.steps != null) {
          if (!Array.isArray(x.steps) || x.steps.length > 15) fail('Некорректные этапы заварки');
          for (const p of x.steps) if (!object(p) || !number(p.s, 0, 86400) || !number(p.add, 0, 1e5) ||
              !optionalNumber(p, 'e', p.s, 86400) || !optionalNumber(p, 'at', 0, 86400) || !spin(p.spin)) fail('Некорректный этап заварки');
        }
      }
    }
  }
  // Временный режим повтора не переносится между установками.
  if (data.settings) delete data.settings.replay;
  return data;
}
