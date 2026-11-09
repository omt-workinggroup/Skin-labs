// /api/public : customer-side helpers.
// GET  ?a=reviews  -> approved reviews only (verified purchases: written from a delivered order's own page)
// GET  ?a=quote&w=&h=&q=&kind=sticker|skin -> an approximate price for a custom size (the price only)
// GET  ?a=popular  -> best-selling packs, counted from real orders (no names, no numbers)
// POST {a:'support', topic, order?, name, phone, msg}  -> support ticket, reference SUP-XXXXX
// POST {a:'review', id, rating, text, permit, photo?, fb?} -> review of a delivered order (moderated before it shows)
import { put } from '@vercel/blob';
import { settings, price } from './_quote.js';
import { json, findOrder, saveOrder, pushAll, limited, ghPhone, rid, saveDoc, loadDoc, loadDocs, allOrders } from './_lib.js';

const str = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const TOPICS = ['order', 'payment', 'delivery', 'damaged', 'design', 'other'];
export default async function handler(req, res) {
  const q = req.query || {};
  if (req.method === 'GET') {
    if (q.a === 'reviews') {
      const all = (await loadDocs('reviews/')).filter(r => r.status === 'approved');
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'); res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ reviews: all.slice(0, 60).map(r => ({ rating: r.rating, text: r.text, name: r.first, at: r.at, items: r.items, keys: r.keys, photo: r.permit ? r.photo || '' : '', verified: true })),
        count: all.length, avg: all.length ? Math.round(all.reduce((a, r) => a + r.rating, 0) / all.length * 10) / 10 : 0 }));
    }
    if (q.a === 'quote') {
      if (limited(req, 'quote', 120, 10 * 60e3)) return json(res, 429, { error: 'Too many tries' });
      const kind = ['sticker', 'skin', 'decal'].includes(q.kind) ? q.kind : 'sticker', r = price(await settings(), q.w, q.h, q.q, kind);
      return json(res, 200, { w: r.w, h: r.h, q: r.q, kind, price: r.price, approx: true });
    }
    if (q.a === 'popular') {
      const os = (await allOrders(500)).filter(o => !['cancelled', 'refunded'].includes(o.status) && Date.now() - o.at < 120 * 864e5), n = {};
      for (const o of os) for (const p of o.packs || []) { const k = String(p.key).replace(/~5$/, ''); n[k] = (n[k] || 0) + (p.q || 1); }
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'); res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ top: Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k]) => k) }));
    }
    return json(res, 400, { error: 'Unknown request' });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
  const b = req.body || {};
  if (b.a === 'support') {
    if (limited(req, 'sup', 6, 30 * 60e3)) return json(res, 429, { error: 'You have sent a few messages already. We will get back to you, or chat with us on WhatsApp' });
    const name = str(b.name, 60), phone = ghPhone(b.phone), msg = str(b.msg, 1500), topic = TOPICS.includes(b.topic) ? b.topic : 'other', order = /^SL-[2-9A-Z]{5}$/i.test(str(b.order, 8)) ? str(b.order, 8).toUpperCase() : '';
    if (name.length < 2) return json(res, 400, { error: 'Add your name', field: 'name' });
    if (!phone) return json(res, 400, { error: 'Add a WhatsApp number we can reply on', field: 'phone' });
    if (msg.length < 5) return json(res, 400, { error: 'Tell us a little about the problem', field: 'msg' });
    const id = 'SUP-' + rid(5), t = { id, at: Date.now(), topic, order, name, phone, msg, status: 'open', assigned: '', log: [{ at: Date.now(), by: 'Customer', s: 'open' }] };
    await saveDoc(`support/${id}`, t);
    await pushAll({ title: `Support ${id} · ${topic}`, body: `${name}${order ? ' · ' + order : ''}\n${msg.slice(0, 120)}`, url: '/admin/#support', tag: id }).catch(() => {});
    return json(res, 200, { id });
  }
  if (b.a === 'review') {
    if (limited(req, 'rev', 8, 30 * 60e3)) return json(res, 429, { error: 'Too many tries, wait a little' });
    const f = await findOrder(String(b.id || '').toUpperCase()); if (!f) return json(res, 404, { error: 'No such order' });
    const o = f.order; if (o.status !== 'delivered') return json(res, 400, { error: 'You can review once your order has been delivered' });
    const rating = Math.round(+b.rating); if (!(rating >= 1 && rating <= 5)) return json(res, 400, { error: 'Pick a star rating', field: 'rating' });
    const old = await loadDoc(`reviews/${o.id}`); if (old && old.status === 'approved') return json(res, 409, { error: 'Thanks, your review is already up' });
    let photo = old && old.photo || '';
    if (typeof b.photo === 'string' && b.photo.startsWith('data:image/jpeg;base64,')) { const buf = Buffer.from(b.photo.slice(23), 'base64');
      if (buf.length > 1.6e6) return json(res, 400, { error: 'That photo is too big' }); photo = (await put(`reviews/${o.id}/photo.jpg`, buf, { access: 'public', addRandomSuffix: true, contentType: 'image/jpeg' })).url; }
    const fb = b.fb && typeof b.fb === 'object' ? Object.fromEntries(['ease', 'pay', 'product', 'delivery'].map(k => [k, Math.max(0, Math.min(5, Math.round(+b.fb[k] || 0)))])) : {};
    const r = { id: o.id, at: Date.now(), rating, text: str(b.text, 600), permit: !!b.permit, photo, fb, first: o.name.split(' ')[0], status: 'pending',
      items: [...(o.packs || []).map(p => p.label), ...(o.design ? [o.design.packName || 'Custom laptop pack'] : []), ...((o.singles || []).length ? ['Single stickers'] : [])].slice(0, 6),
      keys: (o.packs || []).map(p => String(p.key).replace(/~5$/, '')).slice(0, 12), log: [{ at: Date.now(), by: 'Customer', s: 'pending' }] };
    await saveDoc(`reviews/${o.id}`, r); o.reviewed = Date.now(); await saveOrder(f.dir, o);
    await pushAll({ title: `New review ${'★'.repeat(rating)} · ${o.id}`, body: r.text.slice(0, 120) || 'No words, just stars', url: '/admin/#reviews', tag: o.id + '-rev' }).catch(() => {});
    return json(res, 200, { ok: true });
  }
  return json(res, 400, { error: 'Unknown request' });
}
