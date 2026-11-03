// /api/subscribe : GET -> the public key; POST {sub} -> remember this phone for new-order notifications (admin only).
import { put } from '@vercel/blob';
import { json, isAdmin } from './_lib.js';
import { createHash } from 'crypto';

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  if (req.method === 'GET') return json(res, 200, { publicKey: process.env.VAPID_PUBLIC || '' });
  const sub = (req.body || {}).sub;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) return json(res, 400, { error: 'No subscription' });
  const id = createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 20);
  await put(`push/${id}.json`, JSON.stringify(sub), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  return json(res, 200, { ok: true });
}
