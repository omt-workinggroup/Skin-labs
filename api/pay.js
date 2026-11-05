// GET /api/pay : are online payments on?   POST /api/pay {id} : start (or resume) the Paystack payment for an order.
// The amount is the order's server-priced total. A payment started in the last 10 minutes is reused, so a double tap never makes two.
import { json, findOrder, saveOrder, payOn, paystack, limited, SITE } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { enabled: payOn() });
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
  if (!payOn()) return json(res, 503, { error: 'Online payment is not switched on yet' });
  if (limited(req, 'pay', 40, 10 * 60e3)) return json(res, 429, { error: 'Too many tries. Wait a minute, then try again' });
  const f = await findOrder(String((req.body || {}).id || '').toUpperCase()); if (!f) return json(res, 404, { error: 'No such order' });
  const o = f.order;
  if (o.paid) return json(res, 200, { paid: true });
  if (['cancelled', 'refunded', 'refund-review'].includes(o.status)) return json(res, 400, { error: 'This order is closed. Chat with us if you still want it' });
  if (!(o.total > 0)) return json(res, 400, { error: 'Nothing to pay on this order' });
  const host = req.headers['x-forwarded-host'] || req.headers.host, base = host && /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${/^localhost|^127\./.test(host) ? 'http' : 'https'}://${host}` : SITE;
  const recent = (o.attempts || []).filter(a => a.url && a.amount === o.total && Date.now() - a.at < 10 * 60e3 && !['failed', 'abandoned'].includes(a.status)).pop();
  if (recent) return json(res, 200, { url: recent.url, ref: recent.ref, reused: true });
  try {
    const ref = `${o.id}-${Date.now().toString(36)}`;
    const t = await paystack('/transaction/initialize', { email: o.email || `${o.phone}@customers.skinlab.shop`, amount: Math.round(o.total * 100), currency: 'GHS',
      reference: ref, callback_url: `${base}/o/${o.id}/`, channels: ['mobile_money', 'card'],
      metadata: { order: o.id, custom_fields: [{ display_name: 'Order', variable_name: 'order', value: o.id }, { display_name: 'Name', variable_name: 'name', value: o.name }] } });
    (o.attempts ||= []).push({ ref, at: Date.now(), amount: o.total, status: 'initiated', url: t.authorization_url }); o.attempts = o.attempts.slice(-12);
    await saveOrder(f.dir, o);
    return json(res, 200, { url: t.authorization_url, ref });
  } catch (e) { return json(res, 502, { error: e.message || 'Paystack is not answering, try again' }); }
}
