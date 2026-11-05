// /api/admin : everything the Skin Lab team does in /admin, behind the admin password.
// GET  ?a=orders | payments[&all=1] | tickets | reviews
// POST {a: status | note | delete | sync | refund | push-test | ticket | review, ...}
// Every change is written into the record's history with who made it and when.
import { list, del } from '@vercel/blob';
import { json, isAdmin, adminName, findOrder, saveOrder, STATUSES, FLOW, payOn, paystack, confirmPayment, pushAll, allOrders, loadDocs, loadDoc, saveDoc } from './_lib.js';

const SL = /^SL-[2-9A-Z]{5}-[a-z0-9]{4,12}$/;
const str = (s, n) => String(s ?? '').trim().slice(0, n);
export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  const by = adminName(req), q = req.query || {};
  if (req.method === 'GET') {
    if (q.a === 'orders') return json(res, 200, { orders: await allOrders(), push: !!process.env.VAPID_PUBLIC, pay: payOn() });
    if (q.a === 'tickets') return json(res, 200, { tickets: await loadDocs('support/') });
    if (q.a === 'reviews') return json(res, 200, { reviews: await loadDocs('reviews/') });
    if (q.a === 'payments') {
      if (!payOn()) return json(res, 200, { enabled: false, payments: [] });
      const all = q.all === '1', out = [];
      try {
        for (let page = 1; page <= 4; page++) {
          const r = await fetch(`https://api.paystack.co/transaction?perPage=100&page=${page}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, signal: AbortSignal.timeout(15000) });
          const j = await r.json(); if (!j.status) throw new Error(j.message || 'Paystack error');
          for (const t of j.data || []) {
            if (!all && !SL.test(t.reference || '')) continue;
            const a = t.authorization || {}, c = t.customer || {};
            out.push({ ref: t.reference, order: SL.test(t.reference || '') ? t.reference.slice(0, 8) : '', amount: t.amount / 100, fees: (t.fees || 0) / 100, currency: t.currency, status: t.status,
              channel: t.channel || a.channel || '', bank: a.bank || '', last4: a.last4 || '', card: a.card_type || '', mobile: a.mobile_money_number || '',
              email: /@customers\.skinlab\.shop$/.test(c.email || '') ? '' : c.email || '', at: t.paid_at || t.paidAt || t.created_at || t.createdAt, msg: t.gateway_response || '' });
          }
          if (!j.meta || page >= (j.meta.pageCount || 1)) break;
        }
      } catch (e) { return json(res, 502, { error: e.message }); }
      return json(res, 200, { enabled: true, payments: out });
    }
    return json(res, 400, { error: 'Unknown request' });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
  const b = req.body || {};
  if (b.a === 'push-test') return json(res, 200, { result: await pushAll({ title: 'Skin Lab · test', body: 'Notifications are on. New orders will show up like this.', url: '/admin/', tag: 'test' }) });
  if (b.a === 'sync') {   // re-check one payment with Paystack (if the webhook was missed)
    if (!SL.test(String(b.ref || ''))) return json(res, 400, { error: 'Not a Skin Lab payment' });
    try { const o = await confirmPayment(b.ref); return o && o.paid && o.paid.ref === b.ref ? json(res, 200, { ok: true, order: o }) : json(res, 409, { error: 'Paystack says this payment did not go through (or the amount was wrong)' }); }
    catch (e) { return json(res, 502, { error: e.message }); }
  }
  if (b.a === 'ticket' || b.a === 'review') {
    const dir = b.a === 'ticket' ? `support/${str(b.id, 20)}` : `reviews/${str(b.id, 20)}`, doc = /^[\w-]{4,20}$/.test(String(b.id)) ? await loadDoc(dir) : null;
    if (!doc) return json(res, 404, { error: 'Not found' });
    if (b.a === 'ticket') {
      if (b.status && ['open', 'in-progress', 'waiting', 'resolved'].includes(b.status)) doc.status = b.status;
      if (b.assign !== undefined) doc.assigned = str(b.assign, 30);
      (doc.log ||= []).push({ at: Date.now(), by, ...(b.status ? { s: b.status } : {}), ...(b.note ? { note: str(b.note, 600) } : {}), ...(b.assign !== undefined ? { assigned: doc.assigned } : {}) });
    } else {
      if (!['approved', 'hidden', 'pending'].includes(b.status)) return json(res, 400, { error: 'Unknown review state' });
      doc.status = b.status; (doc.log ||= []).push({ at: Date.now(), by, s: b.status });
    }
    await saveDoc(dir, doc); return json(res, 200, { ok: true, doc });
  }
  const id = String(b.id || ''); if (!/^SL-[2-9A-Z]{5}$/.test(id)) return json(res, 400, { error: 'Bad order id' });
  if (b.a === 'delete') {
    const { blobs } = await list({ prefix: `orders/${id}-` }); if (!blobs.length) return json(res, 404, { error: 'No such order' });
    await del(blobs.map(x => x.url)); return json(res, 200, { ok: true, removed: blobs.length });
  }
  const f = await findOrder(id); if (!f) return json(res, 404, { error: 'No such order' });
  const o = f.order; o.history ||= [];
  if (b.a === 'status') {
    const s = b.status; if (!STATUSES.includes(s)) return json(res, 400, { error: 'Unknown status' });
    if (s === 'refunded' && o.paid && o.paid.ref) return json(res, 400, { error: 'This order was paid on Paystack: use Refund, it is marked refunded when Paystack confirms' });
    if (payOn() && !o.paid && FLOW.indexOf(s) > 1 && !b.force) return json(res, 409, { needConfirm: true, error: `${o.id} is not paid yet. Move it to “${s}” anyway?` });
    o.status = s; o.history.push({ s, at: Date.now(), by, ...(b.note ? { note: str(b.note, 300) } : {}) });
  } else if (b.a === 'note') {
    if (b.kind === 'customer') { o.custNote = str(b.note, 400); o.history.push({ s: 'customer-note', at: Date.now(), by }); }
    else { (o.notes ||= []).push({ t: str(b.note, 800), at: Date.now(), by }); }
  } else if (b.a === 'refund') {
    if (!o.paid || !o.paid.ref) return json(res, 400, { error: 'Only orders paid on Paystack can be refunded here' });
    if (o.refund && ['pending', 'processing', 'processed'].includes(o.refund.status)) return json(res, 409, { error: 'A refund for this order is already in progress' });
    const amount = b.amount ? Math.min(o.paid.amount, Math.max(1, +b.amount)) : o.paid.amount;
    try { const r = await paystack('/refund', { transaction: o.paid.ref, amount: Math.round(amount * 100), merchant_note: str(b.reason, 200) || `Skin Lab refund by ${by}` });
      o.refund = { status: r && r.status || 'pending', amount, at: Date.now(), by, reason: str(b.reason, 200), psId: r && r.id || null };
    } catch (e) { return json(res, 502, { error: `Paystack did not accept the refund: ${e.message}` }); }
    o.status = 'refund-review'; o.history.push({ s: 'refund-review', at: Date.now(), by, note: `GH₵${amount} refund sent to Paystack` });
  } else return json(res, 400, { error: 'Unknown action' });
  await saveOrder(f.dir, o);
  return json(res, 200, { ok: true, order: o });
}
