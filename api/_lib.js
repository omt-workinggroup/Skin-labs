// Shared helpers for the Skin Lab order backend (Vercel Functions + Vercel Blob).
import { list, put, del } from '@vercel/blob';

export const STATUSES = ['new', 'confirmed', 'printing', 'on-the-way', 'delivered', 'cancelled'];
export const SITE = (process.env.SITE_URL || 'https://shop.baidencreatives.org').replace(/\/$/, '');
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

// ---------- phone notifications (Web Push) to every device that turned them on in /admin ----------
import webpush from 'web-push';
export async function pushAll(payload) {
  const pub = process.env.VAPID_PUBLIC, priv = process.env.VAPID_PRIVATE; if (!pub || !priv) return 'off';
  webpush.setVapidDetails(SITE, pub, priv);
  const { blobs } = await list({ prefix: 'push/' }); if (!blobs.length) return 'no devices';
  let sent = 0;
  await Promise.all(blobs.map(async b => {
    try { const sub = await (await fetch(b.url, { cache: 'no-store' })).json(); await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 86400, urgency: 'high' }); sent++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await del(b.url).catch(() => {}); }   // phone unsubscribed: forget it
  }));
  return `${sent}/${blobs.length} devices`;
}

// ---------- Paystack (Mobile Money + card). Switched on by setting PAYSTACK_SECRET_KEY in Vercel. ----------
export const payOn = () => !!process.env.PAYSTACK_SECRET_KEY;
export async function paystack(path, body) {
  const r = await fetch('https://api.paystack.co' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.status) throw new Error(j.message || 'Paystack error ' + r.status); return j.data;
}
// Ask Paystack (never the browser) whether a payment went through; if it did, mark the order paid once and tell the shop.
export async function confirmPayment(reference) {
  if (!payOn() || !/^SL-[2-9A-Z]{5}-[a-z0-9]{4,12}$/.test(reference || '')) return null;
  const tx = await paystack('/transaction/verify/' + encodeURIComponent(reference));
  if (!tx || tx.status !== 'success' || tx.currency !== 'GHS') return null;
  const f = await findOrder(reference.slice(0, 8)); if (!f) return null;
  if (f.order.paid && f.order.paid.ref === reference) return f.order;
  const amount = tx.amount / 100;
  f.order.paid = { amount, ref: reference, at: Date.now(), channel: tx.channel || '', short: amount + 0.001 < f.order.total };
  (f.order.history ||= []).push({ s: 'paid', at: Date.now() });
  if (f.order.status === 'new') { f.order.status = 'confirmed'; f.order.history.push({ s: 'confirmed', at: Date.now() }); }
  await saveOrder(f.dir, f.order);
  await pushAll({ title: `💰 Paid GH₵${amount} · ${f.order.id}`, body: `${f.order.name}${f.order.paid.short ? ` · ⚠ order total was GH₵${f.order.total}` : ''} · ${tx.channel === 'mobile_money' ? 'MoMo' : tx.channel || ''}`, url: `/admin/#${f.order.id}`, tag: f.order.id + '-paid' }).catch(() => {});
  return f.order;
}
