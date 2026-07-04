const CACHE_NAME = 'livestock-tracker-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/sync-config.js',
  './js/sync.js',
  './js/utils.js',
  './js/storage.js',
  './js/router.js',
  './js/app.js',
  './js/screens/dashboard.js',
  './js/screens/herd.js',
  './js/screens/newbornBatch.js',
  './js/screens/purchase.js',
  './js/screens/audit.js',
  './js/screens/money.js',
  './js/screens/expenses.js',
  './js/screens/income.js',
  './js/screens/milkLog.js',
  './js/screens/vaccinations.js',
  './js/screens/settings.js',
  './icons/icon.svg',
  './icons/icon-192.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Only manage the app's own same-origin files. Cross-origin calls (the
  // GitHub sync API in particular) must always hit the network — caching
  // them would make Sync.pull() see stale data instead of the real latest.
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
