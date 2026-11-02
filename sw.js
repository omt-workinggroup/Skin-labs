// Skin Lab offline cache. The shop opens from the phone's cache, then quietly updates itself.
const V = 'sl-206d7b7d', SHELL = ["/", "/data.4e56c2ad.js", "/inspo.7391542c.js", "/app.78be2e94.js", "/favicon.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('sl-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const KEEP = /^\/(atlas|sheets|sheets-sm|sheets-xs|inspo|skins|laptops|fonts)\/|\.[0-9a-f]{8}\.js$|\.(png|jpg)$/;
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate' && (u.pathname === '/' || u.pathname === '/index.html')) {
    // home: answer from cache at once, refresh the cached copy in the background
    e.respondWith(caches.open(V).then(async c => { const hit = await c.match('/');
      const net = fetch(r).then(res => { if (res.ok) c.put('/', res.clone()); return res; }).catch(() => hit);
      return hit || net; }));
    return;
  }
  if (KEEP.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
  }
});
