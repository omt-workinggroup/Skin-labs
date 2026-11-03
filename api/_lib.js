// Shared helpers for the Skin Lab order backend (Vercel Functions + Vercel Blob).
import { list, put } from '@vercel/blob';

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
  const j = blobs.find(b => b.pathname.endsWith('/order.json'));
  if (!j) return null;
  const r = await fetch(j.url + '?v=' + Date.now(), { cache: 'no-store' });
  return r.ok ? { order: await r.json(), dir: j.pathname.replace(/\/order\.json$/, '') } : null;
}
export const saveOrder = (dir, order) => put(`${dir}/order.json`, JSON.stringify(order), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });

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
