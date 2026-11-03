// POST /api/delete {id} : remove a test or spam order and its pictures (admin only).
import { list, del } from '@vercel/blob';
import { json, isAdmin } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  const id = String((req.body || {}).id || '');
  if (!/^SL-[2-9A-Z]{5}$/.test(id)) return json(res, 400, { error: 'Bad id' });
  const { blobs } = await list({ prefix: `orders/${id}-` });
  if (!blobs.length) return json(res, 404, { error: 'No such order' });
  await del(blobs.map(b => b.url));
  return json(res, 200, { ok: true, removed: blobs.length });
}
