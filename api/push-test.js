// POST /api/push-test : send a test notification to every phone that turned them on (admin only).
import { json, isAdmin, pushAll } from './_lib.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Wrong password' });
  const r = await pushAll({ title: 'Skin Lab · test', body: 'Notifications are on. New orders will show up like this.', url: '/admin/', tag: 'test' });
  return json(res, 200, { result: r });
}
