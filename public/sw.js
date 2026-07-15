const CACHE_NAME = 'aether-cache-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/core/EventBus.js',
  '/src/core/StateManager.js',
  '/src/core/StorageEngine.js',
  '/src/core/Registry.js',
  '/src/core/Telemetry.js',
  '/src/modules/FamilyChat/index.js',
  '/src/modules/Games/index.js',
  '/public/manifest.json'
];

// Install Service Worker and cache all vital assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up legacy cache schemas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First fallbacks with automatic cache updates
self.addEventListener('fetch', (event) => {
  // Ignore external WebSockets or API connections
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update the cache dynamically if we get a valid payload
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to internal cache in case of poor connectivity
        return caches.match(event.request);
      })
  );
});
