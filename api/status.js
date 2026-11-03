// POST /api/status {id, status} : move an order along (admin only). The customer sees it on their order page.
import { json, isAdmin, findOrder, saveOrder, STATUSES } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  const { id, status } = req.body || {};
  if (!STATUSES.includes(status)) return json(res, 400, { error: 'Unknown status' });
  const f = await findOrder(id); if (!f) return json(res, 404, { error: 'No such order' });
  f.order.status = status; (f.order.history ||= []).push({ s: status, at: Date.now() });
  await saveOrder(f.dir, f.order);
  return json(res, 200, { ok: true, order: f.order });
}
