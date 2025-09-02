const CACHE_VERSION = 'v1';
const CACHE_NAME = `2048-app-${CACHE_VERSION}`;

const APP_SHELL = [
  '/', // ensure root resolves to index.html
  '/index.html',
  '/favicon.ico',

  // CSS
  '/style/main.css',
  '/style/clear-sans.css',

  // Fonts (explicit)
  '/style/fonts/ClearSans-Regular-webfont.woff',
  '/style/fonts/ClearSans-Bold-webfont.woff',
  '/style/fonts/ClearSans-Light-webfont.woff',
  '/style/fonts/ClearSans-Regular-webfont.eot',
  '/style/fonts/ClearSans-Bold-webfont.eot',
  '/style/fonts/ClearSans-Light-webfont.eot',
  '/style/fonts/ClearSans-Regular-webfont.svg',
  '/style/fonts/ClearSans-Bold-webfont.svg',
  '/style/fonts/ClearSans-Light-webfont.svg',

  // JS
  '/js/animframe_polyfill.js',
  '/js/application.js',
  '/js/bind_polyfill.js',
  '/js/classlist_polyfill.js',
  '/js/game_manager.js',
  '/js/grid.js',
  '/js/html_actuator.js',
  '/js/keyboard_input_manager.js',
  '/js/local_storage_manager.js',
  '/js/tile.js',

  // meta images
  '/meta/apple-touch-icon.png',
  '/meta/apple-touch-startup-image-640x1096.png',
  '/meta/apple-touch-startup-image-640x920.png'
];

// On install: cache all core assets.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => {
        console.error('SW install failed, assets not cached', err);
        throw err;
      })
  );
});

// On activate: clear old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy: cache-first for app shell; fall back to network if not cached (and cache that response).
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle same-origin GET requests (assets and index). Let other requests go through.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        return cached;
      }

      // Not in cache — try network and cache response for future.
      return fetch(req).then(networkResponse => {
        // If response is invalid, just return it.
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Put a copy in the cache for future.
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return networkResponse;
      }).catch(() => {
        // Network failed and no cache available: as final fallback, return index.html for navigation requests
        if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
          return caches.match('/index.html');
        }
        // For other assets, just fail (no network / cache).
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
