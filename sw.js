const CACHE_NAME = 'cashbook-pwa-v1';

// Files to cache immediately upon installation
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install Event - caches the initial static files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching Application Assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event - cleans up old caches when a new version is installed
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting Old Cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Intercepts network requests to provide offline fallback
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If the fetch was successful, dynamically cache external resources (like CDNs)
                // This ensures CDNs (Tailwind, Alpine, Chart.js) are saved for offline use
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // If the fetch failed (e.g., the user is offline), look for the file in the cache
                return caches.match(event.request);
            })
    );
});