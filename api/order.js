// POST /api/order : a customer places an order. Saves it, alerts the shop on WhatsApp, returns the order id.
import { put } from '@vercel/blob';
import { json, newId, secret, saveOrder, notifyOwner, SITE } from './_lib.js';

const img = (d, max) => { if (typeof d !== 'string' || !d.startsWith('data:image/jpeg;base64,')) return null; const b = Buffer.from(d.slice(23), 'base64'); return b.length && b.length <= max ? b : null; };
const str = (s, n) => String(s ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const b = req.body || {};
  const name = str(b.name, 60), phone = str(b.phone, 20).replace(/[^\d+]/g, ''), loc = str(b.loc, 80), note = str(b.note, 300);
  if (!name || phone.replace(/\D/g, '').length < 9) return json(res, 400, { error: 'Name and a WhatsApp number are needed' });
  const packs = Array.isArray(b.packs) ? b.packs.slice(0, 40).map(p => ({ key: str(p.key, 60), label: str(p.label, 80), size: str(p.size, 4), n: +p.n || 0, q: Math.min(20, +p.q || 1), price: +p.price || 0 })) : [];
  const singles = Array.isArray(b.singles) ? b.singles.slice(0, 300).map(s => ({ code: str(s.code, 12), q: Math.min(99, +s.q || 1), pack: str(s.pack, 60) })) : [];
  const d = b.design && typeof b.design === 'object' ? b.design : null;
  if (!packs.length && !singles.length && !d) return json(res, 400, { error: 'The cart is empty' });
  const id = newId(), dir = `orders/${id}-${secret()}`;
  const design = d ? { line: str(d.line, 300), laptop: str(d.laptop, 80), packName: str(d.packName, 60), size: str(d.size, 4), n: +d.n || 0, skins: Array.isArray(d.skins) ? d.skins.slice(0, 3).map(x => str(x, 40)) : [],
    layout: Array.isArray(d.layout) ? d.layout.slice(0, 300) : [], scaled: !!d.scaled, raw: d.raw && typeof d.raw === 'object' ? d.raw : null } : null;
  if (design) {
    const sh = img(d.sheet, 3e6), mk = img(d.mock, 1e6);
    if (sh) design.sheet = (await put(`${dir}/sheet.jpg`, sh, { access: 'public', addRandomSuffix: false, contentType: 'image/jpeg' })).url;
    if (mk) design.mock = (await put(`${dir}/mock.jpg`, mk, { access: 'public', addRandomSuffix: false, contentType: 'image/jpeg' })).url;
  }
  const total = Math.max(0, Math.round(+b.total || 0));
  const order = { id, at: Date.now(), status: 'new', history: [{ s: 'new', at: Date.now() }], name, phone, loc, note, packs, singles, design, total, skinOnDM: !!(design && design.skins.length) };
  await saveOrder(dir, order);
  const what = [packs.length ? `${packs.reduce((a, p) => a + p.q, 0)} sheet(s)` : '', singles.length ? `${singles.reduce((a, s) => a + s.q, 0)} single sticker(s)` : '', design ? `custom ${design.size} pack (${design.n} stickers)` : ''].filter(Boolean).join(' + ');
  const alert = await notifyOwner(`🛒 New Skin Lab order ${id}\n${name} · +${phone.replace(/^\+/, '')}${loc ? ' · ' + loc : ''}\n${what}\nTotal GH₵${total}${order.skinOnDM ? ' + skin' : ''}\n${SITE}/admin/#${id}`);
  return json(res, 200, { id, url: `${SITE}/o/${id}/`, alert });
}
