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
  // Never intercept cross-origin requests (Supabase auth/REST calls, etc.).
  // These used to fall into the catch-all branch below, which retries from
  // cache on any fetch failure -- but a live POST to a different origin
  // (e.g. a signup call) was never cacheable in the first place, so
  // caches.match() resolved to undefined and respondWith(undefined) is
  // exactly "FetchEvent.respondWith received an error: Returned response
  // is null." That silently swallowed the real request -- it never even
  // reached Supabase -- on any transient network hiccup (flaky mobile
  // connection, brief drop), for login, signup, patient saves, AI calls,
  // anything. Cross-origin requests should just go straight to the
  // network, same as if there were no service worker at all.
  if (url.origin !== self.location.origin) return;
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
