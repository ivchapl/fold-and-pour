// Строки интерфейса. Английский добавляется вторым словарём с теми же ключами.
const RU = {
  'app.name': 'Fold & Pour: Coffee Lab',
  'app.tagline': 'Помол, рецепты и таймер',

  'tab.brew': 'Заварка', 'tab.schemes': 'Схемы', 'tab.journal': 'Журнал', 'tab.guide': 'Справочник', 'tab.settings': 'Настройки',

  'brew.dose': 'Доза', 'brew.temp': 'Температура', 'brew.grind': 'Помол', 'brew.ratio': 'Пропорция', 'brew.brewer': 'Воронка',
  'brew.ready': 'Готов к старту', 'brew.start': 'Старт', 'brew.pause': 'Пауза', 'brew.resume': 'Продолжить',
  'brew.reset': 'Сбросить таймер',
  'brew.pourNow': 'Влить сейчас', 'brew.target': 'Цель на весах',
  'brew.stage': 'Этап {n} · {name}', 'brew.stageRange': 'этап 1 · {from}–{to}',
  'brew.untilNext': 'до следующего пролива {s} с', 'brew.lastPour': 'последнее вливание',
  'brew.next': 'Далее: {name} · +{add} г в {at}', 'brew.nextDrain': 'Далее: дренаж, финиш ≈ {t}', 'brew.nextSpin': ', затем {spin}',
  'brew.pourNext': 'Лью дальше', 'brew.waitPour': 'Пора: {name}', 'brew.waitSub': 'вода сошла — жмите «Лью дальше» · +{s} с',

  'spin.none': 'Без вращения', 'spin.strong': 'Сильное вращение', 'spin.gentle': 'Мягкое вращение', 'spin.tap': 'Лёгкая вибрация',
  'spin.strongHint': 'энергично покрутите воронку по кругу, чтобы смочить весь кофе',
  'spin.gentleHint': 'одно мягкое вращение, меньше секунды: вода заполнит рёбра, таблетка выровняется',
  'spin.tapHint': 'легко постучите по воронке, чтобы выровнять таблетку',
  'spin.mark.strong': '↻ сильно', 'spin.mark.gentle': '↻ мягко', 'spin.mark.tap': '≈ вибрация',
  'brew.drawdown': 'Дренаж', 'brew.drawdownHint': 'Вода уходит через таблетку. Когда она уйдёт, нажмите «Сток закончился»',
  'brew.finishTarget': 'цель финиша ≈ {t}', 'brew.drained': 'Сток закончился',
  'brew.done': 'Готово', 'brew.doneSub': 'сток за {t}', 'brew.doneHint': 'Дайте чашке минуту остыть, вкус раскроется полнее',
  'brew.interval': 'Интервал', 'brew.pourTime': 'Пролив', 'brew.finish': 'Финиш',
  'brew.steps': 'Схема проливов', 'brew.total': 'Σ {w} г · {n} {pours}',
  'brew.pour': 'влить', 'brew.onScale': 'на весах',
  'brew.grindSub': '≈{um} мкм', 'brew.calib': 'калибровка {d}', 'brew.lotShift': 'лот {d}', 'brew.doseShift': 'доза {d}', 'brew.brewerShift': 'воронка {d}',
  'brew.coffee': 'Кофе',
  'brew.ratioSub': '{dose} г → {water} г воды',
  'brew.tempSub': 'стартовая',
  'brew.log': 'Записать заварку',

  'knobs.acid': 'Баланс', 'knobs.sweeter': 'Слаще', 'knobs.asIs': 'Как в схеме', 'knobs.brighter': 'Кислее',
  'knobs.body': 'Крепость', 'knobs.lighter': 'Легче', 'knobs.stronger': 'Крепче',
  'knobs.hint': 'Как в методе 4:6 Касуи: первые два пролива задают баланс сладости и кислотности, число остальных — крепость.',
  'knobs.noteSweet': 'Первые проливы {a} + {b} г вместо {a0} + {b0} — слаще',
  'knobs.noteBright': 'Первые проливы {a} + {b} г вместо {a0} + {b0} — ярче и кислее',
  'knobs.noteBody': '{n} {pours} вместо {n0}, финиш ≈{t}',
  'knobs.locked': 'Ручки вкуса меняются до старта',

  'settings.timer': 'Таймер', 'settings.alertsLabel': 'Сигналы', 'settings.advance': 'Следующий пролив',
  'advance.timer': 'По таймеру', 'advance.tap': 'По кнопке «Лью дальше»',
  'advance.hint': 'По таймеру — пролив начинается по схеме, а «Лью дальше» запускает его раньше. По кнопке — таймер ждёт, пока вы не нажмёте «Лью дальше»: для тех, кто начинает пролив, когда вода сходит с таблетки. В обоих режимах фактическое время проливов записывается в журнал.',
  'alerts.title': 'Сигналы таймера', 'alerts.sound': 'Звук', 'alerts.both': 'Звук и вибрация', 'alerts.vibro': 'Вибрация', 'alerts.off': 'Без сигналов',
  'alerts.toast': 'Сигналы: {m}', 'alerts.noVibro': 'Вибрацию iPhone веб-приложениям не даёт, поэтому здесь только звук.',

  'log.title': 'Как получилось?',
  'log.time': 'Время стока', 'log.target': 'цель {t}',
  'log.taste': 'Вкус', 'log.sour': 'Кисло, пусто', 'log.ok': 'В самый раз', 'log.bitter': 'Горько, сушит',
  'log.rating': 'Оценка',
  'log.coffee': 'Кофе',
  'log.notes': 'Заметки', 'log.notesPh': 'Вкусовые ноты, что поменять в следующий раз',
  'log.save': 'Сохранить в журнал', 'log.saved': 'Заварка сохранена', 'log.savedLeft': 'Заварка сохранена · в пачке осталось {g} г',
  'log.skip': 'Не сохранять',

  'calib.suggest': 'Совет по помолу',
  'calib.finer': 'Мельче на {n} {unit}: {from} → {to}',
  'calib.coarser': 'Крупнее на {n} {unit}: {from} → {to}',
  'calib.keep': 'Помол оставить как есть: {setting}',
  'calib.apply': 'Применить к кофемолке', 'calib.applied': 'Калибровка обновлена',
  'calib.applyLot': 'Для этого лота', 'calib.applyGrinder': 'Для кофемолки', 'calib.appliedLot': 'Помол лота обновлён',
  'calib.whereLot': '«Для этого лота» — поправка запомнится только для «{lot}». «Для кофемолки» — сдвинет помол во всех схемах и для всех лотов.',
  'calib.whereNoBean': 'Поправка сдвинет помол во всех схемах. Добавьте пачку, чтобы хранить поправку для конкретного кофе.',
  'calib.nextTime': 'Поправка применится к следующей заварке',

  'grind.lot': 'Лот «{lot}»', 'grind.lotHint': 'Только для этого кофе. Сейчас: {v}',
  'grind.grinder': 'Кофемолка — для всех лотов', 'grind.grinderHint': 'Калибровка сейчас: {v}',
  'grind.none': 'без поправки', 'grind.finer': 'Мельче на 1 {u}', 'grind.coarser': 'Крупнее на 1 {u}',
  'grind.noBean': 'Добавьте пачку — тогда поправку можно хранить для конкретного кофе, а не для всей кофемолки.',
  'grind.more': 'Сменить кофемолку или задать калибровку →',

  'bean.title': 'Пачки кофе', 'bean.new': 'Новая пачка', 'bean.edit': 'Изменить пачку', 'bean.none': 'Без пачки', 'bean.unnamed': 'Без названия',
  'bean.notChosen': 'Пачка не выбрана', 'bean.addHint': 'Добавьте пачку — Fold & Pour: Coffee Lab запомнит помол и схему под этот кофе',
  'bean.noDetails': 'Укажите дату обжарки и вес — появятся дни отдыха и остаток',
  'bean.empty': 'Пачек пока нет.', 'bean.finished': 'Закончились ({n})',
  'bean.roaster': 'Обжарщик', 'bean.lot': 'Лот', 'bean.lotPh': 'Например, Эфиопия Гуджи', 'bean.process': 'Обработка', 'bean.roastDate': 'Дата обжарки',
  'bean.weight': 'Вес пачки, г', 'bean.left': 'Осталось, г',
  'bean.scheme': 'Схема для этого лота', 'bean.schemeAny': 'Не переключать схему',
  'bean.schemeHint': 'При выборе пачки Fold & Pour: Coffee Lab переключится на эту схему. После каждой заварки лот запоминает схему, по которой его варили.',
  'bean.grind': 'Поправка помола лота: {v}', 'bean.grindReset': 'Сбросить', 'bean.grindResetDone': 'Поправка лота сброшена', 'bean.lotShift': 'помол {v}',
  'bean.need': 'Укажите лот или обжарщика.', 'bean.save': 'Сохранить', 'bean.finish': 'Пачка закончилась', 'bean.revive': 'Вернуть в работу',
  'bean.delete': 'Удалить', 'bean.confirmDelete': 'Удалить пачку «{name}»? Записи журнала останутся.', 'bean.saved': 'Пачка сохранена', 'bean.deleted': 'Пачка удалена',
  'bean.roastDay': 'день обжарки', 'bean.rest': '{n}-й день после обжарки', 'bean.restShort': 'день {n}',
  'bean.leftG': 'осталось {g} г', 'bean.leftFor': 'осталось {g} г, на {n} {brews}',
  'bean.schemeSwitched': 'Схема лота: «{name}»',
  'calib.timeNote': 'Время стока отличается от цели на {d}, но вкус в порядке. Помол не трогаем.',

  'schemes.title': 'Схемы пролива', 'schemes.builtin': 'Базовые схемы', 'schemes.mine': 'Мои схемы',
  'schemes.empty': 'Своих схем пока нет. Скопируйте базовую или создайте новую.',
  'schemes.new': 'Новая схема', 'schemes.use': 'Заварить', 'schemes.edit': 'Изменить', 'schemes.copy': 'Копия',
  'schemes.share': 'Поделиться', 'schemes.delete': 'Удалить', 'schemes.deleted': 'Схема удалена',
  'schemes.confirmDelete': 'Удалить схему «{name}»?',
  'schemes.import': 'Схема по ссылке: «{name}»', 'schemes.importBtn': 'Добавить в мои', 'schemes.imported': 'Схема добавлена',

  'editor.title': 'Редактор схемы', 'editor.name': 'Название', 'editor.ratio': 'Пропорция', 'editor.temp': 'Стартовая температура',
  'editor.grind': 'Помол', 'editor.grindHint': 'на вашей кофемолке при дозе 14 г',
  'editor.bloom': 'Блуминг', 'editor.bloomWater': 'Вода на блуминг, × дозы', 'editor.bloomTime': 'Длительность блуминга, с',
  'editor.pulses': 'Вливания после блуминга', 'editor.interval': 'Интервал между вливаниями, с',
  'editor.dist': 'Распределение воды', 'editor.equal': 'Поровну', 'editor.custom': 'Свои доли',
  'editor.drawdown': 'Дренаж после последнего вливания, с',
  'editor.mode.params': 'По параметрам', 'editor.mode.steps': 'Ручные шаги',
  'editor.preview': 'Шаги при дозе {dose} г', 'editor.start': 'Старт, с', 'editor.water': 'Вода, г', 'editor.stepName': 'Название',
  'editor.addStep': 'Добавить шаг', 'editor.save': 'Сохранить', 'editor.cancel': 'Отмена', 'editor.saved': 'Схема сохранена',
  'editor.sharesHint': 'Доли вливаний в процентах от воды после блуминга. Сумма приводится к 100%.',
  'editor.spin': 'Вращение', 'editor.spinBloom': 'После блуминга', 'editor.spinFirst': 'После первого вливания', 'editor.spinLast': 'После последнего вливания',

  'journal.title': 'Журнал', 'journal.empty': 'Заварок пока нет. После таймера нажмите «Записать заварку».',
  'journal.repeat': 'Повторить', 'journal.delete': 'Удалить', 'journal.deleted': 'Запись удалена',
  'journal.confirmDelete': 'Удалить запись от {date}?',
  'journal.rest': 'Отдых', 'journal.knobs': 'Ручки вкуса', 'journal.calibLot': 'лоту: {d} мкм', 'journal.calibGrinder': 'кофемолке: {d} мкм',
  'journal.pours': 'Проливы', 'journal.step': 'Шаг', 'journal.plan': 'План', 'journal.fact': 'Факт', 'journal.water': 'Вода',
  'journal.saveScheme': 'Сохранить как схему', 'journal.schemeSaved': 'Схема «{name}» — в «Моих схемах»',
  'journal.repeatCopy': 'Схема с тех пор изменилась — повторяю по копии из журнала',

  'settings.grinder': 'Кофемолка', 'settings.search': 'Найти модель', 'settings.popular': 'Популярные', 'settings.all': 'Все модели',
  'settings.custom': 'Своя кофемолка', 'settings.customHint': 'Если вашей модели нет в списке: задайте две точки на её шкале.',
  'settings.customName': 'Название', 'settings.customFilter': 'Деление для фильтра (ваш рабочий помол)',
  'settings.customEspresso': 'Деление для эспрессо', 'settings.customSave': 'Сохранить свою кофемолку',
  'settings.calibration': 'Калибровка', 'settings.calibHint': 'Укажите деление, на котором у вас получается «Основная» схема при 14 г. Fold & Pour: Coffee Lab пересчитает все схемы под вашу кофемолку. Это поправка самой кофемолки, общая для всех лотов; поправки под конкретный кофе хранятся в пачке.',
  'settings.calibNow': 'Сейчас: {v}', 'settings.calibNone': 'без поправки', 'settings.calibSet': 'Задать', 'settings.calibReset': 'Сбросить',
  'settings.brewer': 'Воронка', 'settings.brewerHint': 'Поправка помола для воронки ориентировочная, калибровка её уточнит.',
  'settings.water': 'Вода', 'settings.waterLab': 'Из Water Lab: {name}', 'settings.waterLabMissing': 'Water Lab на этом устройстве ещё не открывали',
  'settings.waterOpen': 'Открыть Water Lab', 'settings.waterPreset': 'Пресет',
  'settings.data': 'Данные',
  'settings.export': 'Сохранить резервную копию', 'settings.import': 'Загрузить из копии', 'settings.imported': 'Данные загружены: {n} записей',
  'settings.importError': 'Не получилось прочитать файл. Нужен файл резервной копии Fold & Pour: Coffee Lab (.json).',
  'settings.about': 'О приложении',

  'onb.title': 'Настроим Fold & Pour: Coffee Lab под вас', 'onb.grinder': 'Какая у вас кофемолка?', 'onb.calib': 'Ваш рабочий помол',
  'onb.calibHint': 'Деление, на котором у вас хорошо получается фильтр при 14 г. Можно пропустить и задать позже.',
  'onb.brewer': 'Воронка', 'onb.done': 'Готово', 'onb.skip': 'Пропустить',

  'share.link': 'Ссылка на схему', 'share.tasty': 'Текст для рецепта на Tasty Coffee', 'share.copy': 'Скопировать', 'share.copied': 'Скопировано',
  'share.send': 'Отправить',

  'common.close': 'Закрыть', 'common.yes': 'Да', 'common.no': 'Нет', 'common.g': 'г', 'common.sec': 'с',
};

const DICTS = { ru: RU };
let lang = 'ru';

export function t(key, vars) {
  let s = (DICTS[lang] && DICTS[lang][key]) ?? RU[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Русские формы множественного числа: 1 щелчок, 2 щелчка, 5 щелчков
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const WORDS = {
  click: n => plural(n, 'щелчок', 'щелчка', 'щелчков'),
  step: n => plural(n, 'деление', 'деления', 'делений'),
  pour: n => plural(n, 'вливание', 'вливания', 'вливаний'),
  brew: n => plural(n, 'заварку', 'заварки', 'заварок'),
};
