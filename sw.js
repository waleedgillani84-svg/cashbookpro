/* ═══════════════════════════════════════════════════════════
   CASH BOOK PRO — SERVICE WORKER
   Version bump karein jab bhi deploy karein
   ═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'cashbook-pro-v1.0.0';
const OFFLINE_FALLBACK = './index.html';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

/* ── INSTALL ── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] skip:', url, err.message))
        )
      );
    })
  );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  /* Supabase API + Auth — never cache */
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  /* HTML — network first */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const c = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, c));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match(OFFLINE_FALLBACK)))
    );
    return;
  }

  /* CDN — cache first */
  const isCDN = url.hostname.includes('cdn.jsdelivr.net') ||
                url.hostname.includes('cdnjs.cloudflare.com') ||
                url.hostname.includes('unpkg.com');

  if (isCDN) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const c = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, c));
          return res;
        });
      })
    );
    return;
  }

  /* Same-origin — cache first */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.status === 200) {
            const c = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, c));
          }
          return res;
        }).catch(() => caches.match(OFFLINE_FALLBACK));
      })
    );
    return;
  }

  /* Default — network with cache fallback */
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* ── MESSAGE ── */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});