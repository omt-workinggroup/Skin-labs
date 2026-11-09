// /api/catalog : the sticker packs the shop owner adds from /admin (shown live in the shop and the designer).
// GET (public) -> { packs: [...] }. POST (admin) {action}: add | sheet | del-sticker | del-pack.
import { put, list, del } from '@vercel/blob';
import { json, isAdmin, latest, limited } from './_lib.js';

const CATS = ['xl', 'mix', 'programmers', 'gaming', 'football', 'anime', 'cartoons', 'streetwear', 'quotes', 'girly', 'marvel', 'sneakers', 'cars', 'moto', 'dark'];
async function load() {
  const { blobs } = await list({ prefix: 'catalog/' }); const j = latest(blobs.map(b => ({ ...b, pathname: b.pathname.replace(/catalog-/, 'order-') })));
  if (!j) return { packs: [], next: 1 };
  const r = await fetch(j.url, { cache: 'no-store' }); return r.ok ? r.json() : { packs: [], next: 1 };
}
async function save(cat) {
  const { blobs } = await list({ prefix: 'catalog/' });
  const r = await put(`catalog/catalog-${Date.now()}.json`, JSON.stringify(cat), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });
  if (blobs.length) await del(blobs.map(b => b.url)).catch(() => {});
  return r;
}
const dataImg = (d, max) => { const m = /^data:image\/(png|webp|jpeg);base64,/.exec(d || ''); if (!m) return null; const b = Buffer.from(d.slice(m[0].length), 'base64'); return b.length && b.length <= max ? { b, ext: m[1] === 'jpeg' ? 'jpg' : m[1], type: 'image/' + m[1] } : null; };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'pack';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const c = await load(); res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20, stale-while-revalidate=300');
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ packs: c.packs.filter(p => p.items.length) }));
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
  if (!isAdmin(req)) return (limited(req, 'login-fail', 8, 15 * 60e3) ? json(res, 429, { error: 'Too many wrong passwords. Wait 15 minutes and try again' }) : json(res, 401, { error: 'Wrong password' }));
  const b = req.body || {}, cat = await load();
  if (b.action === 'add') {
    let p = b.packId && cat.packs.find(x => x.id === b.packId);
    if (!p) { const name = String(b.name || '').trim().slice(0, 40); if (!name) return json(res, 400, { error: 'Give the pack a name' });
      if (!CATS.includes(b.cat)) return json(res, 400, { error: 'Pick a category' });
      p = { id: `drop-${slug(name)}-${Date.now().toString(36).slice(-4)}`, name, cat: b.cat, tag: String(b.tag || '').slice(0, 60), bg: /^#[0-9a-f]{6}$/i.test(b.bg) ? b.bg : '#111111', at: Date.now(), items: [] }; cat.packs.unshift(p); }
    const big = dataImg(b.img, 4e6), small = dataImg(b.small, 6e5); if (!big || !small) return json(res, 400, { error: 'Picture missing or too big' });
    const code = `DRP-${String(cat.next || 1).padStart(3, '0')}`; cat.next = (cat.next || 1) + 1;
    const u1 = await put(`stickers/${code}.${big.ext}`, big.b, { access: 'public', addRandomSuffix: true, contentType: big.type });
    const u2 = await put(`stickers/${code}-s.${small.ext}`, small.b, { access: 'public', addRandomSuffix: true, contentType: small.type });
    p.items.push({ code, url: u1.url, small: u2.url, w: Math.max(1, +b.w || 1), h: Math.max(1, +b.h || 1), name: String(b.label || '').slice(0, 40), at: Date.now() });
    await save(cat); return json(res, 200, { ok: true, code, pack: p });
  }
  if (b.action === 'sheet') {
    const p = cat.packs.find(x => x.id === b.packId); if (!p) return json(res, 404, { error: 'No such pack' });
    const im = dataImg(b.img, 3e6); if (!im) return json(res, 400, { error: 'No sheet picture' });
    const old = p.sheet; p.sheet = (await put(`drops/${p.id}.${im.ext}`, im.b, { access: 'public', addRandomSuffix: true, contentType: im.type })).url; p.sw = +b.w || 1000; p.sh = +b.h || 1414;
    await save(cat); if (old) await del(old).catch(() => {}); return json(res, 200, { ok: true, pack: p });
  }
  if (b.action === 'del-sticker') {
    for (const p of cat.packs) { const i = p.items.findIndex(s => s.code === b.code); if (i >= 0) { const [s] = p.items.splice(i, 1); await del([s.url, s.small]).catch(() => {}); } }
    await save(cat); return json(res, 200, { ok: true, packs: cat.packs });
  }
  if (b.action === 'del-pack') {
    const i = cat.packs.findIndex(x => x.id === b.packId); if (i < 0) return json(res, 404, { error: 'No such pack' });
    const [p] = cat.packs.splice(i, 1); await del([...p.items.flatMap(s => [s.url, s.small]), ...(p.sheet ? [p.sheet] : [])]).catch(() => {});
    await save(cat); return json(res, 200, { ok: true, packs: cat.packs });
  }
  if (b.action === 'list') return json(res, 200, { packs: cat.packs });
  return json(res, 400, { error: 'Unknown action' });
}
