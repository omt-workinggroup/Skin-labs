// GET /api/payments : Skin Lab payments straight from Paystack (admin only). ?all=1 also shows the account's other projects.
// POST /api/payments {ref} : re-check one payment with Paystack and mark its order paid (if the webhook was missed).
import { json, isAdmin, payOn, paystack, confirmPayment } from './_lib.js';

const SL = /^SL-[2-9A-Z]{5}-[a-z0-9]{4,12}$/;
export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  if (!payOn()) return json(res, 200, { enabled: false, payments: [] });
  if (req.method === 'POST') {
    const ref = String((req.body || {}).ref || '');
    if (!SL.test(ref)) return json(res, 400, { error: 'Not a Skin Lab payment' });
    try { const o = await confirmPayment(ref); return o ? json(res, 200, { ok: true, order: o }) : json(res, 409, { error: 'Paystack says this payment did not go through' }); }
    catch (e) { return json(res, 502, { error: e.message }); }
  }
  const all = req.query.all === '1', out = [];
  try {
    for (let page = 1; page <= 4; page++) {
      const r = await fetch(`https://api.paystack.co/transaction?perPage=100&page=${page}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, signal: AbortSignal.timeout(15000) });
      const j = await r.json(); if (!j.status) throw new Error(j.message || 'Paystack error');
      for (const t of j.data || []) {
        if (!all && !SL.test(t.reference || '')) continue;
        const a = t.authorization || {}, c = t.customer || {};
        out.push({ ref: t.reference, order: SL.test(t.reference || '') ? t.reference.slice(0, 8) : '', amount: t.amount / 100, fees: (t.fees || 0) / 100, currency: t.currency, status: t.status,
          channel: t.channel || a.channel || '', bank: a.bank || '', last4: a.last4 || '', card: a.card_type || '', mobile: a.mobile_money_number || (t.channel === 'mobile_money' && a.last4 ? '••' + a.last4 : ''),
          email: /@customers\.skinlab\.shop$/.test(c.email || '') ? '' : c.email || '', at: t.paid_at || t.paidAt || t.created_at || t.createdAt, created: t.created_at || t.createdAt, msg: t.gateway_response || '' });
      }
      if (!j.meta || page >= (j.meta.pageCount || 1)) break;
    }
  } catch (e) { return json(res, 502, { error: e.message }); }
  return json(res, 200, { enabled: true, payments: out });
}
