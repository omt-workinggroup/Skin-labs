// Shared helpers for the Skin Lab order backend (Vercel Functions + Vercel Blob).
import { list, put, del } from '@vercel/blob';
import { timingSafeEqual } from 'crypto';

// Order lifecycle. Payment is never a status staff can set: only a verified Paystack payment marks an order paid.
export const FLOW = ['new', 'confirmed', 'artwork', 'printing', 'qc', 'ready', 'on-the-way', 'delivered'];
export const EXCEPT = ['clarify', 'hold', 'failed-delivery', 'cancelled', 'refund-review', 'refunded'];
export const STATUSES = [...FLOW, ...EXCEPT];
import PR from './_prices.js';
// The authoritative price of an order, from the shop's own price list (never from the browser).
export function priceOrder(b) {
  let t = 0; const bad = [];
  for (const p of b.packs || []) {
    const k = String(p.key || ''), q = Math.max(1, Math.min(20, +p.q || 1)); let u = null;
    let m;
    if ((m = /^skin~([\w-]+)~([SMLC])$/.exec(k))) u = PR.skin[m[2]];
    else if (/^kb~[\w-]+$/.test(k)) u = PR.kb;
    else if (/^(ms|tp)~[\w-]+$/.test(k)) u = PR.tp ?? PR.ms;
    else if (/^dc~[\w-]+(~w)?$/.test(k)) u = PR.decal;
    else if ((m = /^(drop-[\w-]+?)(~5)?$/.exec(k))) u = m[2] ? 30 : 60;
    else if ((m = /^([\w-]+?)(~5)?$/.exec(k)) && PR.packs[m[1]]) u = m[2] ? PR.packs[m[1]][1] : PR.packs[m[1]][0];
    if (u == null) bad.push(k); else { p.price = u; t += u * q; }
  }
  let st = 0;   // single stickers (GH₵3 each), loose or placed in the designer
  for (const s of b.singles || []) if (!String(s.code).startsWith('XQV-')) st += PR.single * Math.max(1, Math.min(99, +s.q || 1));
  const d = b.design; let skinJob = false;
  if (d) { const raw = d.raw && d.raw.i ? Object.values(d.raw.i).flat() : (d.layout || []); const n = raw.filter(o => !String(Array.isArray(o) ? o[0] : o.c).startsWith('XQV-')).length;
    const k = d.raw && d.raw.k ? d.raw.k : null;
    const lap = k ? ['lid', 'kb', 'bot'].some(x => k[x]) : (d.skins || []).length > 0, pad = !!(k && k.pad);
    st += n * PR.single; t += (lap ? PR.skin[/^[SMLC]$/.test(d.skinSize) ? d.skinSize : 'M'] : 0) + (pad ? (PR.tp ?? 30) : 0); skinJob = lap || pad; }
  t += st;
  // Single stickers print on their own A5/A4 sheet, so a handful alone does not pay for the print. Waived when the order
  // already prints a skin (the stickers share that job).
  const minSingles = PR.minSingles || 25, short = st > 0 && st < minSingles && !skinJob ? minSingles - st : 0;
  return { total: Math.round(t * 100) / 100, bad, singles: st, short, minSingles };
}
export const adminName = req => String(req.headers['x-admin-name'] || '').replace(/[^\w .'-]/g, '').slice(0, 30) || 'Admin';
// light abuse protection: per instance, per IP
const HITS = new Map();
export function limited(req, key, n, ms) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(), k = key + ip, now = Date.now();
  const a = (HITS.get(k) || []).filter(t => now - t < ms); a.push(now); HITS.set(k, a); if (HITS.size > 5000) HITS.clear(); return a.length > n;
}
export const ghPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '233' + d.slice(1); else if (d.length === 9) d = '233' + d; return /^233[235][0-9]{8}$/.test(d) || /^[1-9][0-9]{9,13}$/.test(d) ? d : ''; };
export const SITE = (process.env.SITE_URL || 'https://shop.baidencreatives.org').replace(/\/$/, '');
const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const rnd = (n, abc = A) => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => abc[x % abc.length]).join(''); };
export const newId = () => 'SL-' + rnd(5);
export const secret = () => rnd(16, 'abcdefghijkmnpqrstuvwxyz23456789');

