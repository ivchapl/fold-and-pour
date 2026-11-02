// Офлайн-режим: согласованная версия HTML, модулей и стилей; независимые кэши других приложений.
// При изменении файлов приложения поднимайте VERSION, иначе у пользователей останется старый кэш.
const VERSION = 'fold-and-pour-2026-11-02-1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/i18n.js', 'js/store.js', 'js/grinders.js', 'js/schemes.js', 'js/core.js', 'js/ui.js',
  'js/validation.js', 'js/timer.js', 'js/beans.js', 'js/brew.js', 'js/schemes-view.js', 'js/journal.js', 'js/settings.js', 'js/guide.js',
  'data/grinders.json',
  'icons/maskable-512.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' — мимо HTTP-кэша браузера: GitHub Pages разрешает хранить файлы 10 минут,
  // и без этого в новую версию попадала смесь старых и новых модулей
  const fresh = SHELL.map(u => new Request(u, { cache: 'reload' }));
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(fresh)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('fold-and-pour-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // HTML и модули одной установленной версии. Новая версия активируется после закрытия старых вкладок.
  const base = new URL('./', self.location.href);
  const isApp = url.origin === base.origin && url.pathname.startsWith(base.pathname);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isApp || isFont) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const key = req.mode === 'navigate' ? new URL('index.html', base).href : req;
      const hit = await c.match(key);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') await c.put(key, res.clone());
      return res;
    }));
  }
});
