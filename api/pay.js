// GET /api/pay : are online payments on?   POST /api/pay {id} : start a Paystack payment for an order, returns the checkout link.
import { json, findOrder, payOn, paystack, SITE } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { enabled: payOn() });
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
  if (!payOn()) return json(res, 503, { error: 'Online payment is not switched on yet' });
  const f = await findOrder(String((req.body || {}).id || '').toUpperCase()); if (!f) return json(res, 404, { error: 'No such order' });
  const o = f.order;
  if (o.paid) return json(res, 200, { paid: true });
  if (o.status === 'cancelled') return json(res, 400, { error: 'This order was cancelled' });
  if (!(o.total > 0)) return json(res, 400, { error: 'Nothing to pay on this order' });
  const host = req.headers['x-forwarded-host'] || req.headers.host, base = host && /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${/^localhost|^127\./.test(host) ? 'http' : 'https'}://${host}` : SITE;
  try {
    const t = await paystack('/transaction/initialize', { email: o.email || `${o.phone}@customers.skinlab.shop`, amount: Math.round(o.total * 100), currency: 'GHS',
      reference: `${o.id}-${Date.now().toString(36)}`, callback_url: `${base}/o/${o.id}/`, channels: ['mobile_money', 'card'],
      metadata: { order: o.id, custom_fields: [{ display_name: 'Order', variable_name: 'order', value: o.id }, { display_name: 'Name', variable_name: 'name', value: o.name }] } });
    return json(res, 200, { url: t.authorization_url });
  } catch (e) { return json(res, 502, { error: e.message || 'Paystack is not answering, try again' }); }
}
