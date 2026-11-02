// Точка входа: загрузка справочника, вкладки, импорт схемы по ссылке, офлайн-режим.
import { t } from './i18n.js';
import { store, uid } from './store.js';
import { $, $$, toast } from './ui.js';
import { loadGrinders } from './grinders.js';
import { decodeScheme, waterLabel, BREWERS, snapshotScheme, sameScheme, schemeFromSnapshot } from './schemes.js';
import { schemeById, currentWater, restoreBrewSettings } from './core.js';
import { mountBrew, displayWater, refresh as refreshBrew } from './brew.js';
import { mountSchemes, render as renderSchemes, offerImport } from './schemes-view.js';
import { mountJournal, render as renderJournal } from './journal.js';
import { mountGuide, render as renderGuide } from './guide.js';
import { mountSettings, render as renderSettings, openOnboarding } from './settings.js';

const TABS = ['brew', 'schemes', 'journal', 'guide', 'settings'];

function show(tab) {
  if (!TABS.includes(tab)) tab = 'brew';
  TABS.forEach(x => { $(`#view-${x}`).hidden = x !== tab; });
  $$('.tabbar a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
  if (tab === 'schemes') renderSchemes();
  if (tab === 'journal') renderJournal();
  if (tab === 'settings') renderSettings();
  if (tab === 'guide') renderGuide();
  window.scrollTo(0, 0);
}

function route() {
  const h = location.hash.slice(1);
  if (h.startsWith('s=')) {
    try {
      const sc = decodeScheme(h.slice(2));
      history.replaceState(null, '', '#schemes');
      show('schemes'); offerImport(sc);
    } catch (e) { history.replaceState(null, '', '#schemes'); show('schemes'); toast('Ссылка на схему повреждена'); }
    return;
  }
  show(h || 'brew');
}

// Схема для «Повторить»: та же, если с тех пор не менялась; иначе — копия из снимка в записи (одна на снимок)
function repeatSchemeId(b) {
  const cur = schemeById(b.schemeId), exists = cur.id === b.schemeId;
  if (!b.scheme) return exists ? b.schemeId : null;
  if (exists && sameScheme(snapshotScheme(cur), b.scheme)) return b.schemeId;
  const copy = store.get().schemes.find(x => sameScheme(snapshotScheme(x), b.scheme));
  if (copy) return copy.id;
  const x = { ...schemeFromSnapshot(b.scheme), id: uid(), name: `${b.scheme.name} · из журнала`.slice(0, 60), icon: '📓' };
  store.update(s => s.schemes.unshift(x));
  toast(t('journal.repeatCopy'));
  return x.id;
}

function paintWater() {
  const w = displayWater();
  $('#water-chip').innerHTML = `<span class="dot"></span><span class="wl">${waterLabel(w)}</span>`;
  $('#water-chip').title = w.fromJournal ? 'Вода из записи журнала' : w.fromLab ? 'Вода из Origami Water Lab' : 'Вода: пресет в настройках';
}

// Всё, что зависит от кофемолки, воронки, дозы и калибровки
function refreshAll() { refreshBrew(); renderSchemes(); renderGuide(); paintWater(); }

async function main() {
  document.title = t('app.name');
  try { await loadGrinders(); }
  catch (e) { $('#app-error').hidden = false; return; }

  mountBrew($('#view-brew'), { changed: () => { renderSchemes(); renderGuide(); paintWater(); } });
  mountSchemes($('#view-schemes'), {
    use: id => { store.update(s => (s.settings.schemeId = id)); refreshBrew(); location.hash = '#brew'; },
    changed: refreshBrew,
  });
  mountJournal($('#view-journal'), {
    repeat: b => {
      const id = repeatSchemeId(b);
      if (!id) { toast('Схема этой записи недоступна'); return; }
      const warnings = restoreBrewSettings(b, id);
      if (warnings.length) toast(warnings.join('. '));
      paintWater();
      refreshBrew(); location.hash = '#brew';
    },
    changed: refreshBrew,
  });
  mountGuide($('#view-guide'));
  mountSettings($('#view-settings'), { changed: refreshAll });
  paintWater();

  window.addEventListener('hashchange', route);
  // Water Lab может поменять воду в соседней вкладке
  window.addEventListener('storage', e => { if (e.key === 'owl-v1') paintWater(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paintWater(); });
  route();

  if (!store.get().settings.onboarded) openOnboarding(refreshAll);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
