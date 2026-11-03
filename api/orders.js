// GET /api/orders : every order, newest first (admin only).
import { list } from '@vercel/blob';
import { json, isAdmin, latest } from './_lib.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  let blobs = [], cursor;
  do { const r = await list({ prefix: 'orders/', cursor, limit: 1000 }); blobs = blobs.concat(r.blobs); cursor = r.hasMore ? r.cursor : null; } while (cursor);
  const byDir = {}; for (const b of blobs) { const d = b.pathname.slice(0, b.pathname.lastIndexOf('/')); (byDir[d] ||= []).push(b); }
  const js = Object.values(byDir).map(latest).filter(Boolean).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 300);
  const orders = (await Promise.all(js.map(b => fetch(b.url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)))).filter(Boolean);
  orders.sort((a, b) => b.at - a.at);
  return json(res, 200, { orders, alerts: process.env.CALLMEBOT_KEY ? 'on' : 'off', push: !!process.env.VAPID_PUBLIC });
}
