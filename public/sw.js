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

// Push notifications (reminders, deadlines, etc.) sent via the send-push
// edge function. Payload shape is { title, body, url } — see
// supabase/functions/send-push/index.ts.
self.addEventListener('push', e => {
  let data = { title: 'PhysioMind', body: '', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch { /* non-JSON push, keep defaults */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

// Focuses an already-open tab instead of always opening a new one -- a
// student tapping a reminder should land back in the app they already
// have open, not a second duplicate tab.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
