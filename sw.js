// Service worker for Tuner Senar — enables offline use after first visit.
// Strategy: stale-while-revalidate (serve instantly from cache, refresh cache
// in the background from the network so updates are picked up next time).

const CACHE_VERSION = 'tuner-senar-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_VERSION; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  // Only handle same-origin GET requests; let everything else pass through normally.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      const networkFetch = fetch(event.request)
        .then(function(response){
          if (response && response.status === 200){
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(function(cache){ cache.put(event.request, copy); });
          }
          return response;
        })
        .catch(function(){
          // Offline and not cached: fall back to the app shell so the tuner still loads.
          return cached || caches.match('./index.html');
        });
      return cached || networkFetch;
    })
  );
});
