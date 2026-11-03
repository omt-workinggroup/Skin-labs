// Skin Lab offline cache. The shop opens from the phone's cache, then quietly updates itself.
const V = 'sl-32c17ff1', SHELL = ["/", "/data.31aea529.js", "/inspo.7391542c.js", "/app.8bec6429.js", "/favicon.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('sl-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const KEEP = /^\/(atlas|sheets|sheets-sm|sheets-xs|inspo|skins|laptops|laptops-real|hd|fonts)\/|\.[0-9a-f]{8}\.js$|\.(png|jpg)$/;
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate' && (u.pathname === '/' || u.pathname === '/index.html')) {
    // home: always from the network, so a new version shows up at once
    e.respondWith(caches.open(V).then(async c => { const net = fetch(r, { cache: 'no-store' }).then(res => { if (res.ok) c.put('/', res.clone()); return res; });
      // the saved copy is used only with no connection at all, never just because the line is slow (that showed old versions)
      try { return await net; } catch (x) { return (await c.match('/')) || Response.error(); } }));
    return;
  }
  if (KEEP.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
  }
});
