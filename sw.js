// Skin Lab offline cache. The shop opens from the phone's cache, then quietly updates itself.
const V = 'sl-cf83cbc3', SHELL = ["/", "/data.31aea529.js", "/inspo.7391542c.js", "/app.136b522f.js", "/favicon.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('sl-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const KEEP = /^\/(atlas|sheets|sheets-sm|sheets-xs|inspo|skins|laptops|laptops-real|fonts)\/|\.[0-9a-f]{8}\.js$|\.(png|jpg)$/;
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate' && (u.pathname === '/' || u.pathname === '/index.html')) {
    // home: always try the network first so a new version shows up at once; the cached copy is only used offline or on a very slow line
    e.respondWith(caches.open(V).then(async c => { const net = fetch(r, { cache: 'no-store' }).then(res => { if (res.ok) c.put('/', res.clone()); return res; });
      const slow = new Promise(ok => setTimeout(ok, 4000)).then(() => c.match('/'));
      try { return await Promise.race([net, slow.then(h => h || net)]); } catch (x) { return (await c.match('/')) || Response.error(); } }));
    return;
  }
  if (KEEP.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
  }
});
