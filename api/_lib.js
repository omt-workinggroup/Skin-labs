// Shared helpers for the Skin Lab order backend (Vercel Functions + Vercel Blob).
import { list, put, del } from '@vercel/blob';

export const STATUSES = ['new', 'confirmed', 'printing', 'on-the-way', 'delivered', 'cancelled'];
export const SITE = 'https://skin-labs.vercel.app';
const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const rnd = (n, abc = A) => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => abc[x % abc.length]).join(''); };
export const newId = () => 'SL-' + rnd(5);
export const secret = () => rnd(16, 'abcdefghijkmnpqrstuvwxyz23456789');

export function json(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
export const isAdmin = req => !!process.env.ADMIN_KEY && req.headers['x-admin-key'] === process.env.ADMIN_KEY;

// An order lives at orders/<id>-<secret>/order.json (+ sheet.jpg, mock.jpg). The secret part keeps the
// customer's phone number unguessable; the server finds an order from its short id by listing the prefix.
export async function findOrder(id) {
  if (!/^SL-[2-9A-Z]{5}$/.test(id || '')) return null;
  const { blobs } = await list({ prefix: `orders/${id}-` });
  const j = latest(blobs); if (!j) return null;
  const r = await fetch(j.url, { cache: 'no-store' });
  return r.ok ? { order: await r.json(), dir: j.pathname.slice(0, j.pathname.lastIndexOf('/')) } : null;
}
// Each save is a new file (order-<time>.json): a fresh URL is never served stale by the CDN. Older versions are removed.
export const latest = blobs => blobs.filter(b => /\/order(-\d+)?\.json$/.test(b.pathname)).sort((a, b) => b.pathname.localeCompare(a.pathname, 'en', { numeric: true }))[0];
export async function saveOrder(dir, order) {
  const { blobs } = await list({ prefix: dir + '/' }), old = blobs.filter(b => /\/order(-\d+)?\.json$/.test(b.pathname));
  const r = await put(`${dir}/order-${Date.now()}.json`, JSON.stringify(order), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });
  if (old.length) await del(old.map(b => b.url)).catch(() => {});
  return r;
}
// New-order alert to the shop's own WhatsApp through CallMeBot (free, for messages to your own number).
// Turned on by setting CALLMEBOT_KEY in Vercel; without it, orders still land in /admin.
export async function notifyOwner(text) {
  const key = process.env.CALLMEBOT_KEY, phone = process.env.OWNER_WHATSAPP;
  if (!key || !phone) return 'off';
  try {
    const u = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); return r.ok ? 'sent' : 'failed ' + r.status;
  } catch (e) { return 'failed'; }
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
