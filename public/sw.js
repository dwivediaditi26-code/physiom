// PhysioMind Pro — Service Worker
const CACHE = 'physiomind-__CACHE_VERSION__';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const clone = r.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return r; }).catch(() => caches.match('/index.html')));
    return;
  }
  if (url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)) {
    e.respondWith(caches.match(e.request).then(cached => { if (cached) return cached; return fetch(e.request).then(r => { if (r.ok) { const clone = r.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); } return r; }); }));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
