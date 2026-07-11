/* Offline cache: pre-cache the app shell, serve cache-first with a
   background refresh (stale-while-revalidate). Bump CACHE_NAME on
   every release so old caches are dropped on activate. */
const CACHE_NAME = 'atr72-tools-v8';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './src/main.js',
  './src/lib/wind.js',
  './src/lib/baggage.js',
  './src/lib/store.js',
  './src/ui/theme.js',
  './src/ui/tabs.js',
  './src/ui/bags-panel.js',
  './src/ui/wind-panel.js',
  './src/ui/diagram.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/atr-profile.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const refresh = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      /* Serve from cache immediately when available; the refresh
         updates the cache in the background for next load. */
      return cached || refresh;
    }).catch(() => caches.match('./index.html'))
  );
});
