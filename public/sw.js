// PhysioMind Pro — Service Worker
const CACHE = 'physiomind-__CACHE_VERSION__';
const PRECACHE = ['/', '/index.html'];

// How long opening the app waits for the network before it shows the copy kept on
// the phone. On a weak connection the answer can take 30 seconds or never come; the
// kept copy is the same app (the newest one is fetched in the background and used
// next time).
const NAV_WAIT_MS = 2500;

// Keeps the first screen's own files (the script, the styles) as well as index.html,
// so a phone that has opened the app once can start it with no connection at all.
// A file that fails to save is skipped: the browser fetches it when needed.
async function saveFirstScreen() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE);
  try {
    const html = await (await cache.match('/index.html')).text();
    const files = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]))];
    await Promise.all(files.map(f => cache.add(f).catch(() => {})));
  } catch { /* not worth failing the install over */ }
}

self.addEventListener('install', e => {
  e.waitUntil(saveFirstScreen().then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Opening the app: the network first (so a new version shows up), but never wait
// longer than NAV_WAIT_MS when a saved copy exists.
function openPage(e) {
  const request = e.request;
  const network = fetch(request).then(r => {
    if (r.ok) { const clone = r.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
    return r;
  });
  // Stay alive until the slow answer arrives, so it still gets saved for next time.
  e.waitUntil(network.catch(() => {}));
  const gaveUp = new Promise(resolve => setTimeout(() => resolve(null), NAV_WAIT_MS));
  return (async () => {
    try {
      const r = await Promise.race([network, gaveUp]);
      if (r && (r.ok || r.status < 500)) return r;
    } catch { /* offline or failed: use the saved copy below */ }
    const saved = (await caches.match(request)) || (await caches.match('/index.html'));
    return saved || network; // nothing saved yet: keep waiting for the real answer
  })();
}

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
    e.respondWith(openPage(e));
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
