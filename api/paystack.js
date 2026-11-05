// POST /api/paystack : Paystack's webhook (set this URL in Paystack > Settings > API Keys & Webhooks).
// The payment is double-checked with Paystack itself before the order is marked paid.
import crypto from 'node:crypto';
import { json, confirmPayment, findOrder, saveOrder } from './_lib.js';

export const config = { api: { bodyParser: false } };
const raw = req => new Promise((ok, no) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const key = process.env.PAYSTACK_SECRET_KEY; if (!key) return json(res, 503, { error: 'off' });
  let body = req.readableEnded || req.body !== undefined && typeof req.body === 'object' && Object.keys(req.body).length ? Buffer.alloc(0) : await Promise.race([raw(req), new Promise(r => setTimeout(() => r(Buffer.alloc(0)), 5000))]).catch(() => Buffer.alloc(0));
  if (!body.length && req.body) body = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  // Paystack signs with the main secret key. If PAYSTACK_WEBHOOK_SECRET (the sk_live key) is set, a wrong signature is refused.
  // Either way nothing in the message is trusted: confirmPayment asks Paystack itself whether the payment really succeeded.
  const wk = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (wk && crypto.createHmac('sha512', wk).update(body).digest('hex') !== req.headers['x-paystack-signature']) return json(res, 401, { error: 'bad signature' });
  let ev = {}; try { ev = JSON.parse(body.toString()); } catch (e) {}
  if (ev.event === 'charge.success') await confirmPayment(ev.data && ev.data.reference).catch(() => null);
  if (/^refund\.(processed|failed)$/.test(ev.event || '')) {   // a refund only counts once Paystack says it went through
    const ref = String((ev.data && (ev.data.transaction_reference || (ev.data.transaction && ev.data.transaction.reference))) || '');
    const f = /^SL-[2-9A-Z]{5}-/.test(ref) ? await findOrder(ref.slice(0, 8)) : null;
    if (f && f.order.paid && f.order.paid.ref === ref) { const o = f.order, ok = ev.event === 'refund.processed';
      o.refund = { ...(o.refund || {}), status: ok ? 'processed' : 'failed', doneAt: Date.now(), amount: (ev.data.amount || 0) / 100 || (o.refund || {}).amount };
      if (ok) o.status = 'refunded'; (o.history ||= []).push({ s: ok ? 'refunded' : 'refund-failed', at: Date.now(), by: 'Paystack' }); await saveOrder(f.dir, o); } }
  return json(res, 200, { ok: true });
}
