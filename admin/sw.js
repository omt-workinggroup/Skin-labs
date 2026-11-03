// Skin Lab admin: shows new-order notifications, even when the admin page is closed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: 'Skin Lab', body: e.data ? e.data.text() : 'New order' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'New Skin Lab order', {
    body: d.body || '', icon: '/admin/icon-512.png', badge: '/favicon.png', image: d.image, tag: d.tag, renotify: true,
    vibrate: [120, 60, 120, 60, 240], requireInteraction: true, data: { url: d.url || '/admin/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = new URL(e.notification.data && e.notification.data.url || '/admin/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.includes('/admin/')); if (w) { w.navigate(url).catch(() => {}); return w.focus(); } return self.clients.openWindow(url); }));
});