export function json(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
// Three logins: the owner (everything), payments (orders, money, support; no catalog, no deleting) and the printer
// (the print queue only: what to print, never a price, a phone number or a payment).
const KEYS = [['owner', 'ADMIN_KEY'], ['payments', 'PAYMENTS_KEY'], ['printer', 'PRINTER_KEY']];
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
export function role(req) { const k = String(req.headers['x-admin-key'] || ''); if (!k) return null;
  for (const [r, e] of KEYS) if (process.env[e] && same(k, process.env[e])) return r; return null; }
export const isAdmin = req => role(req) === 'owner';
const noMoney = t => String(t || '').replace(/(GH₵|GHS|₵|cedis?)\s?[\d.,]+|[\d.,]+\s?(GH₵|GHS|cedis?)/gi, '₵—');
// What the printer may see of an order: the work, not the money or the customer's contact details.
export function forPrinter(o) {
  const d = o.design ? (({ skinPrice, ...x }) => x)(o.design) : null;
  return { id: o.id, at: o.at, status: o.status, name: (o.name || '').split(' ')[0], note: noMoney(o.note), paidOk: !!o.paid || o.total === 0,
    packs: (o.packs || []).map(({ price, ...p }) => p), singles: o.singles || [], picks: o.picks || null, free: o.free || null, design: d,
    notes: (o.notes || []).map(n => ({ ...n, t: noMoney(n.t) })), history: (o.history || []).filter(h => !/^(paid|payment-mismatch|refund)/.test(h.s)).map(({ note, ...h }) => h) };
}

// An order lives at orders/<id>-<secret>/order.json (+ sheet.jpg, mock.jpg). The secret part keeps the
// customer's phone number unguessable; the server finds an order from its short id by listing the prefix.
export async function findOrder(id) {
  if (!/^SL-[2-9A-Z]{5}$/.test(id || '')) return null;
  const { blobs } = await list({ prefix: `orders/${id}-` });
  const j = latest(blobs); if (!j) return null;
  const r = await fetch(j.url, { cache: 'no-store' });
  return r.ok ? { order: await r.json(), dir: j.pathname.slice(0, j.pathname.lastIndexOf('/')) } : null;
}
// Support tickets and reviews use the same versioned-file pattern: <prefix><id>/doc-<time>.json
const latestDoc = blobs => blobs.filter(b => /\/doc-\d+\.json$/.test(b.pathname)).sort((a, b) => b.pathname.localeCompare(a.pathname, 'en', { numeric: true }))[0];
export async function saveDoc(dir, obj) {
  const { blobs } = await list({ prefix: dir + '/' }), old = blobs.filter(b => /\/doc-\d+\.json$/.test(b.pathname));
  await put(`${dir}/doc-${Date.now()}.json`, JSON.stringify(obj), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });
  if (old.length) await del(old.map(b => b.url)).catch(() => {});
}
export async function loadDoc(dir) { const { blobs } = await list({ prefix: dir + '/' }); const j = latestDoc(blobs); if (!j) return null; const r = await fetch(j.url, { cache: 'no-store' }); return r.ok ? r.json() : null; }
export async function loadDocs(prefix) {
  let blobs = [], cursor; do { const r = await list({ prefix, cursor, limit: 1000 }); blobs = blobs.concat(r.blobs); cursor = r.hasMore ? r.cursor : null; } while (cursor);
  const by = {}; for (const b of blobs) { const d = b.pathname.slice(0, b.pathname.lastIndexOf('/')); (by[d] ||= []).push(b); }
  const docs = await Promise.all(Object.values(by).map(latestDoc).filter(Boolean).map(b => fetch(b.url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)));
  return docs.filter(Boolean).sort((a, b) => b.at - a.at);
}
export const rid = (n = 5) => rnd(n);
export async function allOrders(max = 400) {
  let blobs = [], cursor; do { const r = await list({ prefix: 'orders/', cursor, limit: 1000 }); blobs = blobs.concat(r.blobs); cursor = r.hasMore ? r.cursor : null; } while (cursor);
  const byDir = {}; for (const b of blobs) { const d = b.pathname.slice(0, b.pathname.lastIndexOf('/')); (byDir[d] ||= []).push(b); }
  const js = Object.values(byDir).map(latest).filter(Boolean).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, max);
  const orders = (await Promise.all(js.map(b => fetch(b.url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)))).filter(Boolean);
  return orders.sort((a, b) => b.at - a.at);
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
// payload goes to the owner and payments phones; payload.printer (if any) is the price-free version for the printer's phone.
export async function pushAll(payload) {
  const pub = process.env.VAPID_PUBLIC, priv = process.env.VAPID_PRIVATE; if (!pub || !priv) return 'off';
  webpush.setVapidDetails(SITE, pub, priv);
  const { blobs } = await list({ prefix: 'push/' }); if (!blobs.length) return 'no devices';
  let sent = 0;
  await Promise.all(blobs.map(async b => {
    try { const { role: r, ...sub } = await (await fetch(b.url, { cache: 'no-store' })).json(), { printer, ...main } = payload, msg = r === 'printer' ? printer : main;
      if (!msg) return; await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 86400, urgency: 'high' }); sent++; }
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
  const f = await findOrder(reference.slice(0, 8)); if (!f) return null;
  const o = f.order, rec = { ref: reference, status: tx && tx.status || 'unknown', amount: tx ? tx.amount / 100 : 0, currency: tx && tx.currency || '', channel: tx && tx.channel || '', psId: tx && tx.id || null,
    fees: tx && tx.fees ? tx.fees / 100 : 0, checkedAt: Date.now(), msg: tx && tx.gateway_response || '' };
  if (o.paid && o.paid.ref === reference) return o;                                  // already processed: nothing changes
  const att = (o.attempts ||= []).find(x => x.ref === reference); if (att) Object.assign(att, { status: rec.status, checkedAt: rec.checkedAt, msg: rec.msg });
  if (!tx || tx.status !== 'success') { await saveOrder(f.dir, o); return o; }        // abandoned / failed / pending: never paid
  if (tx.currency !== 'GHS' || rec.amount + 0.001 < o.total) {                          // wrong amount or currency: recorded, not paid
    o.payIssue = { ...rec, expected: o.total }; (o.history ||= []).push({ s: 'payment-mismatch', at: Date.now(), by: 'Paystack' }); await saveOrder(f.dir, o);
    await pushAll({ title: `⚠ Payment check ${o.id}`, body: `Paystack says ${rec.currency} ${rec.amount}, order is GH₵${o.total}. Not marked paid.`, url: `/admin/#${o.id}`, tag: o.id + '-pay' }).catch(() => {});
    return o; }
  o.paid = { amount: rec.amount, ref: reference, at: Date.now(), verifiedAt: Date.now(), channel: rec.channel, currency: 'GHS', fees: rec.fees, psId: rec.psId, short: false };
  delete o.payIssue; (o.history ||= []).push({ s: 'paid', at: Date.now(), by: 'Paystack' });
  if (o.status === 'new') { o.status = 'confirmed'; o.history.push({ s: 'confirmed', at: Date.now(), by: 'Paystack' }); }
  await saveOrder(f.dir, o);
  const job = [...(o.packs || []).map(p => `${p.q}× ${p.label}`), (o.singles || []).length ? `${o.singles.reduce((a, x) => a + x.q, 0)} singles` : '', o.design ? `custom ${o.design.size || ''} pack` : ''].filter(Boolean).join(' · ');
  await pushAll({ title: `💰 Paid GH₵${rec.amount} · ${o.id}`, body: `${o.name} · ${rec.channel === 'mobile_money' ? 'MoMo' : rec.channel || ''}`, url: `/admin/#${o.id}`, tag: o.id + '-paid',
    printer: { title: `🖨 Ready to print · ${o.id}`, body: job.slice(0, 160), url: `/printer/#${o.id}`, tag: o.id + '-print' } }).catch(() => {});
  return o;
}
