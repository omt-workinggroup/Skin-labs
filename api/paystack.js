// POST /api/paystack : Paystack's webhook (set this URL in Paystack > Settings > API Keys & Webhooks).
// The signature is checked, then the payment is double-checked with Paystack itself before the order is marked paid.
import crypto from 'node:crypto';
import { json, confirmPayment } from './_lib.js';

export const config = { api: { bodyParser: false } };
const raw = req => new Promise((ok, no) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const key = process.env.PAYSTACK_SECRET_KEY; if (!key) return json(res, 503, { error: 'off' });
  let body = req.readableEnded || req.body !== undefined && typeof req.body === 'object' && Object.keys(req.body).length ? Buffer.alloc(0) : await Promise.race([raw(req), new Promise(r => setTimeout(() => r(Buffer.alloc(0)), 5000))]).catch(() => Buffer.alloc(0));
  if (!body.length && req.body) body = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const sig = crypto.createHmac('sha512', key).update(body).digest('hex');
  if (sig !== req.headers['x-paystack-signature']) return json(res, 401, { error: 'bad signature' });
  let ev = {}; try { ev = JSON.parse(body.toString()); } catch (e) {}
  if (ev.event === 'charge.success') await confirmPayment(ev.data && ev.data.reference).catch(() => null);
  return json(res, 200, { ok: true });
}
