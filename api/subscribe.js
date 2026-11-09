// /api/subscribe : GET -> the public key; POST {sub} -> remember this phone; DELETE {endpoint} -> forget it (any staff login; the printer's phone only gets price-free alerts).
import { put, list, del } from '@vercel/blob';
import { json, role } from './_lib.js';
import { createHash } from 'crypto';

export default async function handler(req, res) {
  const who = role(req); if (!who) return json(res, 401, { error: 'Wrong password' });
  if (req.method === 'GET') return json(res, 200, { publicKey: process.env.VAPID_PUBLIC || '' });
  if (req.method === 'DELETE') {   // this phone turned notifications off
    const ep = String((req.body || {}).endpoint || ''); if (!ep) return json(res, 400, { error: 'No endpoint' });
    const id = createHash('sha256').update(ep).digest('hex').slice(0, 20), { blobs } = await list({ prefix: `push/${id}` });
    if (blobs.length) await del(blobs.map(b => b.url)); return json(res, 200, { ok: true });
  }
  const sub = (req.body || {}).sub;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) return json(res, 400, { error: 'No subscription' });
  const id = createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 20);
  await put(`push/${id}.json`, JSON.stringify({ ...sub, role: who }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  return json(res, 200, { ok: true });
}
