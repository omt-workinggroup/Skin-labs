(() => {
const WA = '233558362423', PRICE = 3, CUR = 'GH₵', SITE = 'https://skin-labs.vercel.app/';
const D = window.SL, $ = s => document.querySelector(s), app = $('#app');
const framed = (() => { try { return window.top !== window; } catch (e) { return true; } })();
const base = framed ? SITE : location.origin + location.pathname;
const PK = {}, CAT = {}, CODE = {};
D.cats.forEach(c => CAT[c.id] = c);
const KEEP = new Set(['GTA', 'COD', 'AI', 'JDM', 'II', 'III', 'I', 'Y2K']);
const nice = s => s.split(' ').map(w => KEEP.has(w) ? w : w === '&' ? '&' : w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
D.packs.forEach(p => { p.nice = nice(p.name); PK[p.id] = p; p.items.forEach(it => { if (!CODE[it[0]]) CODE[it[0]] = { p, it }; }); });
// ---------- shop drops: packs added in /admin, loaded live (no rebuild needed) ----------
function addDrops(cat) { if (!cat || !Array.isArray(cat.packs)) return 0; let n = 0;
  for (const d of [...cat.packs].reverse()) { if (PK[d.id] || !d.items || !d.items.length || !CAT[d.cat]) continue;
    const items = d.items.map(s => [s.code, 0, 0, s.w, s.h, s.small || s.url, s.url]);
    const p = { id: d.id, cat: d.cat, name: String(d.name).toUpperCase(), tag: d.tag || 'fresh from the shop', bg: d.bg || '#111111', fg: '#ffffff', aw: 1, ah: 1, items, drop: 1, new: 1,
      size: 'A4', price: 60, p5: 30, a5: items.slice(0, 14).map(i => i[0]), sheet: d.sheet || items[0][6], sw: d.sw || 1000, sh: d.sh || 1414, sw5: d.sw || 1000, sh5: d.sh || 1414 };
    p.nice = typeof nice === 'function' ? nice(p.name) : d.name; PK[p.id] = p; D.packs.push(p); items.forEach(it => { if (!CODE[it[0]]) CODE[it[0]] = { p, it }; }); CAT[d.cat].packs.unshift(p.id); n++; }
  return n; }
const sh = (id, dir) => { if (String(id).startsWith('skin:')) return `skins/${String(id).slice(5)}-s.${IX}`; const p = PK[String(id).replace(/-a5$/, '')]; return p && p.drop ? p.sheet : `${dir}/${id}.${IX}`; };
try { addDrops(JSON.parse(localStorage.getItem('sl-drops') || 'null')); } catch (e) {}
const total = Object.keys(CODE).length;
const light = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const waIcon = '<svg class="wa-i"><use href="#wa"/></svg>';
function spr(p, it, box, extra = '') {
  const [, x, y, w, h] = it, s = box / Math.max(w, h);
  if (it[5]) return `<span class="s" style="display:block;width:${w * s}px;height:${h * s}px;background:url('${it[5]}') center/contain no-repeat;${extra}"></span>`;
  return `<span class="s" style="display:block;width:${w * s}px;height:${h * s}px;background:url(atlas/${p.id}.${IX}) ${-x * s}px ${-y * s}px/${p.aw * s}px ${p.ah * s}px no-repeat;${extra}"></span>`;
}
const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

// ---------- cart: packs { packId: qty } + singles { code: qty } ----------
let cart = {}, packs = {};
const old = store.get('sl-sel', null); if (Array.isArray(old)) old.forEach(c => cart[c] = 1);
Object.assign(cart, store.get('sl-cart', {})); Object.assign(packs, store.get('sl-packs', {}));
Object.keys(cart).forEach(c => { if (!CODE[c] || !(cart[c] > 0)) delete cart[c]; });
// a pack in the cart: "<id>" is the big sheet (A4, or the A3 pick & mix), "<id>~5" the small A5 sheet
const SZ = { A3: 'A3 pick & mix', A4: 'A4 big sheet', A5: 'A5 small sheet', XL: 'XL lid centrepiece', S: 'Small skin', M: 'Medium skin', L: 'Large skin', C: 'Custom skin' };
// laptop skins: priced by size (change the numbers here)
const SKINP = { S: { name: 'Small', fit: 'up to 13.3″', price: 70 }, M: { name: 'Medium', fit: '14″ – 15.6″', price: 80 }, L: { name: 'Large', fit: '16″ – 17.3″', price: 90 }, C: { name: 'Custom', fit: 'full wrap or your own picture', price: 120 } };
const skinFor = inch => !inch ? 'M' : inch <= 13.5 ? 'S' : inch <= 15.7 ? 'M' : 'L';
function pkOf(k) { if (String(k).startsWith('skin~')) { const [, id, z] = String(k).split('~'), sk = SKIN[id], t = SKINP[z]; if (!sk || !t) return null;
    return { k, id, skin: 1, p: { nice: `${sk[1]} skin`, bg: '#111' }, a5: false, size: z, price: t.price, n: 0, img: 'skin:' + id, label: `${sk[1]} skin · ${t.name}`, fit: t.fit }; }
  const [id, s5] = String(k).split('~'), p = PK[id]; if (!p) return null; const a5 = s5 === '5' && !!p.a5;
  const size = a5 ? 'A5' : p.size || 'A4';
  return { k, id, p, a5, size, price: a5 ? p.p5 : p.price, n: a5 ? p.a5.length : p.items.length, img: a5 ? id + '-a5' : id, label: `${p.nice} · ${SZ[size]}` }; }
Object.keys(packs).forEach(k => { if (!(packs[k] > 0) || (!String(k).startsWith('skin~') && !pkOf(k))) delete packs[k]; });   // skins are checked once the skin list is loaded
let who = store.get('sl-who', { name: '', loc: '', note: '' });
const saveCart = () => { store.set('sl-cart', cart); store.set('sl-packs', packs); };
const nSingles = () => Object.values(cart).reduce((a, b) => a + b, 0);
const nPacks = () => Object.values(packs).reduce((a, b) => a + b, 0);
function curDsg() { const d = store.get('sl-dsg', null); if (!d || !(d.lap || d.v === 3) || !d.items) return null;
  return Object.values(d.items).some(v => v.length) || Object.values(d.skin || {}).some(Boolean) ? d : null; }
const dsgSkins = () => { const d = curDsg(); return d ? Object.values(d.skin).filter(Boolean).length : 0; };
const count = () => nSingles() + nPacks() + (curDsg() ? 1 : 0);
const money = () => nSingles() * PRICE + Object.entries(packs).reduce((a, [k, q]) => a + q * pkOf(k).price, 0) + dsgPrice(curDsg());
const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
function toggle(code) { if (cart[code]) delete cart[code]; else cart[code] = 1; buzz(); saveCart(); updBar(); }
function setQty(code, q) { if (q <= 0) delete cart[code]; else cart[code] = Math.min(q, 99); saveCart(); updBar(); }
function setPack(id, q) { if (q <= 0) delete packs[id]; else packs[id] = Math.min(q, 20); saveCart(); updBar(); }
const PIDX = id => D.packs.findIndex(p => p.id === id);
// packs inside order links: new links name the pack ("id" or "id~5"); links sent before Nov 2026 used a number from the old list
const pkFromLink = v => typeof v === 'number' ? (D.legacy || [])[v] || (D.packs[v] || {}).id : v;
// ---------- private order links ----------
// The order is locked with the shop's public key on the customer's phone. Only a phone that has been
// unlocked with the shop's private key (one-time #unlock- link) can read it; everyone else sees a notice.
const OWNER_PUB = 'BFoOJrRVsbKU6qy276X0IWWb2MobWw7SFghu_sEkAAnR9tekj9eD5RUsoaJZqPWby-beRpmfu-J-4caiCo91vtQ';
const b64u = { enc: u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) };
const ECDH = { name: 'ECDH', namedCurve: 'P-256' }, isOwner = () => !!store.get('sl-owner', null);
async function aesFrom(priv, pub) { const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', bits), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function sealOrder(o) {
  const eph = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']), own = await crypto.subtle.importKey('raw', b64u.dec(OWNER_PUB), ECDH, false, []);
  const key = await aesFrom(eph.privateKey, own), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(o))));
  const ep = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey)), all = new Uint8Array(77 + ct.length);
  all.set(ep); all.set(iv, 65); all.set(ct, 77); return b64u.enc(all);
}
const ownerJwk = d => { const r = b64u.dec(OWNER_PUB); return { kty: 'EC', crv: 'P-256', d, x: b64u.enc(r.slice(1, 33)), y: b64u.enc(r.slice(33, 65)), ext: true }; };
async function openSealed(s) {
  const all = b64u.dec(s), priv = await crypto.subtle.importKey('jwk', ownerJwk(store.get('sl-owner', '')), ECDH, false, ['deriveBits']);
  const key = await aesFrom(priv, await crypto.subtle.importKey('raw', all.slice(0, 65), ECDH, false, []));
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(65, 77) }, key, all.slice(77))));
}
// ---------- order links you and the customer can both open ----------
// The order travels inside the link itself (after the #, which browsers never send to any server).
const zip = async (txt, how) => { const st = new Blob([txt]).stream().pipeThrough(new (how ? CompressionStream : DecompressionStream)('deflate-raw')); return new Uint8Array(await new Response(st).arrayBuffer()); };
async function packOrder(o) { const j = JSON.stringify(o);
  try { if (window.CompressionStream) return 'z' + b64u.enc(await zip(j, 1)); } catch (e) {}
  return 'j' + b64u.enc(new TextEncoder().encode(j)); }
async function unpackOrder(s) { const b = b64u.dec(s.slice(1));
  if (s[0] === 'z') return JSON.parse(new TextDecoder().decode(await zip(b, 0)));
  return JSON.parse(new TextDecoder().decode(b)); }
async function orderRef(s) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return 'SL-' + [...h.slice(0, 5)].map(b => A[b & 31]).join(''); }
async function sealedText(pk, items, noDsg = false) {
  try { const s = await packOrder({ n: who.name, l: who.loc, m: who.note, p: pk.map(([k, q]) => [k, q]), s: items, d: noDsg ? null : dsgPack(curDsg()), t: Date.now() });
    const ref = await orderRef(s); store.set('sl-orders', [{ ref, s, at: Date.now() }, ...store.get('sl-orders', []).filter(x => x.ref !== ref)].slice(0, 20));
    return orderText(pk, items, { link: base + '#v-' + s, ref }, noDsg ? null : curDsg()); }
  catch (e) { return orderText(pk, items); }
}
function orderText(pk, items, lk = null, dg = curDsg()) {
  let t = `🛒 *New order*\nHello Skin Lab, I'd like to order:\n`, i = 0, tot = 0;
  if (pk.length) { t += `\n*Sticker sheets*\n` + pk.map(([k, q]) => { const o = pkOf(k); tot += q * o.price; return `${++i}. ${o.p.nice}, ${SZ[o.size]} (${o.n} stickers) x${q} = ${CUR}${q * o.price}`; }).join('\n') + '\n'; }
  if (items.length) { const n = items.reduce((a, [, q]) => a + q, 0); tot += n * PRICE;
    t += `\n*My own picks* (${CUR}${PRICE} each)\n` + items.map(([c, q]) => `${++i}. ${c} (${CODE[c].p.nice}) x${q} = ${CUR}${q * PRICE}`).join('\n') + '\n'; }
  if (dg) { t += `\n*My laptop design*\n${dsgLine(dg)}\n`; if (Object.values(dg.skin).some(Boolean)) t += `Please send me the price for the skin.\n`; }
  t += `\n*Total: ${CUR}${tot}*${dg && Object.values(dg.skin).some(Boolean) ? ' (stickers only, skin price on DM)' : ''}\n`;
  if (who.name) t += `\nName: ${who.name}`;
  if (who.loc) t += `\nLocation: ${who.loc}`;
  if (who.note) t += `\nNote: ${who.note}`;
  if (!lk) return lk === false ? t + `\n\nOrder SL-•••••\nSee the order with pictures and prices: ${SITE}#v-••••••` : t;
  return t + `\n\nOrder ${lk.ref}\nSee the order with pictures and prices: ${lk.link}`;
}
const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
function updBar() {
  const n = count(), np = nPacks(), ns = nSingles();
  $('#bar-n').textContent = n;
  const sk = Object.entries(packs).reduce((t, [k, q]) => t + (String(k).startsWith('skin~') ? q : 0), 0), nk = dsgSkins() + sk; $('#bar-t').textContent = [np - sk ? `${np - sk} pack${np - sk > 1 ? 's' : ''}` : '', ns ? `${ns} sticker${ns > 1 ? 's' : ''}` : '', curDsg() ? 'your pack' : '', nk ? `${nk} skin${nk > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ') + ' in your cart';
  $('#bar-p').textContent = priceTxt(money(), !!nk);
  $('#bar').classList.toggle('show', n > 0);
  for (const id of ['#t-bd', '#nv-bd']) { $(id).hidden = !n; $(id).textContent = n; }
  document.querySelectorAll('.grid .tile[data-c]').forEach(t => { const q = cart[t.dataset.c]; t.classList.toggle('sel', !!q); const k = t.querySelector('.chk'); if (k) k.textContent = q > 1 ? q : '✓'; });
  document.querySelectorAll('[data-packbtn]').forEach(b => { const q = packs[b.dataset.packbtn]; b.innerHTML = q ? `In your cart (${q}) · add one more` : `Add to cart, keep shopping`; });
  const go = $('#bar-go'); if (go) go.innerHTML = `Checkout`;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Order copied'); } catch (e) { toast('Could not copy. Long-press to select instead.'); } }
const closeSheets = () => { document.querySelectorAll('.sheet').forEach(s => s.hidden = true); $('#lb').hidden = true; };
document.querySelectorAll('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) s.hidden = true; }));

// WhatsApp-style preview of the exact message we will receive
const waFmt = t => esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(https?:\/\/\S+)/g, '<u>$1</u>').replace(/\n/g, '<br>');
// ---------- cart + checkout: the order goes straight to the Skin Lab admin (no long WhatsApp text) ----------
// skins have no price on the site: they are always "price on DM"
const priceTxt = t => `${CUR}${t}`;
const dsgPrice = d => d ? Object.values(d.items || {}).flat().length * PRICE + (Object.values(d.skin || {}).some(Boolean) ? SKINP[d.skinSize || 'M'].price : 0) : 0;
// ---------- singles sheet: the single stickers a customer picks, laid out on the Skin Lab template ----------
const PICK_CM = 5.5;   // long side of each single sticker on the sheet
const stickerSrc = c => (CODE[c] && CODE[c].it[6]) || `hd/${c}.avif`;
const pickImg = c => new Promise(ok => { const i = new Image(); if (/^https?:/.test(stickerSrc(c))) i.crossOrigin = 'anonymous'; i.onload = () => ok({ im: i, sx: 0, sy: 0, sw: i.width, sh: i.height });
  i.onerror = () => { const { p, it } = CODE[c], a = new Image(); a.onload = () => ok({ im: a, sx: it[1], sy: it[2], sw: it[3], sh: it[4] }); a.onerror = () => ok(null); a.src = `atlas/${p.id}.${IX}`; }; i.src = stickerSrc(c); });
function packSingles(list) {   // list [{c,w,h}] mm -> smallest sheet (A5, A4, A3) that holds them at real size
  const fit = (W, H, k) => { const x0 = 7, y0 = W * .15 + 7, x1 = W - 7, y1 = H - 11, g = 2.4; let x = x0, y = y0, row = 0; const out = [];
    for (const t of [...list].sort((a, b) => b.h - a.h)) { const w = t.w * k, h = t.h * k; if (x + w > x1) { x = x0; y += row + g; row = 0; } if (y + h > y1) return null; out.push({ c: t.c, x, y, w, h }); x += w + g; row = Math.max(row, h); }
    const rows = {}; out.forEach(o => (rows[o.y] ||= []).push(o)); Object.values(rows).forEach(r => { const dx = (x1 - Math.max(...r.map(o => o.x + o.w))) / 2; r.forEach(o => o.x += dx); });
    const dy = (y1 - Math.max(...out.map(o => o.y + o.h))) / 2; out.forEach(o => { o.y += Math.min(dy, 30); }); return out; };
  for (const [n, W, H] of [['A5', 148, 210], ['A4', 210, 297], ['A3', 297, 420]]) { const r = fit(W, H, 1); if (r) return { size: n, W, H, items: r, scaled: false }; }
  for (let k = .95; k > .2; k -= .05) { const r = fit(297, 420, k); if (r) return { size: 'A3', W: 297, H: 420, items: r, scaled: true }; } return null; }
let picksCache = { key: '', res: null };
async function singlesSheet(name) {
  const entries = Object.entries(cart).filter(([c]) => CODE[c]), key = JSON.stringify(entries) + '|' + name + '|' + IX; if (!entries.length) return null;
  if (picksCache.key === key) return picksCache.res;
  const codes = entries.flatMap(([c, q]) => Array(Math.min(q, 30)).fill(c)), ims = {};
  await Promise.all([...new Set(codes)].map(c => pickImg(c).then(r => ims[c] = r)));
  const list = codes.map(c => { const r = ims[c], a = r ? r.sw / r.sh : CODE[c].it[3] / CODE[c].it[4], L = PICK_CM * 10; return { c, w: a >= 1 ? L : L * a, h: a >= 1 ? L / a : L }; });
  const lay = packSingles(list); if (!lay) return null;
  const PX = 1240, k = PX / lay.W, cv = document.createElement('canvas'); cv.width = PX; cv.height = Math.round(lay.H * k);
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, hd = lay.W * .15 * k, m = W * .04;
  g.fillStyle = '#efefef'; g.fillRect(0, 0, W, H); g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, hd);
  g.strokeStyle = '#fff'; g.lineWidth = W * .004; g.beginPath(); g.roundRect(m, hd * .17, W - 2 * m, hd * .66, hd * .14); g.stroke();
  g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = `800 ${hd * .26}px Geist, Arial, sans-serif`; g.fillText('SKIN', m * 1.6, hd * .44); const sw = g.measureText('SKIN ').width;
  g.fillStyle = '#FFD21F'; g.fillText('LAB', m * 1.6 + sw, hd * .44); g.fillStyle = '#bbb'; g.font = `italic 400 ${hd * .1}px Georgia, serif`; g.fillText('by Baiden Creatives', m * 1.6, hd * .64);
  const tx = W * .36; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(tx - W * .025, hd * .27, 2, hd * .46);
  g.fillStyle = '#fff'; g.font = `800 ${hd * .17}px Geist, Arial, sans-serif`; let t = (name ? `${name.split(' ')[0]}'s picks` : 'My picks').toUpperCase(); while (g.measureText(t).width > W - tx - m * 1.6 && t.length > 4) t = t.slice(0, -2) + '…'; g.fillText(t, tx, hd * .38);
  g.font = `500 ${hd * .085}px Geist, Arial, sans-serif`; g.fillStyle = '#cfcfcf'; g.fillText('single stickers, picked by you', tx, hd * .55);
  let cx = tx; g.font = `700 ${hd * .07}px Geist, Arial, sans-serif`;
  for (const c of [`${codes.length} STICKERS`, `${lay.size} SHEET`, 'PEEL • STICK • FLEX']) { const w = g.measureText(c).width + hd * .14; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.roundRect(cx, hd * .63, w, hd * .13, hd * .065); g.stroke(); g.fillStyle = '#fff'; g.fillText(c, cx + hd * .07, hd * .698); cx += w + hd * .05; }
  g.imageSmoothingQuality = 'high';
  for (const o of lay.items) { const r = ims[o.c]; if (r) g.drawImage(r.im, r.sx, r.sy, r.sw, r.sh, o.x * k, o.y * k, o.w * k, o.h * k); }
  g.fillStyle = '#111'; g.font = `700 ${W * .014}px Geist, Arial, sans-serif`; g.fillText('SKIN LAB', m, H - W * .022); g.textAlign = 'right'; g.fillStyle = '#555'; g.font = `500 ${W * .011}px Geist, Arial, sans-serif`;
  g.fillText(`${lay.size} · ${lay.scaled ? 'scaled to fit A3' : 'real size'} · printed in Accra`, W - m, H - W * .022); g.textAlign = 'left';
  let img; try { img = cv.toDataURL('image/jpeg', .86); } catch (e) { img = null; }
  const res = img && { img, size: lay.size, n: codes.length, scaled: lay.scaled, layout: lay.items.map(o => ({ c: o.c, x: +o.x.toFixed(1), y: +o.y.toFixed(1), w: +o.w.toFixed(1), h: +o.h.toFixed(1) })) };
  picksCache = { key, res }; return res;
}
function openCart(focus) {
  const items = Object.entries(cart), pk = Object.entries(packs), b = $('#c-body'), dg = curDsg();
  if (!items.length && !pk.length && !dg) {
    b.innerHTML = `<div class="empty-c"><b>Your cart is empty</b>Pick a pack, or design your laptop.</div><a class="btn y" href="#" id="c-go">Choose a category</a>`;
    $('#c-go').onclick = () => $('#cart').hidden = true; $('#cart').hidden = false; return;
  }
  const dn = dg ? Object.values(dg.items || {}).flat().length : 0;
  b.innerHTML = `${dg ? `<div class="mypk">${dg.sheet ? `<button type="button" class="mys" id="c-sheet" aria-label="See your sheet bigger"><img src="${dg.sheet}" alt="Your sticker sheet"></button>` : ''}
      <div class="myt">${dg.thumb ? `<img src="${dg.thumb}" alt="Your laptop design">` : ''}<span class="lbl">Your own pack</span><b>${esc(dg.packName || 'Your laptop design')}</b>
        <span>${dg.sheetSize ? `${dg.sheetSize} sheet · ` : ''}${dn} sticker${dn === 1 ? '' : 's'}${dsgSkins() ? ` · ${SKINP[dg.skinSize || 'M'].name} skin` : ''}</span><span class="pr">${CUR}${dsgPrice(dg)}</span>
        <span class="dl"><a href="/design/" id="c-edit">Edit</a><button type="button" class="lnk" id="c-rmd">Remove</button></span></div></div>` : ''}
    ${pk.length ? `<div class="rows">${pk.map(([k, q]) => `<div class="row"><div class="th"><img src="${sh(pkOf(k).img, 'sheets-sm')}" alt="" loading="lazy" style="height:54px;width:auto;border-radius:3px"></div><div class="nm"><b style="font-family:var(--body)">${esc(pkOf(k).p.nice)}</b><span>${pkOf(k).skin ? `${SZ[pkOf(k).size]} · ${pkOf(k).fit}` : `${SZ[pkOf(k).size]} · ${pkOf(k).n} stickers`} · ${CUR}${pkOf(k).price}</span></div>
      <div class="qty"><button type="button" data-p="${k}" data-d="-1" aria-label="One less ${esc(pkOf(k).label)}">−</button><span>${q}</span><button type="button" data-p="${k}" data-d="1" aria-label="One more ${esc(pkOf(k).label)}">+</button></div></div>`).join('')}</div>` : ''}
    ${items.length ? `<div class="mypk" id="c-picks"><button type="button" class="mys" id="c-psheet" aria-label="See your sheet bigger"><span class="lbl" style="display:grid;place-items:center;aspect-ratio:1/1.41;color:#888">Laying out…</span></button>
      <div class="myt"><span class="lbl">Your singles sheet</span><b>${esc(who.name ? who.name.split(' ')[0] + "'s picks" : 'My picks')}</b><span id="c-pinfo">${nSingles()} sticker${nSingles() === 1 ? '' : 's'} · ${PICK_CM} cm each</span><span class="pr">${CUR}${nSingles() * PRICE}</span></div></div>
      <div class="grp">Single stickers · ${CUR}${PRICE} each</div><div class="rows">${items.map(([c, q]) => `<div class="row"><div class="th">${spr(CODE[c].p, CODE[c].it, 50)}</div><div class="nm"><b>${c}</b><span>${esc(CODE[c].p.nice)}</span></div>
      <div class="qty"><button type="button" data-q="${c}" data-d="-1" aria-label="One less ${c}">−</button><span>${q}</span><button type="button" data-q="${c}" data-d="1" aria-label="One more ${c}">+</button></div></div>`).join('')}</div>` : ''}
    <div class="sum"><div class="big" style="border:0;padding:0;margin:0"><span>Total</span><span>${priceTxt(money(), dsgSkins())}</span></div><div class="small"><span>Pay with MoMo when we confirm · delivery agreed with you</span></div></div>
    <form class="ck" id="ck" novalidate>
      <div class="grp">Your details</div>
      <div class="fld" id="f-name"><label for="c-name">Name</label><input id="c-name" autocomplete="name" placeholder="e.g. Ama Mensah" value="${esc(who.name)}" required></div>
      <div class="fld" id="f-phone"><label for="c-phone">WhatsApp number</label><input id="c-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 024 123 4567" value="${esc(who.phone || '')}" required></div>
      <div class="fld"><label for="c-loc">Location</label><input id="c-loc" autocomplete="address-level2" placeholder="e.g. East Legon" value="${esc(who.loc)}"></div>
      <button class="btn y" type="submit" id="c-send">Place order${money() ? ` · ${CUR}${money()}` : ''}</button>
      <p class="small ckn">We'll message you on WhatsApp to confirm, then you pay with MoMo.</p>
    </form>
    <button class="btn o" type="button" id="c-clear">Empty cart</button>`;
  const keep = () => { who = { ...who, name: $('#c-name').value.trim(), phone: $('#c-phone').value.trim(), loc: $('#c-loc').value.trim() }; store.set('sl-who', who); };
  ['#c-name', '#c-phone', '#c-loc'].forEach(s => $(s).addEventListener('input', () => { keep(); $(s).closest('.fld').classList.remove('err'); }));
  b.onclick = e => { const k = e.target.closest('[data-q],[data-p]'); if (!k) return;
    if (k.dataset.q) setQty(k.dataset.q, (cart[k.dataset.q] || 0) + +k.dataset.d); else setPack(k.dataset.p, (packs[k.dataset.p] || 0) + +k.dataset.d); openCart(); };
  $('#ck').onsubmit = e => { e.preventDefault(); keep(); placeOrder(); };
  $('#c-clear').onclick = () => { cart = {}; packs = {}; store.set('sl-dsg', null); saveCart(); updBar(); openCart(); };
  if (dg) { $('#c-rmd').onclick = () => { store.set('sl-dsg', null); updBar(); openCart(); toast('Your pack was removed from the cart'); };
    if ($('#c-sheet')) $('#c-sheet').onclick = () => { $('#lb-img').src = dg.sheet; $('#lb').hidden = false; }; }
  if (items.length) singlesSheet(who.name).then(r => { const b = $('#c-psheet'); if (!b) return; if (!r) { $('#c-picks').hidden = true; return; }
    b.innerHTML = `<img src="${r.img}" alt="Your singles sheet">`; $('#c-pinfo').textContent = `${r.size} sheet · ${r.n} stickers${r.scaled ? ' · scaled to fit' : ' · real size'}`;
    b.onclick = () => { $('#lb-img').src = r.img; $('#lb').hidden = false; }; });
  $('#cart').hidden = false;
  if (focus) setTimeout(() => { const f = !who.name ? '#c-name' : !who.phone ? '#c-phone' : null; if (f) $(f).focus(); else $('#ck').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
}
const phoneOk = p => { const d = p.replace(/\D/g, ''); return d.length >= 9 && d.length <= 13; };
const phoneIntl = p => { let d = p.replace(/\D/g, ''); if (d.startsWith('0')) d = '233' + d.slice(1); else if (d.length === 9) d = '233' + d; return d; };
async function placeOrder() {
  const dg = curDsg(), pk = Object.entries(packs), items = Object.entries(cart);
  if (!who.name) { $('#f-name').classList.add('err'); $('#c-name').focus(); return toast('Add your name'); }
  if (!phoneOk(who.phone || '')) { $('#f-phone').classList.add('err'); $('#c-phone').focus(); return toast('Add your WhatsApp number'); }
  const btn = $('#c-send'); btn.disabled = true; btn.textContent = 'Sending your order…';
  const body = { name: who.name, phone: phoneIntl(who.phone), loc: who.loc, total: money(),
    packs: pk.map(([k, q]) => { const o = pkOf(k); return { key: k, label: o.skin ? `${o.label} (${o.fit})` : `${o.p.nice} · ${SZ[o.size]}`, size: o.size, n: o.n, q, price: o.price }; }),
    singles: items.map(([c, q]) => ({ code: c, q, pack: CODE[c].p.nice, img: new URL(stickerSrc(c), location.href).href })),
    picks: items.length ? await singlesSheet(who.name).then(r => r && { sheet: r.img, size: r.size, n: r.n, scaled: r.scaled, layout: r.layout }).catch(() => null) : null,
    design: dg ? { line: dsgLine(dg), laptop: dg.laptop || dg.name, packName: dg.packName, size: dg.sheetSize || '', n: Object.values(dg.items).flat().length, skins: Object.values(dg.skin || {}).filter(Boolean).map(id => ((SKIN[id] || [])[1] || id)), skinSize: dsgSkins() ? (dg.skinSize || 'M') : '', skinPrice: dsgSkins() ? SKINP[dg.skinSize || 'M'].price : 0,
      layout: dg.layout || [], scaled: !!dg.scaled, sheet: dg.sheet || null, mock: dg.thumb || null, raw: dsgPack(dg) } : null };
  try {
    const r = await fetch('/api/order/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) throw new Error(j.error || 'The order could not be sent');
    store.set('sl-last', { packs: { ...packs }, cart: { ...cart }, at: Date.now() }); store.set('sl-orders', [{ id: j.id, at: Date.now(), total: body.total }, ...store.get('sl-orders', [])].slice(0, 20));
    cart = {}; packs = {}; store.set('sl-dsg', null); saveCart(); updBar(); orderDone(j.id, body);
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Try again';
    const f = $('#ckfail') || Object.assign(document.createElement('div'), { id: 'ckfail', className: 'ckfail' }); btn.after(f);
    f.innerHTML = `<b>${esc(e.message || 'No connection')}.</b> Check your internet and try again, or <a href="https://wa.me/${WA}?text=${encodeURIComponent(`Hello Skin Lab, I'd like to order (my order would not send). Name: ${who.name}`)}" target="_blank" rel="noopener">chat with us on WhatsApp</a>.`;
  }
}
function orderDone(id, body) {
  $('#c-body').innerHTML = `<div class="okd"><span class="okc">✓</span><span class="lbl">Order ${esc(id)}</span><h3>Order received, <em>${esc(body.name.split(' ')[0])}.</em></h3>
    <p>We'll message you on WhatsApp at <b>+${esc(body.phone)}</b> to confirm your order and payment.</p>
    <a class="btn y" href="/o/${esc(id)}/">See my order</a><button class="btn o" type="button" id="okb">Back to the shop</button></div>`;
  $('#okb').onclick = () => { $('#cart').hidden = true; location.hash = ''; }; buzz();
}
function reorder() { const l = store.get('sl-last', null); if (!l) return; cart = {}; packs = {};
  Object.entries(l.cart || {}).forEach(([c, q]) => { if (CODE[c]) cart[c] = q; }); Object.entries(l.packs || {}).forEach(([k, q]) => { if (pkOf(k)) packs[k] = q; });
  saveCart(); updBar(); openCart(); }
// one tap: everything picked goes to WhatsApp as one message; the cart is still there to change amounts
function orderNow(pk = [], items = []) {   // add, then straight to the checkout form
  pk.forEach(([k, q]) => { if (!packs[k]) packs[k] = q; }); items.forEach(([c, q]) => { if (!cart[c]) cart[c] = q; });
  saveCart(); updBar(); buzz(); openCart(true); }
$('#bar-go').onclick = () => openCart(true); $('#bar').querySelector('.t').onclick = openCart; $('#t-cart').onclick = openCart; $('#nv-cart').onclick = openCart;
$('#c-x').onclick = () => $('#cart').hidden = true;

// send your inspo
function openInspo() {
  $('#i-name').value = who.name || ''; $('#inspo').hidden = false;
}
$('#i-x').onclick = () => $('#inspo').hidden = true;

$('#i-send').onclick = () => {
  const name = $('#i-name').value.trim(), idea = $('#i-idea').value.trim(), qty = $('#i-qty').value.trim();
  if (!idea) { $('#f-idea').classList.add('err'); $('#i-idea').focus(); toast('Tell us a little about what you want'); return; }
  if (name) { who.name = name; store.set('sl-who', who); }
  const t = `Hello Skin Lab, I want custom stickers.\n\nIdea: ${idea}${qty ? `\nHow many: ${qty}` : ''}${name ? `\nName: ${name}` : ''}\n\nI'll send my pictures here.`;
  const u = waLink(t); if (!window.open(u, '_blank', 'noopener')) location.href = u;
};

let pkCode = null;
function peek(code) { pkCode = code; const { p, it } = CODE[code]; $('#pk-st').style.background = p.bg; $('#pk-st').innerHTML = spr(p, it, Math.min(240, innerWidth - 80));
  $('#pk-code').textContent = `${code}, ${p.nice}`; $('#pk-tog').textContent = cart[code] ? 'Remove from cart' : 'Add to cart'; $('#peek').hidden = false; }
$('#pk-x').onclick = () => $('#peek').hidden = true;
$('#pk-tog').onclick = () => { toggle(pkCode); $('#peek').hidden = true; };

// ---------- views ----------
const route = () => decodeURIComponent(location.hash.slice(1));
const footer = `<footer>
  <div class="fbig">Stick it. <em>Love it.</em></div>
  <div class="fgrid"><div><span class="lbl">Studio</span>Skin Lab is a sticker shop by Baiden Creatives in Accra. Questions, custom ideas or bulk orders for your class or office, just message us.</div>
  <div><span class="lbl">WhatsApp / Call</span><a class="num" href="https://wa.me/${WA}" target="_blank" rel="noopener">055 836 2423</a></div>
  <div><span class="lbl">Instagram</span><a class="num" href="https://www.instagram.com/baidencreatives/" target="_blank" rel="noopener">@baidencreatives</a></div></div>
  <a class="bc" href="https://www.baidencreatives.org" target="_blank" rel="noopener"><span>A Baiden Creatives company</span><span>baidencreatives.org →</span></a></footer>`;
const HERO = [['p1-hacker-mode', 4, 6, 30], ['g1-gta-rockstar', 33, 3, 26], ['m2-spider-verse', 62, 5, 30], ['k1-sneakerhead-1', 8, 40, 24], ['v2-jdm-and-euro', 36, 34, 30], ['an1-anime-legends', 70, 38, 24],
  ['gen-z-girlies', 3, 70, 26], ['f1-club-crests-i', 30, 66, 26], ['p2-ai-vibe-coding', 57, 66, 30], ['d1-dark-street-art-1', 82, 72, 18], ['b1-moto-bike-life-1', 86, 10, 18], ['c1-marvel-chibis', 48, 18, 16]];

// category covers: the real printed sheets of that category, laid on a table like a product photo
function catGrid() {
  return `<div class="cats">${D.cats.map((c, ci) => { const ps = c.packs.map(id => PK[id]), lo = Math.min(...ps.map(p => p.p5 || p.price));
    return `<a class="catc" href="#${c.id}"><div class="table" style="--tb:${ps[0].bg}">${ps.slice(0, 2).reverse().map((p, i, a) => `<img src="${sh(p.id, 'sheets-xs')}" alt="${esc(p.nice)} sticker pack" width="${Math.round(p.sw * .3)}" height="${Math.round(p.sh * .3)}" ${ci < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--r:${[-5, 9][a.length - 1 - i]}deg;--x:${[-10, 24][a.length - 1 - i]}%">`).join('')}</div>
      <div class="cmeta"><span class="no">${String(ci + 1).padStart(2, '0')}</span><b>${esc(c.name)}${ps.some(p => p.new) ? '<i class="newb in">New</i>' : ''}</b><span>${c.packs.length} pack${c.packs.length > 1 ? 's' : ''} · from ${CUR}${lo}</span></div></a>`; }).join('')}</div>`;
}
function lastOrder() {
  const l = store.get('sl-last', null); if (!l) return '';
  const pk = Object.entries(l.packs || {}).filter(([k]) => pkOf(k)), ns = Object.values(l.cart || {}).reduce((a, b) => a + b, 0);
  if (!pk.length && !ns) return '';
  const label = [...pk.map(([k, q]) => `${q > 1 ? q + '× ' : ''}${pkOf(k).label}`), ns ? `${ns} single sticker${ns > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
  return `<button type="button" class="again" id="again"><span class="ic">↻</span><span><b>Order again</b><small>${esc(label)}</small></span><span class="go">Open</span></button>`;
}
// newest packs first on the home page, so nobody misses them
function newDrops() {
  const TOP = ['an7-my-hero-academia', 'p11-database-backend', 'fc-lamine-yamal', 'fc-barca-crests', 'fc-messi', 'v5-bmw-m', 'an2-itachi', 'fc-hala-madrid', 'gr5-boss-girl', 'g7-pubg', 'an4-monkey-d-luffy', 'm3-spider-man', 'fc-madrid-squad', 'k3-nba-classics', 'q2-gen-z-ghana', 'q3-nasa-space'];
  const ps = [...D.packs.filter(p => p.drop), ...TOP.map(id => PK[id])].filter(Boolean);
  const xl = D.packs.filter(p => p.size === 'XL').slice(0, 4);
  const all = [...ps.slice(0, 6), ...xl.slice(0, 2), ...ps.slice(6), ...xl.slice(2)];
  if (!all.length) return '';
  return `<div class="drops"><div class="dh"><span class="lbl">New drops</span><span class="lbl">${all.length} new · swipe →</span></div>
    <div class="dl">${all.map(p => `<a class="dc" href="#${p.id}"><span class="di" style="--tb:${p.bg}"><img src="${sh(p.id, 'sheets-xs')}" alt="${esc(p.nice)}" loading="lazy" decoding="async"></span>
      <b>${esc(p.nice)}</b><small>${p.size === 'XL' ? `XL · ${CUR}${p.price}` : p.size === 'A3' ? `A3 · ${CUR}${p.price}` : `from ${CUR}${p.p5 || p.price}`}</small></a>`).join('')}</div></div>`;
}
function vHome() {
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    ${lastOrder()}
    <div class="kick-row"><span>Laptop skins &amp; stickers · Accra</span><span>From ${CUR}30</span></div>
    <div class="sech hero2"><div><h1 class="h1 hero-h">Your laptop, <em>your story.</em></h1><p class="hsub">Skins and sticker packs, printed in Accra.</p></div>${INS.length > 4 ? `<a class="hcol" href="#inspo" aria-label="See sticker inspiration">${[[0, -5, 0, 4], [3, 4, 34, 0], [12, -2, 56, 14]].map(([k, r, x, y]) => `<img src="inspo/sm/${INS[k].id}.${IX}" alt="" loading="lazy" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)">`).join('')}<span class="lbl">Inspiration →</span></a>` : ''}</div>
    ${newDrops()}
    <div class="seg hseg" id="h-seg"><button type="button" data-h="st">Stickers</button><button type="button" data-h="sk">Skins</button></div>
    <div id="h-grid"></div>
    <div class="extra">
      <a class="xcard" href="#inspo">${INS.length ? `<span class="xthumbs">${[2, 1, 0].map((k, j) => INS[k] ? `<img src="inspo/sm/${INS[k].id}.${IX}" alt="" loading="lazy" style="left:${j * 24}px;transform:rotate(${[-8, 2, 9][j]}deg)">` : '').join('')}</span>` : '<span class="xart" id="xa1"></span>'}<span><b>Inspiration</b><small>Laptops and sticker sheets to steal ideas from. Tap one, we print it.</small></span></a>
      <button type="button" class="xcard" id="x-inspo"><span class="xicon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4"/></svg></span><span><b>Send us your idea</b><small>Your name, picture or logo made into stickers. From ${CUR}15.</small></span></button>
    </div>
  </section>${footer}`;
  const art = (id, list) => { $(id).innerHTML = list.map(([pid, k], i) => spr(PK[pid], PK[pid].items[k], 52, `transform:rotate(${[-8, 7][i]}deg);margin-right:-12px`)).join(''); };
  if ($('#xa1')) art('#xa1', [['p3-code-languages-1', 3], ['m2-spider-verse', 2]]); 
  const hs = (k, save) => { if (save) store.set('sl-home', k); document.querySelectorAll('#h-seg [data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === k));
    $('#h-grid').innerHTML = k === 'sk' ? skinsGrid() : catGrid(); if (k === 'sk') wireSkins($('#h-grid')); };
  $('#h-seg').onclick = e => { const b = e.target.closest('[data-h]'); if (b) hs(b.dataset.h, 1); }; hs(store.get('sl-home', 'st'));
  $('#x-inspo').onclick = openInspo;
  if ($('#again')) $('#again').onclick = reorder;
}
function vCats() { vHome(); }
function vCat(c) {
  app.innerHTML = `<section class="sec" style="padding-top:14px">
    <div class="crumb"><a href="#">Categories</a> / <span>${esc(c.name)}</span></div>
    <div class="sech"><div><h2>${esc(c.name)} <em>packs</em></h2><p class="sub">Tap a pack to see every sticker on it.</p></div></div>
    <div class="packs">${c.packs.map(id => { const p = PK[id];
      return `<div class="pack"><a href="#${p.id}" class="pv" style="--tb:${p.bg}">${p.new ? '<span class="newb">New</span>' : ''}<img src="${sh(p.id, 'sheets-sm')}" alt="${esc(p.nice)} sticker sheet" width="${Math.round(p.sw * .44)}" height="${Math.round(p.sh * .44)}" loading="lazy" decoding="async"></a>
        <div class="meta"><a href="#${p.id}"><b>${esc(p.nice)}</b><span>${p.a5 ? `A5 ${p.a5.length} · A4 ${p.items.length} stickers` : p.size === 'XL' ? 'XL · about 18 cm · lid centrepiece' : `${p.items.length} stickers · A3 pick & mix`}</span></a><span class="price">${p.a5 ? `from ${CUR}${p.p5}` : `${CUR}${p.price}`}</span></div>
        <div class="pbtns"><a class="btn y" href="#${p.id}">${waIcon}Order</a><a class="btn o" href="#${p.id}">See stickers</a></div></div>`; }).join('')}</div>
    <a class="xcard" href="#inspo" style="margin-top:16px"><span><b>Looking for ideas?</b><small>Browse sticker inspiration, then we'll make the one you like.</small></span></a>
  </section>${footer}`;
}
function vPack(p) {
  const c = CAT[p.cat], lt = light(p.bg);
  app.innerHTML = `<section class="sec" style="padding-top:14px">
    <div class="crumb"><a href="#">Categories</a> / <a href="#${c.id}">${esc(c.name)}</a></div>
    ${c.packs.length > 1 ? `<div class="hs" style="margin:2px 0 12px">${c.packs.map(id => `<a class="chip ${id === p.id ? 'on' : ''}" href="#${id}">${esc(PK[id].nice)}</a>`).join('')}</div>` : ''}
    <div class="phero">
      <button type="button" class="sheetimg" id="zoom" style="--tb:${p.bg}" aria-label="See the ${esc(p.nice)} sheet bigger"><img id="sheetim" src="${sh(p.id, 'sheets')}" alt="${esc(p.nice)} sticker sheet" width="${p.sw}" height="${p.sh}" fetchpriority="high" decoding="async"><span class="zm">Tap to zoom</span></button>
      <div class="pinfo">
        <span class="lbl">${p.new ? 'New · ' : ''}${esc(c.name)}</span>
        <h2>${esc(p.nice)}</h2>
        <p class="sub">${esc(p.tag)}. Die-cut vinyl with a thin outline. Peel them one by one for your laptop, phone and keyboard.</p>
        ${p.a5 ? `<div class="sizes" id="sizes" role="radiogroup" aria-label="Sheet size">
          <button type="button" role="radio" data-sz="5"><b>A5</b><span>Small sheet</span><span>${p.a5.length} stickers</span><em>${CUR}${p.p5}</em></button>
          <button type="button" role="radio" data-sz="4"><b>A4</b><span>Big sheet</span><span>${p.items.length} stickers</span><em>${CUR}${p.price}</em></button></div>`
        : p.size === 'XL' ? `<div class="sizes one"><div class="on"><b>XL</b><span>One big sticker, about 18 cm</span><span>for the middle of your lid</span><em>${CUR}${p.price}</em></div></div>`
        : `<div class="sizes one"><div class="on"><b>A3</b><span>Pick &amp; mix sheet</span><span>${p.items.length} stickers</span><em>${CUR}${p.price}</em></div></div>`}
        <button class="btn wa" type="button" id="orderpack"><span id="op-t">Order</span></button>
        <button class="btn o" type="button" data-packbtn="${p.id}" id="addpack"></button>
      </div>
    </div>
    <div class="sech" style="margin-top:26px"><div><h2 style="font-size:clamp(32px,8vw,48px)">What's <em>inside</em></h2><p class="sub">Only want a few? Tap the ones you like (${CUR}${PRICE} each), then <b>Checkout</b>. Hold one to see it bigger.</p></div></div>
    <div class="grid ${lt ? 'lt-grid' : ''}" id="grid" style="background:${p.bg}"></div>
  </section>${footer}`;
  const g = $('#grid'), cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, cell = (g.clientWidth - 20 - (cols - 1) * 8) / cols;
  g.innerHTML = p.items.map(it => `<button type="button" class="tile" data-c="${it[0]}" aria-label="Pick sticker ${it[0]} as a single">${spr(p, it, cell * .8)}<span class="code">${it[0]}</span><span class="chk">✓</span></button>`).join('');
  let lp = null, held = false, sx = 0, sy = 0;
  g.addEventListener('pointerdown', e => { const t = e.target.closest('.tile'); if (!t) return; held = false; sx = e.clientX; sy = e.clientY; lp = setTimeout(() => { held = true; buzz(); peek(t.dataset.c); }, 450); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => g.addEventListener(ev, () => clearTimeout(lp)));
  g.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) clearTimeout(lp); }, { passive: true });
  g.addEventListener('contextmenu', e => { if (e.target.closest('.tile')) e.preventDefault(); });
  g.onclick = e => { const t = e.target.closest('.tile'); if (t && !held) { const was = !!cart[t.dataset.c]; toggle(t.dataset.c); if (!was && nSingles() === 1) toast(`Picked as a single, ${CUR}${PRICE}`); } held = false; };
  // size: A5 small or A4 big (remembered per visit); the A3 pick & mix comes in one size
  let key = p.a5 ? (store.get('sl-size', '4') === '5' ? p.id + '~5' : p.id) : p.id;
  const showSize = () => { const o = pkOf(key); $('#addpack').dataset.packbtn = key; updBar();
    document.querySelectorAll('#sizes [data-sz]').forEach(b => { const on = (b.dataset.sz === '5') === o.a5; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    const im = $('#sheetim'); im.src = `${sh(o.img, 'sheets')}`; im.width = o.a5 ? p.sw5 : p.sw; im.height = o.a5 ? p.sh5 : p.sh;
    $('#op-t').textContent = `Order ${o.size} · ${CUR}${o.price}`;
    const in5 = new Set(p.a5 || []); g.querySelectorAll('.tile').forEach(t => t.classList.toggle('dim', o.a5 && !in5.has(t.dataset.c))); };
  if ($('#sizes')) $('#sizes').onclick = e => { const b = e.target.closest('[data-sz]'); if (!b) return; key = b.dataset.sz === '5' ? p.id + '~5' : p.id; store.set('sl-size', b.dataset.sz); buzz(); showSize(); };
  $('#addpack').onclick = () => { setPack(key, (packs[key] || 0) + 1); buzz(); toast(`${pkOf(key).label} added. Tap Order now when you're ready.`); };
  $('#orderpack').onclick = () => orderNow([[key, 1]], []);
  $('#toinspo') && ($('#toinspo').onclick = openInspo);
  $('#zoom').onclick = () => { $('#lb-img').src = `${sh(pkOf(key).img, 'sheets')}`; $('#lb').hidden = false; };
  showSize();
}
// order pages. Owner phone: full order. Anyone else (the customer included): a notice.
function orderBody(pk, items, o, ref, open = false) {
  const tot = pk.reduce((a, [k, q]) => a + q * pkOf(k).price, 0) + items.reduce((a, [, q]) => a + q * PRICE, 0), n = items.reduce((a, [, q]) => a + q, 0);
  const when = o && o.t ? new Date(o.t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  app.innerHTML = `<section class="sec ord">
    <div class="kick-row"><span>${ref ? `Order ${ref}` : 'Order'}</span><span>${when}</span></div>
    <h1 class="h1">${o && o.n ? esc(o.n) : 'Sticker order'}</h1>
    ${o && (o.l || o.m) ? `<dl class="who">${o.l ? `<div><dt>Location</dt><dd>${esc(o.l)}</dd></div>` : ''}${o.m ? `<div><dt>Note</dt><dd>${esc(o.m)}</dd></div>` : ''}</dl>` : ''}
    ${pk.length ? `<div class="lbl" style="margin-top:22px">Sticker sheets</div><div class="orows">${pk.map(([k, q]) => `<a class="orow" href="#${pkOf(k).id}"><span class="th" style="background:${pkOf(k).p.bg}"><img src="${sh(pkOf(k).img, 'sheets-sm')}" alt="" loading="lazy"></span><span class="nm"><b>${esc(pkOf(k).p.nice)}</b><small>${SZ[pkOf(k).size]} · ${pkOf(k).n} stickers · ${CUR}${pkOf(k).price}</small></span><span class="q">×${q}</span><span class="pr">${CUR}${q * pkOf(k).price}</span></a>`).join('')}</div>` : ''}
    ${items.length ? `<div class="lbl" style="margin-top:22px">Single stickers · ${n} × ${CUR}${PRICE} = ${CUR}${n * PRICE}</div><div class="oview" id="ov"></div>` : ''}
    ${o && o.d ? `<div class="lbl" style="margin-top:22px">Laptop design</div><p style="margin:8px 0">${esc(dsgLine(dsgUnpack(o.d)))}</p><div class="odsg" id="o-dsg"></div>` : ''}
    <div class="otot"><span>Total</span><b>${CUR}${tot}</b></div>
    ${o && o.d && dsgUnpack(o.d).v === 3 ? `<div class="small" style="margin-top:6px">${dsgSkinN(o.d) ? 'Skin price is sent on WhatsApp. ' : ''}</div>` : ''}
    ${open ? (isOwner() ? `<div class="ostat"><b>Customer order</b><span>You are viewing this as Skin Lab.</span></div><div class="ctas" style="margin-top:16px"><button class="btn y" type="button" id="o-copy">Copy order</button><a class="btn o" href="#">Back to the shop</a></div>`
      : `<div class="ostat"><b>Sent to Skin Lab</b><span>We'll confirm the total and delivery with you on WhatsApp.</span></div>
      <div class="ctas" style="margin-top:16px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hello Skin Lab, about my order ${ref}`)}">${waIcon}Chat about this order</a><button class="btn o" type="button" id="o-again">Order the same again</button></div>`)
      : `<div class="ctas" style="margin-top:16px"><button class="btn y" type="button" id="o-copy">Copy order</button><a class="btn o" href="#">Back to the shop</a></div>`}
    <p class="small" style="margin-top:14px">${open ? 'Only people you share this link with can see this order.' : 'Only this phone can open Skin Lab order links.'}</p></section>${footer}`;
  const g = $('#ov');
  if (g) { const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, cell = (g.clientWidth - 20 - (cols - 1) * 8) / cols;
    g.innerHTML = items.map(([c, q]) => `<div class="tile" style="background:${CODE[c].p.bg}">${spr(CODE[c].p, CODE[c].it, cell * .8)}<span class="code">${c}</span><span class="chk">${q > 1 ? q : '✓'}</span></div>`).join(''); }
  const sv = who; who = { name: o && o.n || '', loc: o && o.l || '', note: o && o.m || '' };
  const od = o && o.d ? dsgUnpack(o.d) : null;
  const t = orderText(pk, items, null, od) + (ref ? `\n\nOrder ${ref}` : ''); who = sv;
  if (od && od.v !== 3) designPicture(od, 300).then(c => { const el = $('#o-dsg'); if (el) { el.innerHTML = ''; el.appendChild(c); } });
  if ($('#o-copy')) $('#o-copy').onclick = () => copy(t);
  if ($('#o-again')) $('#o-again').onclick = () => { pk.forEach(([k, q]) => packs[k] = q); items.forEach(([c, q]) => cart[c] = q); if (od && od.v === 3) store.set('sl-dsg', od); saveCart(); updBar(); location.hash = 'cart'; };
  const dl = $('#o-dsg'); if (dl && od && od.v === 3) dl.innerHTML = `<a class="btn o" href="/design/#d-${b64u.enc(new TextEncoder().encode(JSON.stringify(o.d)))}">See the laptop design</a>`;
}
const dsgSkinN = d => Object.values((d && d.k) || {}).filter(Boolean).length;
async function vView(s) {
  app.innerHTML = `<section class="sec notice"><div class="kick-row"><span>Order</span><span>Opening…</span></div></section>`;
  const ref = await orderRef(s).catch(() => '');
  try { const o = await unpackOrder(s);
    orderBody((o.p || []).map(([i, q]) => [pkFromLink(i), q]).filter(([k]) => pkOf(k)), (o.s || []).filter(([c]) => CODE[c]), o, ref, true); }
  catch (e) { app.innerHTML = `<section class="sec notice"><div class="kick-row"><span>Order ${ref}</span><span>Error</span></div><h1 class="h1">This link is <em>incomplete.</em></h1><p class="sub">Part of it was probably cut off when it was copied. Tap the full link in the WhatsApp chat, or read the order in the message.</p><div class="ctas" style="margin-top:20px"><a class="btn o" href="#">Back to the shop</a></div></section>${footer}`; }
}
// links from the old private format: the full order is always written out in the WhatsApp message itself
function vOldLink(ref) {
  app.innerHTML = `<section class="sec notice">
    <div class="kick-row"><span>${ref ? `Order ${ref}` : 'Order'}</span><span>Skin Lab</span></div>
    <h1 class="h1">This order is in <em>the chat.</em></h1>
    <p class="sub">This link was made by an older version of the shop, so it can't show the order here. Every item, the prices and the total are written out in the WhatsApp message above the link.</p>
    <p class="small">New orders get a link that shows the full order to you and to Skin Lab.</p>
    <div class="ctas" style="margin-top:20px"><a class="btn wa" href="https://wa.me/${WA}" target="_blank" rel="noopener">${waIcon}Open the chat</a><a class="btn o" href="#">Back to the shop</a></div>
  </section>${footer}`;
}
function vNotice(ref) {
  app.innerHTML = `<section class="sec notice">
    <div class="kick-row"><span>${ref ? `Order ${ref}` : 'Your order'}</span><span>Skin Lab</span></div>
    <h1 class="h1">We're viewing <em>your order.</em></h1>
    <p class="sub">It reached us on WhatsApp and we're going through it now. We'll reply in the chat to confirm the total and delivery.</p>
    <p class="small">This link is private, so only Skin Lab can open the order details.</p>
    <div class="ctas" style="margin-top:20px"><a class="btn y" href="#">Back to the shop</a><a class="btn o" href="https://wa.me/${WA}" target="_blank" rel="noopener">${waIcon}Open the chat</a></div>
  </section>${footer}`;
}
async function vSealed(s) {
  app.innerHTML = `<section class="sec notice"><div class="kick-row"><span>Order</span><span>Opening…</span></div></section>`;
  const ref = await orderRef(s).catch(() => '');
  if (!isOwner()) return vOldLink(ref);
  try { const o = await openSealed(s);
    orderBody((o.p || []).map(([i, q]) => [pkFromLink(i), q]).filter(([k]) => pkOf(k)), (o.s || []).filter(([c]) => CODE[c]), o, ref); }
  catch (e) { vOldLink(ref); }
}
function vOrder(r) {
  if (!isOwner()) return vNotice('');
  const pk = [], items = [];
  r.slice(6).split('-').forEach(t => { let m = t.match(/^K(\d+)(?:x(\d+))?$/); if (m && pkOf(pkFromLink(+m[1]))) { pk.push([pkFromLink(+m[1]), +(m[2] || 1)]); return; }
    m = t.match(/^([A-Z]{3})(\d{3})(?:x(\d+))?$/); if (m && CODE[`${m[1]}-${m[2]}`]) items.push([`${m[1]}-${m[2]}`, +(m[3] || 1)]); });
  orderBody(pk, items, null, '');
}
async function vUnlock(d) {
  history.replaceState(null, '', location.pathname + '#unlocked');
  let ok = false; try { await crypto.subtle.importKey('jwk', ownerJwk(d), ECDH, false, ['deriveBits']); ok = true; } catch (e) {}
  if (ok) store.set('sl-owner', d);
  app.innerHTML = `<section class="sec notice"><div class="kick-row"><span>Skin Lab · owner</span><span>${ok ? 'Unlocked' : 'Failed'}</span></div>
    <h1 class="h1">${ok ? 'This phone can now <em>open orders.</em>' : 'That key <em>did not work.</em>'}</h1>
    <p class="sub">${ok ? 'Tap any order link a customer sends you and you will see their name and everything they ordered. Customers who open their own link only see a notice.' : 'Copy the full unlock link again and open it here.'}</p>
    ${ok ? `<div class="ctas" style="margin-top:20px"><a class="btn y" href="#">Go to the shop</a><button class="btn o" type="button" id="lock">Lock this phone again</button></div>` : ''}</section>${footer}`;
  if ($('#lock')) $('#lock').onclick = () => { try { localStorage.removeItem('sl-owner'); } catch (e) {} toast('Locked. Order links now show the notice here.'); location.hash = ''; };
}

// ---------- inspiration: real photos, tap one to get stickers like it ----------
const INS = window.INSPO || [];
const ITAGS = [['', 'All'], ['skins', 'Skins'], ['laptop', 'On laptops'], ['code', 'Coding'], ['pop', 'Anime & pop'], ['custom', 'Custom']];
const hasT = (x, k) => !k || (x.t || '').split(' ').includes(k);
let insF = '', ivList = [], ivI = 0;
function vInspo() {
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    <div class="seg iseg"><a href="#inspo" class="on">Ideas</a><a href="#mine">Mine</a></div>
    <div class="ihead"><div><h1 class="h1">Skins &amp; stickers, <em>inspired.</em></h1><p class="sub">Skins and sticker setups we like. Tap one and we'll print it for you.</p></div></div>
    ${INS.length ? `<div class="hs ifil">${ITAGS.map(([k, n]) => { const c = INS.filter(x => hasT(x, k)).length;
        return c ? `<button type="button" class="chip ${k === insF ? 'on' : ''}" data-f="${k}" aria-pressed="${k === insF}">${n}<span class="ct">${c}</span></button>` : ''; }).join('')}</div>
      <div class="ins" id="ins"></div>` : `<div class="insempty">New inspiration photos are on the way.</div>`}
    <button type="button" class="xcard" id="ins-own" style="margin-top:18px"><span><b>Got your own idea?</b><small>Send us a picture, a name or a logo. From ${CUR}15.</small></span></button>
  </section>${footer}`;
  if (INS.length) {
    drawIns();
    app.querySelector('.ifil').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; insF = b.dataset.f;
      app.querySelectorAll('.ifil .chip').forEach(c => { const on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); }); drawIns(); };
    $('#ins').onclick = e => { const b = e.target.closest('.insp'); if (b) openIv(+b.dataset.n); };
  }
  $('#ins-own').onclick = openInspo;
}
function drawIns() {
  ivList = INS.map((x, i) => i).filter(i => hasT(INS[i], insF));
  const g = $('#ins'), nc = innerWidth >= 1000 ? 4 : innerWidth >= 700 ? 3 : 2, cols = Array.from({ length: nc }, () => ({ h: 0, html: '' }));
  ivList.forEach((i, n) => { const x = INS[i], c = cols.reduce((a, b) => b.h < a.h - .01 ? b : a); c.h += x.h / x.w + .04;
    c.html += `<button type="button" class="insp" data-n="${n}" style="background:${x.c};aspect-ratio:${x.w}/${x.h}" aria-label="${esc(x.alt)}"><img src="inspo/sm/${x.id}.${IX}" width="${x.w}" height="${x.h}" alt="${esc(x.alt)}" ${n < 4 ? '' : 'loading="lazy"'} decoding="async" onload="this.classList.add('ok')">${hasT(x, 'skins') ? (insF === 'skins' ? '' : '<span class="il">Skin</span>') : hasT(x, 'laptop') && insF !== 'laptop' ? '<span class="il">On a laptop</span>' : ''}</button>`; });
  g.innerHTML = cols.map(c => `<div class="col">${c.html}</div>`).join('');
  g.querySelectorAll('img').forEach(im => { if (im.complete && im.naturalWidth) im.classList.add('ok'); });
}
const ivSrc = x => `inspo/lg/${x.id}.${IX}`;
function openIv(n) {
  if (!ivList.length) return;
  ivI = (n + ivList.length) % ivList.length; const x = INS[ivList[ivI]];
  $('#iv-img').src = ivSrc(x); $('#iv-img').alt = x.alt; $('#iv-cap').textContent = x.alt;
  $('#iv-n').textContent = `${ivI + 1} / ${ivList.length}`; $('#iv').hidden = false;
  [1, -1].forEach(d => { const y = INS[ivList[(ivI + d + ivList.length) % ivList.length]]; new Image().src = ivSrc(y); });
}
$('#iv-x').onclick = () => $('#iv').hidden = true;
$('#iv-p').onclick = () => openIv(ivI - 1); $('#iv-n2').onclick = () => openIv(ivI + 1);
(() => { let x0 = null, y0 = 0; const w = $('#iv-w');
  w.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  w.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) openIv(ivI + (dx < 0 ? 1 : -1)); }, { passive: true });
  addEventListener('keydown', e => { if ($('#iv').hidden) return; if (e.key === 'ArrowRight') openIv(ivI + 1); else if (e.key === 'ArrowLeft') openIv(ivI - 1); else if (e.key === 'Escape') $('#iv').hidden = true; });
})();
$('#iv-go').onclick = () => { const x = INS[ivList[ivI]], no = ivList[ivI] + 1;
  const t = `Hello Skin Lab, I'd like stickers like this one (inspiration #${no}):\n${SITE.replace(/\/$/, '')}/inspo/lg/${x.id}.webp\n\nHow many: \nName: ${who.name || ''}`;
  const u = waLink(t); if (!window.open(u, '_blank', 'noopener')) location.href = u; };
$('#lb-x').onclick = () => $('#lb').hidden = true;
$('#lb').onclick = e => { if (e.target.id === 'lb') e.currentTarget.hidden = true; };

// ---------- design: pick your laptop, then dress the lid, keyboard and bottom with skins and stickers ----------
// Laptops are drawn, not photographed: real outer sizes per model, so stickers show at their true size.
const BRANDS = {
  Apple: [['MacBook Air 13″ (M1)', 13.3, 30.4, 21.2, 'mac'], ['MacBook Air 13″ (M2, M3)', 13.6, 30.4, 21.5, 'mac'], ['MacBook Air 15″', 15.3, 34.0, 23.8, 'mac'], ['MacBook Pro 13″', 13.3, 30.4, 21.2, 'mac'], ['MacBook Pro 14″', 14.2, 31.3, 22.1, 'mac'], ['MacBook Pro 16″', 16.2, 35.6, 24.8, 'mac']],
  HP: [['EliteBook 840', 14, 32.3, 21.5, 'win'], ['EliteBook 850', 15.6, 35.9, 23.4, 'win'], ['ProBook 450', 15.6, 35.9, 23.4, 'pad'], ['Pavilion 15', 15.6, 36.0, 23.4, 'pad'], ['HP 250 / 255', 15.6, 35.8, 24.2, 'pad'], ['Envy x360 13', 13.3, 30.7, 19.4, 'win'], ['Spectre x360 14', 13.5, 29.8, 22.0, 'win'], ['Victus 15', 15.6, 35.7, 25.5, 'pad']],
  Dell: [['Latitude 5420 / 5430', 14, 32.1, 21.2, 'win'], ['Latitude 7490', 14, 32.1, 21.6, 'win'], ['Latitude 5520', 15.6, 35.9, 23.6, 'pad'], ['Inspiron 15', 15.6, 35.8, 23.6, 'pad'], ['Vostro 15', 15.6, 35.8, 23.5, 'pad'], ['XPS 13', 13.4, 29.6, 19.9, 'win'], ['XPS 15', 15.6, 34.4, 23.0, 'win'], ['G15 gaming', 15.6, 35.7, 27.2, 'pad']],
  Lenovo: [['ThinkPad T14', 14, 32.9, 22.7, 'win'], ['ThinkPad T480 / T490', 14, 33.6, 23.2, 'win'], ['ThinkPad X1 Carbon', 14, 31.5, 22.2, 'win'], ['ThinkPad E15', 15.6, 36.5, 24.0, 'pad'], ['IdeaPad 3 15', 15.6, 35.9, 23.6, 'pad'], ['IdeaPad Slim 5 14', 14, 32.1, 21.1, 'win'], ['Yoga 7 14', 14, 31.9, 21.2, 'win'], ['Legion 5', 15.6, 36.3, 26.0, 'pad']],
  Acer: [['Aspire 3 15', 15.6, 36.3, 24.1, 'pad'], ['Aspire 5 15', 15.6, 36.3, 23.8, 'pad'], ['Aspire 5 14', 14, 32.8, 22.3, 'win'], ['Swift 3 14', 14, 32.3, 21.2, 'win'], ['Nitro 5', 15.6, 36.3, 25.5, 'pad'], ['Predator Helios 300', 15.6, 36.3, 25.5, 'pad']],
  Asus: [['VivoBook 15', 15.6, 36.0, 23.5, 'pad'], ['VivoBook 14', 14, 32.5, 21.6, 'win'], ['ZenBook 14', 14, 31.9, 20.8, 'win'], ['TUF Gaming F15', 15.6, 35.9, 25.6, 'pad'], ['ROG Strix G15', 15.6, 35.4, 25.9, 'pad']],
  Microsoft: [['Surface Laptop 13.5″', 13.5, 30.8, 22.3, 'win'], ['Surface Laptop 15″', 15, 33.9, 24.4, 'win'], ['Surface Laptop Go', 12.4, 27.8, 20.6, 'win']],
  Other: [['13.3″ laptop', 13.3, 30.4, 21.2, 'win'], ['14″ laptop', 14, 32.2, 22.4, 'win'], ['15.6″ laptop', 15.6, 35.8, 24.2, 'pad'], ['16″ laptop', 16, 35.6, 24.8, 'pad'], ['17.3″ laptop', 17.3, 39.8, 26.8, 'pad']],
};
const LCOLS = { silver: ['Silver', '#e4e6e9', '#b6b9be'], grey: ['Space grey', '#55575d', '#2b2c30'], black: ['Black', '#2c2d30', '#0e0e10'], gold: ['Gold', '#efdcc9', '#c8ab90'], blue: ['Midnight', '#36435d', '#19202e'] };
const SURFS = { lid: ['Lid', 'Laptop lid', 5.5], kb: ['Keyboard', 'Keyboard area', 3.2], bot: ['Bottom', 'Bottom', 6], pad: ['Mousepad', 'Mousepad', 5] };
const PADS = { std: [25, 21, 'Standard'], xl: [80, 30, 'Desk mat'] };
const SKINS = [
  ['ph-graffiti', 'Red graffiti', 'photo'],
  ['ph-starry', 'Starry Night', 'photo'],
  ['ph-boondocks', 'Boondocks', 'photo'],
  ['ph-joker', 'Joker', 'photo'],
  ['ph-marvel', 'Marvel comics', 'photo'],
  ['ph-avengers', 'Avengers', 'photo'],
  ['ph-bvs', 'Batman v Superman', 'photo'],
  ['ph-pink', 'Pink waves', 'photo'],
  ['ph-rose', 'Rose waves', 'photo'],
  ['ph-girlpower', 'Girl power', 'photo'],
  ['ph-tanjiro', 'Demon Slayer', 'photo'],
  ['ph-jinx', 'Jinx', 'photo'],
  ['bomb-code', 'Code · sticker bomb', 'bomb', 'p1-hacker-mode', '#0b1310'], ['bomb-anime', 'Anime · sticker bomb', 'bomb', 'an1-anime-legends', '#151a2c'],
  ['bomb-gaming', 'Gaming · sticker bomb', 'bomb', 'g1-gta-rockstar', '#1d1230'], ['bomb-football', 'Football · sticker bomb', 'bomb', 'f1-club-crests-i', '#0d3b20'],
  ['bomb-marvel', 'Marvel · sticker bomb', 'bomb', 'm2-spider-verse', '#2a0a10'], ['bomb-girly', 'Girly · sticker bomb', 'bomb', 'gen-z-girlies', '#f6d7e6'],
  ['galaxy', 'Galaxy', 'galaxy'], ['carbon', 'Carbon fibre', 'carbon'], ['marble', 'White marble', 'marble'], ['matte', 'Matte black', 'solid', '#141415'], ['sand', 'Sand', 'solid', '#d8cbb6'],
];
const LSAMPLE = { Apple: ['apple-1', 'apple-2'], Dell: ['dell-1'], Asus: ['asus-1', 'asus-2'] }, LSIZE = {"apple-1": [675, 900], "apple-2": [675, 900], "dell-1": [720, 720], "asus-1": [720, 900], "asus-2": [720, 720]};
const SKIN = Object.fromEntries(SKINS.map(s => [s[0], s]));
const lapOf = l => l && BRANDS[l.b] && BRANDS[l.b][l.m];
const D0 = () => ({ lap: null, col: 'silver', pad: 'std', surf: 'lid', skin: { lid: '', kb: '', bot: '', pad: '' }, items: { lid: [], kb: [], bot: [], pad: [] } });
let G = Object.assign(D0(), store.get('sl-design', {})); G.skin = { ...D0().skin, ...G.skin }; G.items = { ...D0().items, ...G.items }; if (!PADS[G.pad]) G.pad = 'std';
for (const k in SURFS) { G.items[k] = (G.items[k] || []).filter(o => CODE[o.c]); if (!SKIN[G.skin[k]]) G.skin[k] = ''; }
if (!LCOLS[G.col]) G.col = 'silver'; if (!SURFS[G.surf]) G.surf = 'lid'; if (G.lap && !lapOf(G.lap)) G.lap = null;
G.on = -1;
const saveG = () => store.set('sl-design', { lap: G.lap, col: G.col, pad: G.pad, surf: G.surf, skin: G.skin, items: G.items, cat: G.cat, pack: G.pack, tab: G.tab });
const dims = (s, d = G) => { if (s === 'pad') return PADS[d.pad || 'std'].slice(0, 2); const m = lapOf(d.lap) || BRANDS.Other[2]; return [m[2], m[3]]; };
const lapName = (d = G) => { const m = lapOf(d.lap); return m ? (d.lap.b === 'Other' ? m[0] : `${d.lap.b} ${m[0]}`) : 'Laptop'; };
const nStick = (d = G) => Object.values(d.items).reduce((a, v) => a + v.length, 0);
const nSkins = (d = G) => Object.values(d.skin).filter(Boolean).length;

// ---- drawing ----
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const imgs = {};
const loadImg = id => imgs[id] || (imgs[id] = new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `atlas/${id}.${IX}`; }));
const rng = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
const skinCache = {};
async function skinArt(id, W, H) {             // returns a canvas with the skin artwork at W×H
  const key = `${id}|${Math.round(W)}|${Math.round(H)}`; if (skinCache[key]) return skinCache[key];
  const s = SKIN[id], c = document.createElement('canvas'); c.width = Math.round(W); c.height = Math.round(H); const g = c.getContext('2d'), r = rng(97);
  if (s[2] === 'photo') { const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = `skins/${id}${W > 700 ? '' : '-s'}.${IX}`; });
    g.fillStyle = '#222'; g.fillRect(0, 0, W, H);
    if (im) { const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); } }
  if (s[2] === 'solid') { g.fillStyle = s[3]; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < W * H / 40; i++) g.fillRect(r() * W, r() * H, 1, 1); }
  if (s[2] === 'galaxy') {
    g.fillStyle = '#07061a'; g.fillRect(0, 0, W, H);
    [['#6b2fd6', .3, .7, .55], ['#d63f8c', .75, .25, .45], ['#1e5bd6', .85, .85, .4], ['#ff7a3a', .15, .15, .25]].forEach(([col, x, y, rad]) => {
      const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, rad * W); gr.addColorStop(0, col + 'cc'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    for (let i = 0; i < W * H / 220; i++) { const a = r(); g.fillStyle = `rgba(255,255,255,${.3 + a * .7})`; g.beginPath(); g.arc(r() * W, r() * H, a > .97 ? 1.6 : a * .9 + .2, 0, 7); g.fill(); }
  }
  if (s[2] === 'carbon') {
    g.fillStyle = '#121212'; g.fillRect(0, 0, W, H); const t = Math.max(4, W / 70);
    for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) { const odd = ((x / t | 0) + (y / t | 0)) % 2;
      const gr = g.createLinearGradient(x, y, odd ? x + t : x, odd ? y : y + t); gr.addColorStop(0, '#2b2b2b'); gr.addColorStop(.5, '#3a3a3a'); gr.addColorStop(1, '#1a1a1a'); g.fillStyle = gr; g.fillRect(x + .5, y + .5, t - 1, t - 1); }
  }
  if (s[2] === 'marble') {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f4f2ee'); gr.addColorStop(1, '#e6e1d9'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(${90 + r() * 40},${90 + r() * 40},${100 + r() * 40},${.12 + r() * .25})`; g.lineWidth = .4 + r() * 1.8;
      g.beginPath(); let x = r() * W, y = -10; g.moveTo(x, y); while (y < H + 10) { const nx = x + (r() - .45) * W * .18, ny = y + r() * H * .22; g.quadraticCurveTo(x + (r() - .5) * W * .2, (y + ny) / 2, nx, ny); x = nx; y = ny; } g.stroke(); }
  }
  if (s[2] === 'bomb') {
    g.fillStyle = s[4]; g.fillRect(0, 0, W, H);
    const p = PK[s[3]], im = await loadImg(p.id).catch(() => null);
    if (im) { const cell = Math.max(W, H) / 6.5, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1; let k = 0;
      for (let pass = 0; pass < 2; pass++) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const it = p.items[(k++ * 7) % p.items.length], sz = cell * (1.05 + r() * .35), sc = sz / Math.max(it[3], it[4]);
        g.save(); g.translate((x + (pass ? .5 : 0) + (r() - .5) * .3) * cell, (y + (pass ? .5 : 0) + (r() - .5) * .3) * cell); g.rotate((r() - .5) * .9);
        g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 4; g.drawImage(im, it[1], it[2], it[3], it[4], -it[3] * sc / 2, -it[4] * sc / 2, it[3] * sc, it[4] * sc); g.restore(); } }
  }
  return skinCache[key] = c;
}
// the laptop surface itself; skin goes under the keys on the keyboard view
async function paintSurf(g, surf, W, H, d = G) {
  const [, a, b] = LCOLS[d.col], light = ['silver', 'gold'].includes(d.col), ink = light ? 'rgba(0,0,0,' : 'rgba(255,255,255,', m = lapOf(d.lap) || BRANDS.Other[2];
  if (surf === 'pad') { const rad = Math.min(W, H) * .05; g.save(); rr(g, 0, 0, W, H, rad); g.clip(); g.fillStyle = '#141416'; g.fillRect(0, 0, W, H);
    const r0 = rng(11); g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < W * H / 50; i++) g.fillRect(r0() * W, r0() * H, 1, 1);
    if (d.skin.pad) g.drawImage(await skinArt(d.skin.pad, W, H), 0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, W / 260); g.setLineDash([W / 90, W / 160]); const m = Math.min(W, H) * .022; rr(g, m, m, W - 2 * m, H - 2 * m, rad * .8); g.stroke(); g.setLineDash([]); g.restore(); return; }
  const rad = Math.min(W, H) * .045, lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, a); lg.addColorStop(.55, b); lg.addColorStop(1, a);
  g.save(); rr(g, 0, 0, W, H, rad); g.clip(); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  if (d.skin[surf]) g.drawImage(await skinArt(d.skin[surf], W, H), 0, 0, W, H);
  if (surf === 'lid' && !d.skin.lid) { g.fillStyle = ink + '.07)'; g.beginPath(); g.arc(W / 2, H / 2, W * .04, 0, 7); g.fill(); }
  if (surf === 'kb') {
    const mac = m[4] === 'mac', pad = m[4] === 'pad', kx = W * (mac ? .1 : .06), ky = H * .06, kw = W * (mac ? .8 : .88), kh = H * .5;
    g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, kx - W * .012, ky - H * .015, kw + W * .024, kh + H * .03, W * .01); g.fill();
    const rows = [[1, 14], [14], [1.5, 12, 1.5], [1.8, 11, 2.2], [2.3, 10, 2.7], [1, 1, 1, 1.2, 5.5, 1.2, 1, 1, 1]], kcol = light && !d.skin.kb ? '#26272b' : '#0f1012';
    const mainW = pad ? kw * .79 : kw;
    rows.forEach((row, ri) => { const rh = kh / rows.length, y = ky + ri * rh + rh * .1, keys = [];
      row.forEach((v, i) => { if (row.length <= 3 && Number.isInteger(v) && v > 2) for (let j = 0; j < v; j++) keys.push(1); else keys.push(v); });
      const gap = kw * .006, tot = keys.reduce((s, v) => s + v, 0); let x = kx;
      keys.forEach(v => { const w = v / tot * (mainW - gap * (keys.length - 1)); g.fillStyle = kcol; rr(g, x, y, w, rh * (ri === 0 ? .6 : .8), rh * .12); g.fill(); x += w + gap; });
      if (pad) for (let j = 0; j < 4; j++) { const w = (kw - mainW - gap * 4) / 4; g.fillStyle = kcol; rr(g, kx + mainW + gap + j * (w + gap), y, w, rh * (ri === 0 ? .6 : .8), rh * .12); g.fill(); } });
    g.fillStyle = ink + '.09)'; g.strokeStyle = ink + '.18)'; g.lineWidth = 1; const tw = W * (mac ? .38 : .3), th = H * .3; rr(g, (W - tw) / 2 - (pad ? W * .06 : 0), H * .63, tw, th, W * .012); g.fill(); g.stroke();
  }
  if (surf === 'bot') {
    g.fillStyle = ink + '.10)'; for (let i = 0; i < 26; i++) { rr(g, W * .3 + i * W * .016, H * .1, W * .007, H * .22, 2); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; [[.08, .1], [.92, .1], [.08, .9], [.92, .9]].forEach(([x, y]) => { rr(g, x * W - W * .045, y * H - H * .02, W * .09, H * .04, H * .02); g.fill(); });
    g.fillStyle = ink + '.22)'; [[.05, .5], [.95, .5], [.5, .94], [.3, .94], [.7, .94]].forEach(([x, y]) => { g.beginPath(); g.arc(x * W, y * H, W * .006, 0, 7); g.fill(); });
  }
  const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(.35, 'rgba(255,255,255,0)'); sh.addColorStop(.7, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.05)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; rr(g, .5, .5, W - 1, H - 1, rad); g.stroke();
}
async function paintStickers(g, surf, W, H, d = G) {
  g.save(); rr(g, 0, 0, W, H, Math.min(W, H) * .045); g.clip();
  for (const o of d.items[surf]) { const { p, it } = CODE[o.c], im = await loadImg(p.id).catch(() => null); if (!im) continue;
    const L = o.s * W, k = L / Math.max(it[3], it[4]), w = it[3] * k, h = it[4] * k;
    g.save(); g.translate(o.x * W, o.y * H); g.rotate(o.r * Math.PI / 180);     g.drawImage(im, it[1], it[2], it[3], it[4], -w / 2, -h / 2, w, h); g.restore(); }
  g.restore();
}
async function designPicture(d = G, H = 420, onlyUsed = true) {   // all decorated surfaces side by side
  const used = Object.keys(SURFS).filter(k => !onlyUsed || d.items[k].length || d.skin[k]); if (!used.length) used.push('lid');
  const pad = Math.round(H * .07), lab = Math.round(H * .12), ws = used.map(k => { const [a, b] = dims(k, d); return Math.round(H * a / b); }), xs = ws.map((_, i) => pad + ws.slice(0, i).reduce((a, b) => a + b + pad, 0));
  const cv = document.createElement('canvas'); cv.width = ws.reduce((a, b) => a + b, 0) + pad * (used.length + 1); cv.height = H + pad * 2 + lab; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  for (const [i, k] of used.entries()) { const w = ws[i]; g.save(); g.translate(xs[i], pad); await paintSurf(g, k, w, H, d); await paintStickers(g, k, w, H, d); g.restore();
    g.fillStyle = '#8c8c8c'; g.font = `${Math.round(lab * .32)}px "Geist Mono", monospace`; g.textAlign = 'center';
    g.fillText(`${k === 'pad' ? PADS[d.pad || 'std'][2].toUpperCase() + ' MOUSEPAD' : SURFS[k][1].toUpperCase()}${d.skin[k] ? ' · ' + SKIN[d.skin[k]][1].toUpperCase() : ''}${d.items[k].length ? ' · ' + d.items[k].length + ' STICKERS' : ''}`, xs[i] + w / 2, pad + H + lab * .7); }
  return cv;
}
const skinThumb = async (id, el, w = 300, h = 200) => { const c = await skinArt(id, w, h), x = document.createElement('canvas'); x.width = w; x.height = h;
  const g = x.getContext('2d'); g.save(); rr(g, 0, 0, w, h, h * .07); g.clip(); g.drawImage(c, 0, 0); g.restore(); el.innerHTML = ''; el.appendChild(x); };

// ---- step 1: which laptop ----
function vPick() {
  const cur = G.lap || { b: 'HP', m: -1 }; let b = cur.b, mi = G.lap ? G.lap.m : -1, col = G.col;
  app.innerHTML = `<section class="sec dsg">
    <div class="kick-row"><span>Design · step 1 of 2</span><span>Your laptop</span></div>
    <h1 class="h1">Which laptop <em>is yours?</em></h1>
    <p class="sub">We draw your exact model at its real size, so every sticker and skin fits.</p>
    <div class="lbl" style="margin:22px 0 10px">Brand</div><div class="brands" id="pk-b"></div>
    <div class="lsamp" id="pk-s"></div>
    <div class="lbl" style="margin:22px 0 4px">Model</div><div class="models" id="pk-m"></div>
    <div class="lbl" style="margin:22px 0 10px">Colour</div><div class="lcols" id="pk-c"></div>
    <button class="btn y" type="button" id="pk-go" style="width:100%;margin-top:24px">Start designing</button>
    <p class="small" style="margin-top:12px">Not sure of your model? Look at the sticker under your laptop, or pick "Other" and choose the screen size.</p>
  </section>${footer}`;
  const draw = () => {
    $('#pk-b').innerHTML = Object.keys(BRANDS).map(k => `<button type="button" class="chip ${k === b ? 'on' : ''}" data-b="${k}">${k}</button>`).join('');
    const sm = LSAMPLE[b] || []; $('#pk-s').innerHTML = sm.length ? `<div class="lbl" style="margin:20px 0 8px">Real ${b} laptops</div><div class="hs lsr">${sm.map(k => `<img src="laptops/${k}.${IX}" width="${LSIZE[k][0]}" height="${LSIZE[k][1]}" alt="${b} laptop" loading="lazy">`).join('')}</div>` : '';
    $('#pk-m').innerHTML = BRANDS[b].map((m, i) => `<button type="button" class="mrow ${i === mi ? 'on' : ''}" data-m="${i}"><span>${m[0]}</span><span class="lbl">${m[2]} × ${m[3]} cm${i === mi ? ' ✓' : ''}</span></button>`).join('');
    $('#pk-c').innerHTML = Object.entries(LCOLS).map(([k, v]) => `<button type="button" class="lsw ${k === col ? 'on' : ''}" data-c="${k}" aria-label="${v[0]}"><i style="background:linear-gradient(135deg,${v[1]},${v[2]})"></i><span>${v[0]}</span></button>`).join('');
    $('#pk-go').disabled = mi < 0; $('#pk-go').style.opacity = mi < 0 ? .4 : 1;
  };
  app.querySelector('.dsg').onclick = e => { const t = e.target.closest('[data-b],[data-m],[data-c]'); if (!t) return;
    if (t.dataset.b) { b = t.dataset.b; mi = -1; } if (t.dataset.m) mi = +t.dataset.m; if (t.dataset.c) col = t.dataset.c; draw(); };
  $('#pk-go').onclick = () => { if (mi < 0) { toast('Pick your model first'); return; } G.lap = { b, m: mi }; G.col = col; G.mineId = null; saveG(); if (location.hash === '#design') render(); else location.hash = 'design'; };
  draw();
}

// ---- step 2: the editor ----
function vDesign() {
  if (!G.lap) return vPick();
  const tab = G.tab || 'stickers';
  app.innerHTML = `<section class="studio2">
    <div class="ed-main">
      <div class="kick-row ed-k"><span>${esc(lapName())} · ${LCOLS[G.col][0]}</span><a href="#design-pick">Change laptop</a></div>
      <div class="hs" id="ed-pad" hidden>${Object.entries(PADS).map(([k, v]) => `<button type="button" class="chip sm" data-pad="${k}">${v[2]} · ${v[0]} × ${v[1]} cm</button>`).join('')}</div>
      <div class="seg" id="ed-s">${Object.entries(SURFS).map(([k, v]) => `<button type="button" data-surf="${k}">${v[0]}<i></i></button>`).join('')}</div>
      <div class="stagewrap" id="stagewrap"><div class="stage" id="stage"><canvas id="st-bg"></canvas><div class="empty" id="st-empty"></div><span class="cm" id="st-cm" hidden></span></div></div>
      <div class="dims" id="st-dims"></div>
    </div>
    <aside class="drawer2">
      <div class="seg" id="ed-t"><button type="button" data-tab="stickers">Stickers</button><button type="button" data-tab="skins">Skins</button><button type="button" data-tab="inspo">Inspo</button></div>
      <div id="ed-pane"></div>
      <div class="acts2"><button class="btn o" type="button" id="st-undo">Undo</button><button class="btn o" type="button" id="st-save">Save</button><button class="btn y" type="button" id="st-done">Add to cart</button></div>
    </aside>
  </section>`;
  const stage = $('#stage'), bg = $('#st-bg'), wrap = $('#stagewrap'); let hist = [], tabNow = tab;
  const items = () => G.items[G.surf], snap = () => { hist.push(JSON.stringify({ i: G.items, s: G.skin })); if (hist.length > 60) hist.shift(); };
  const dimsCm = () => dims(G.surf);
  const head = () => { $('#ed-pad').hidden = G.surf !== 'pad'; document.querySelectorAll('#ed-pad [data-pad]').forEach(b => b.classList.toggle('on', b.dataset.pad === G.pad)); document.querySelectorAll('#ed-s [data-surf]').forEach(b => { b.classList.toggle('on', b.dataset.surf === G.surf); const n = G.items[b.dataset.surf].length + (G.skin[b.dataset.surf] ? 1 : 0); b.querySelector('i').textContent = n ? ` ${n}` : ''; });
    document.querySelectorAll('#ed-t [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tabNow));
    const n = nStick(); $('#st-done').textContent = n || nSkins() ? `Add to cart${n ? ` · ${CUR}${n * PRICE}` : ''}` : 'Add to cart'; };
  let paintTok = 0;
  async function layout() {
    const [w, h] = dimsCm(), ar = w / h, avail = wrap.clientWidth, mob = innerWidth < 1000, maxH = mob ? Math.max(G.surf === 'pad' && G.pad === 'xl' ? 110 : 170, innerHeight * .3) : Math.min(innerHeight * .62, 560);
    let sw = avail, sh = sw / ar; if (sh > maxH) { sh = maxH; sw = sh * ar; }
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px'; stage.style.borderRadius = Math.min(sw, sh) * .045 + 'px';
    const dpr = Math.min(2, devicePixelRatio || 1); bg.width = sw * dpr; bg.height = sh * dpr; bg.style.width = sw + 'px'; bg.style.height = sh + 'px';
    const tok = ++paintTok, off = document.createElement('canvas'); off.width = bg.width; off.height = bg.height; const og = off.getContext('2d'); og.scale(dpr, dpr);
    $('#st-dims').textContent = `${SURFS[G.surf][1]}${G.skin[G.surf] ? ' · ' + SKIN[G.skin[G.surf]][1] : ''} · ${w} × ${h} cm`;
    $('#st-empty').innerHTML = G.surf === 'pad' ? 'Pick a skin for the whole mousepad,<br>or add stickers to be printed on it.' : G.surf === 'kb' ? 'Stickers go on the palm rest.<br>Tap one below, then drag it into place.' : 'Tap a sticker below to stick it here.<br>Drag to move, pinch to resize.';
    stage.classList.toggle('is-dark', G.surf === 'pad' || !['silver', 'gold'].includes(G.col) || !!G.skin[G.surf]);
    draw(); await paintSurf(og, G.surf, sw, sh); if (tok !== paintTok) return;
    const g = bg.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bg.width, bg.height); g.drawImage(off, 0, 0);
  }
  function draw() {
    const W = stage.clientWidth, H = stage.clientHeight; stage.querySelectorAll('.it').forEach(e => e.remove());
    items().forEach((o, i) => { const { p, it } = CODE[o.c], L = o.s * W, k = L / Math.max(it[3], it[4]), w = it[3] * k, h = it[4] * k;
      const el = document.createElement('div'); el.className = 'it' + (i === G.on ? ' on' : ''); el.dataset.i = i;
      el.style.cssText = `width:${w}px;height:${h}px;transform:translate(${o.x * W - w / 2}px,${o.y * H - h / 2}px) rotate(${o.r}deg);background:url(atlas/${p.id}.${IX}) ${-it[1] * k}px ${-it[2] * k}px/${p.aw * k}px ${p.ah * k}px no-repeat`;
      if (i === G.on) el.innerHTML = `<span class="h up" data-a="up" title="Bring to front">↑</span><span class="h del" data-a="del" title="Remove">×</span><span class="h rs" data-a="rs" title="Resize and rotate">⤡</span>`;
      stage.appendChild(el); });
    $('#st-empty').hidden = items().length > 0 || !!G.skin[G.surf]; head();
  }
  // drawer panes
  function pane() {
    const p = $('#ed-pane');
    if (tabNow === 'stickers') {
      const c = CAT[G.cat] || D.cats[0]; G.cat = c.id; if (!c.packs.includes(G.pack)) G.pack = c.packs[0]; const pk = PK[G.pack];
      p.innerHTML = `<div class="hs" id="st-cats">${D.cats.map(x => `<button type="button" class="chip ${x.id === c.id ? 'on' : ''}" data-cat="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <div class="hs" id="st-packs">${c.packs.map(id => `<button type="button" class="chip sm ${id === G.pack ? 'on' : ''}" data-pk="${id}">${esc(PK[id].nice)}</button>`).join('')}</div>
        <div class="tray" id="tray">${pk.items.map(it => `<button type="button" class="tile" data-c="${it[0]}" aria-label="Stick ${it[0]}">${spr(pk, it, 50)}<span class="code">${it[0]}</span></button>`).join('')}</div>
        <div class="trayacts"><button type="button" class="lnk" id="st-fill">Fill with this pack</button><button type="button" class="lnk" id="st-clear">Clear ${SURFS[G.surf][0].toLowerCase()}</button></div>`;
      trayEvents();
      $('#st-fill').onclick = () => { snap(); const [w, h] = dimsCm(), sz = SURFS[G.surf][2], cols = Math.max(1, Math.round(w / (sz * 1.3))), rows = Math.max(1, Math.round(h * (G.surf === 'kb' ? .4 : 1) / (sz * 1.3)));
        [...pk.items].sort(() => Math.random() - .5).slice(0, cols * rows).forEach((it, k) => items().push({ c: it[0], x: (k % cols + .5) / cols + (Math.random() - .5) * .04,
          y: G.surf === 'kb' ? .62 + (Math.floor(k / cols) + .5) / rows * .36 : (Math.floor(k / cols) + .5) / rows + (Math.random() - .5) * .05, s: sz * (.85 + Math.random() * .3) / w, r: Math.round(Math.random() * 18 - 9) }));
        G.on = -1; saveG(); draw(); };
      $('#st-clear').onclick = () => { if (!items().length) return; snap(); G.items[G.surf] = []; G.on = -1; saveG(); draw(); toast('Cleared. Undo brings them back.'); };
    } else if (tabNow === 'skins') {
      p.innerHTML = `<div class="skgrid">${[['', 'No skin'], ...SKINS].map(s => `<button type="button" class="skt ${G.skin[G.surf] === s[0] ? 'on' : ''}" data-skin="${s[0]}"><span class="sk" data-art="${s[0]}">${s[0] ? '' : '<b>∅</b>'}</span><span class="lbl">${esc(s[1].replace(' · sticker bomb', ' bomb'))}</span></button>`).join('')}
        <button type="button" class="skt" id="sk-own"><span class="sk own"><b>＋</b></span><span class="lbl">Your picture</span></button></div>
        <p class="small" style="margin-top:8px">The first ${SKINS.filter(s => s[2] === 'photo').length} are real skins we've printed. The skin covers the whole ${SURFS[G.surf][1].toLowerCase()}. Stickers go on top. Skin prices are confirmed on WhatsApp.</p>`;
      p.querySelectorAll('[data-art]').forEach(el => { if (el.dataset.art) skinThumb(el.dataset.art, el, 150, 100); });
      p.querySelector('.skgrid').onclick = e => { const b = e.target.closest('[data-skin]'); if (!b) return; snap(); G.skin[G.surf] = b.dataset.skin; saveG(); pane(); layout(); };
      $('#sk-own').onclick = () => { openInspo(); $('#i-idea').value = `A ${SURFS[G.surf][1].toLowerCase()} skin for my ${lapName()} with my own picture`; };
    } else {
      p.innerHTML = INS.length ? `<div class="itray">${INS.map((x, i) => `<button type="button" data-i="${i}" style="background:${x.c}"><img src="inspo/sm/${x.id}.${IX}" alt="${esc(x.alt)}" loading="lazy"></button>`).join('')}</div><p class="small" style="margin-top:8px">Copy a look you like. Tap a photo to see it bigger.</p>` : '<p class="small">Inspiration photos are on the way.</p>';
      const t = p.querySelector('.itray'); if (t) t.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; ivList = INS.map((x, i) => i); openIv(+b.dataset.i); };
    }
    head();
  }
  const add = (code, fx, fy) => { snap(); const w = dimsCm()[0];
    items().push({ c: code, x: fx ?? .2 + Math.random() * .6, y: fy ?? (G.surf === 'kb' ? .7 + Math.random() * .2 : .25 + Math.random() * .5), s: Math.min(.6, SURFS[G.surf][2] / w), r: Math.round(Math.random() * 14 - 7) });
    G.on = items().length - 1; buzz(); saveG(); draw(); };
  function trayEvents() {
    const tray = $('#tray'); let tg = null;
    $('#st-cats').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { G.cat = b.dataset.cat; G.pack = CAT[G.cat].packs[0]; saveG(); pane(); } };
    $('#st-packs').onclick = e => { const b = e.target.closest('[data-pk]'); if (b) { G.pack = b.dataset.pk; saveG(); pane(); } };
    tray.addEventListener('pointerdown', e => { const t = e.target.closest('.tile'); if (t) tg = { c: t.dataset.c, x: e.clientX, y: e.clientY, g: null, fine: e.pointerType === 'mouse' }; });
    tray.addEventListener('pointermove', e => { if (!tg) return; const d = Math.hypot(e.clientX - tg.x, e.clientY - tg.y);
      if (!tg.fine && d > 10) { tg = null; return; }
      if (tg.fine && !tg.g && d > 8) { const { p, it } = CODE[tg.c]; tg.g = document.createElement('div'); tg.g.className = 'ghost'; tg.g.innerHTML = spr(p, it, 80); document.body.appendChild(tg.g); tray.setPointerCapture(e.pointerId); }
      if (tg.g) { tg.g.style.left = e.clientX + 'px'; tg.g.style.top = e.clientY + 'px'; } });
    tray.addEventListener('pointerup', e => { if (!tg) return; const r = stage.getBoundingClientRect();
      if (tg.g) { tg.g.remove(); if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) add(tg.c, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }
      else add(tg.c); tg = null; });
    tray.addEventListener('pointercancel', () => { if (tg && tg.g) tg.g.remove(); tg = null; });
    tray.addEventListener('click', e => { if (e.detail === 0) { const t = e.target.closest('.tile'); if (t) add(t.dataset.c); } });
  }
  // stage gestures
  const showCm = o => { const c = $('#st-cm'); c.hidden = !o; if (o) c.textContent = `${(o.s * dimsCm()[0]).toFixed(1)} cm`; };
  const pts = new Map(); let drag = null; const R = () => stage.getBoundingClientRect();
  stage.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const h = e.target.closest('.h'), el = e.target.closest('.it'), r = R(), its = items();
    if (pts.size === 2 && G.on >= 0) { const [a, b] = [...pts.values()], o = its[G.on];
      drag = { m: 'pinch', i: G.on, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), s0: o.s, r0: o.r }; stage.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (h) { e.stopPropagation(); const i = G.on, o = its[i];
      if (h.dataset.a === 'del') { snap(); its.splice(i, 1); G.on = -1; saveG(); draw(); return; }
      if (h.dataset.a === 'up') { snap(); its.push(its.splice(i, 1)[0]); G.on = its.length - 1; saveG(); draw(); return; }
      snap(); const cx = r.left + o.x * r.width, cy = r.top + o.y * r.height;
      drag = { m: 'rs', i, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, a0: Math.atan2(e.clientY - cy, e.clientX - cx), s0: o.s, r0: o.r };
    } else if (el) { const i = +el.dataset.i; snap(); G.on = i; drag = { m: 'mv', i, ox: e.clientX, oy: e.clientY, x0: its[i].x, y0: its[i].y }; draw(); }
    else { G.on = -1; draw(); return; }
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener('pointermove', e => { if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return; const r = R(), o = items()[drag.i]; if (!o) return; const mx = Math.min(.9, 14 / dimsCm()[0]), mn = 1.5 / dimsCm()[0];
    if (drag.m === 'pinch' && pts.size >= 2) { const [a, b] = [...pts.values()]; o.s = Math.min(mx, Math.max(mn, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0)); o.r = Math.round(drag.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180 / Math.PI); showCm(o); }
    else if (drag.m === 'mv') { o.x = Math.min(1, Math.max(0, drag.x0 + (e.clientX - drag.ox) / r.width)); o.y = Math.min(1, Math.max(0, drag.y0 + (e.clientY - drag.oy) / r.height)); }
    else if (drag.m === 'rs') { o.s = Math.min(mx, Math.max(mn, drag.s0 * Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / drag.d0)); o.r = Math.round(drag.r0 + (Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) - drag.a0) * 180 / Math.PI); showCm(o); }
    draw(); });
  const end = e => { pts.delete(e.pointerId); if (drag && (drag.m !== 'pinch' || pts.size < 2)) { drag = null; showCm(null); saveG(); } };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  $('#ed-pad').onclick = e => { const b = e.target.closest('[data-pad]'); if (!b) return; G.pad = b.dataset.pad; saveG(); layout(); };
  $('#ed-s').onclick = e => { const b = e.target.closest('[data-surf]'); if (!b) return; G.surf = b.dataset.surf; G.on = -1; saveG(); layout(); if (tabNow !== 'stickers') pane(); else head(); };
  $('#ed-t').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tabNow = G.tab = b.dataset.tab; saveG(); pane(); };
  $('#st-undo').onclick = () => { if (!hist.length) { toast('Nothing to undo'); return; } const h = JSON.parse(hist.pop()); G.items = h.i; G.skin = h.s; G.on = -1; saveG(); layout(); if (tabNow === 'skins') pane(); };
  $('#st-save').onclick = () => saveMine();
  $('#st-done').onclick = () => designToCart();
  pane(); new ResizeObserver(() => layout()).observe(wrap); layout();
}
const designSnap = () => ({ lap: G.lap, col: G.col, pad: G.pad, skin: { ...G.skin }, items: JSON.parse(JSON.stringify(G.items)) });
async function saveMine(silent) {
  if (!nStick() && !nSkins()) { toast('Add a sticker or a skin first'); return; }
  const d = designSnap(), pic = await designPicture(d, 160, false), t = document.createElement('canvas'); t.width = 360; t.height = Math.round(360 * pic.height / pic.width);
  t.getContext('2d').drawImage(pic, 0, 0, t.width, t.height);
  const mine = store.get('sl-mine', []).filter(m => m.id !== G.mineId); G.mineId = G.mineId || Date.now().toString(36);
  mine.unshift({ id: G.mineId, at: Date.now(), name: `${lapName(d)}`, d, thumb: t.toDataURL('image/jpeg', .72) }); store.set('sl-mine', mine.slice(0, 12)); saveG();
  if (!silent) toast('Saved to Inspo → Mine');
}
async function designToCart() {
  const n = nStick(), sk = nSkins(); if (!n && !sk) { toast('Add a sticker or a skin first'); return; }
  const counts = {}; Object.values(G.items).flat().forEach(o => counts[o.c] = (counts[o.c] || 0) + 1);
  Object.entries(counts).forEach(([c, q]) => cart[c] = Math.max(cart[c] || 0, q));
  store.set('sl-dsg', designSnap()); saveCart(); updBar(); await saveMine(true); buzz(); openCart();
}
const dsgLine = d => !d ? '' : d.v === 3 ? `${d.name} (${d.col}): ` + Object.keys(d.items).filter(k => (d.items[k] || []).length || (d.skin || {})[k]).map(k => `${{ lid: 'lid', kb: 'keyboard', bot: 'bottom' }[k]}${d.skin[k] ? ' with ' + (SKIN[d.skin[k]] ? SKIN[d.skin[k]][1] : d.skin[k].replace('s-', '').replace('ph-', '')) + ' skin' : ''}${d.items[k].length ? `${d.skin[k] ? ' +' : ''} ${d.items[k].length} sticker${d.items[k].length > 1 ? 's' : ''}` : ''}`).join(', ') : `${lapName(d)} (${LCOLS[d.col][0]}): ` + Object.keys(SURFS).filter(k => (d.items[k] || []).length || (d.skin || {})[k]).map(k => `${k === 'pad' ? (PADS[d.pad || 'std'][2] + ' mousepad ' + PADS[d.pad || 'std'][0] + '×' + PADS[d.pad || 'std'][1] + ' cm').toLowerCase() : SURFS[k][0].toLowerCase()}${d.skin[k] ? ' with ' + SKIN[d.skin[k]][1] + ' skin' : ''}${d.items[k].length ? `${d.skin[k] ? ' +' : ''} ${d.items[k].length} sticker${d.items[k].length > 1 ? 's' : ''}` : ''}`).join(', ');
const dsgPack = d => d && d.v === 3 ? { v: 3, n: d.name, c: d.col, k: d.skin, i: Object.fromEntries(Object.entries(d.items).map(([k, v]) => [k, v.map(o => [o.c, +o.x.toFixed(3), +o.y.toFixed(3), +o.s.toFixed(3), o.r])])) } : d && { l: [d.lap.b, d.lap.m], c: d.col, p: d.pad, k: d.skin, i: Object.fromEntries(Object.entries(d.items).map(([k, v]) => [k, v.map(o => [o.c, +o.x.toFixed(3), +o.y.toFixed(3), +o.s.toFixed(3), o.r])])) };
const dsgUnpack = p => p && p.v === 3 ? { v: 3, name: p.n, col: p.c, skin: { lid: '', kb: '', bot: '', ...p.k }, items: Object.fromEntries(Object.entries({ lid: [], kb: [], bot: [], ...p.i }).map(([k, v]) => [k, v.filter(o => CODE[o[0]]).map(([c, x, y, s, r]) => ({ c, x, y, s, r }))])) } : p && { lap: { b: p.l[0], m: p.l[1] }, col: p.c, pad: p.p || 'std', skin: { lid: '', kb: '', bot: '', pad: '', ...p.k }, items: Object.fromEntries(Object.entries({ lid: [], kb: [], bot: [], pad: [], ...p.i }).map(([k, v]) => [k, v.filter(o => CODE[o[0]]).map(([c, x, y, s, r]) => ({ c, x, y, s, r }))])) };

// ---- inspo: Ideas | Mine ----
function vMine() {
  const mine = store.get('sl-mine', []);
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    <div class="seg iseg"><a href="#inspo">Ideas</a><a href="#mine" class="on">Mine</a></div>
    <div class="ihead"><div><h1 class="h1">Your <em>designs.</em></h1><p class="sub">Saved on this phone. Tap one to keep editing or to order it.</p></div></div>
    ${mine.length ? `<div class="mine">${mine.map(m => `<div class="mcard"><button type="button" class="mimg" data-open="${m.id}"><img src="${m.thumb}" alt="${esc(m.name)} design"></button>
      <div class="mmeta"><div><b>${esc(m.name)}</b><span class="lbl">${nStick(m.d)} stickers${nSkins(m.d) ? ' · ' + nSkins(m.d) + ' skin' + (nSkins(m.d) > 1 ? 's' : '') : ''} · ${new Date(m.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div><button type="button" class="lnk" data-del="${m.id}">Delete</button></div></div>`).join('')}</div>`
      : `<div class="insempty">Nothing saved yet. Design your laptop and tap <b>Save</b>, and it shows up here.<div style="margin-top:14px"><a class="btn y" href="#design">Start designing</a></div></div>`}
    <button type="button" class="xcard" id="ins-own" style="margin-top:18px"><span class="xicon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span><span><b>Send your own idea</b><small>A picture, a name or a logo, as stickers or a full skin. From ${CUR}15.</small></span></button>
  </section>${footer}`;
  $('#ins-own').onclick = openInspo;
  const m = app.querySelector('.mine'); if (m) m.onclick = e => { const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { const x = store.get('sl-mine', []).find(y => y.id === o.dataset.open); if (!x) return; if (x.d.v === 3) { store.set('sl-design3', { i: x.d.li, col: x.d.col, items: x.d.items, skin: x.d.skin }); location.href = '/design/'; return; } Object.assign(G, JSON.parse(JSON.stringify(x.d)), { mineId: x.id, on: -1 }); saveG(); location.hash = 'design'; }
    if (d) { store.set('sl-mine', store.get('sl-mine', []).filter(y => y.id !== d.dataset.del)); vMine(); toast('Deleted'); } };
}

// ---- home: Skins ----
function skinSheet(id) {   // pick a size, like a product page
  const sk = SKIN[id]; if (!sk) return; let z = store.get('sl-skinsize', 'M');
  let box = $('#sks'); if (!box) { box = document.createElement('div'); box.id = 'sks'; box.className = 'sheet'; document.body.appendChild(box); box.addEventListener('click', e => { if (e.target === box) box.hidden = true; }); }
  const draw = () => { box.innerHTML = `<div class="in" role="dialog" aria-label="${esc(sk[1])} skin"><div class="grab"></div><h3>Laptop skin <button type="button" class="chip" id="skx">Close</button></h3>
    <img class="skimg" src="skins/${id}.${IX}" alt="${esc(sk[1])} laptop skin"><h3 class="skn">${esc(sk[1])}</h3><p class="small">Full vinyl skin for the lid, matte laminate, bubble-free. Pick your size:</p>
    <div class="skz">${Object.entries(SKINP).map(([k, t]) => `<button type="button" data-z="${k}" class="${k === z ? 'on' : ''}"><b>${t.name}</b><small>${t.fit}</small><i>${CUR}${t.price}</i></button>`).join('')}</div>
    <button class="btn y" type="button" id="skadd">Add to cart · ${CUR}${SKINP[z].price}</button>
    <div class="two"><a class="btn o" href="/design/" id="sktry">Try it on my laptop</a><button class="btn o" type="button" id="skbuy">Buy now</button></div></div>`;
    $('#skx').onclick = () => box.hidden = true;
    box.querySelector('.skz').onclick = e => { const b = e.target.closest('[data-z]'); if (b) { z = b.dataset.z; store.set('sl-skinsize', z); buzz(); draw(); } };
    $('#skadd').onclick = () => { const k = `skin~${id}~${z}`; setPack(k, (packs[k] || 0) + 1); buzz(); box.hidden = true; toast(`${sk[1]} skin (${SKINP[z].name}) added`); };
    $('#skbuy').onclick = () => { box.hidden = true; orderNow([[`skin~${id}~${z}`, 1]], []); };
    $('#sktry').onclick = () => { const st = store.get('sl-design3', {}) || {}; st.skin = { ...(st.skin || {}), lid: id }; st.skinSize = z; store.set('sl-design3', st); }; };
  draw(); box.hidden = false; }
function skinsGrid() {
  return `<div class="skp">${Object.values(SKINP).map(t => `<span><b>${t.name}</b><small>${t.fit}</small><i>${CUR}${t.price}</i></span>`).join('')}</div><div class="cats skins">${SKINS.filter(s => s[2] === 'photo').map((s, i) => `<a class="catc" href="#" data-skin="${s[0]}"><div class="table sk" data-art="${s[0]}" style="aspect-ratio:3/2;background:#111"></div>
    <div class="cmeta"><span class="no">${String(i + 1).padStart(2, '0')}</span><b>${esc(s[1])}</b><span>from ${CUR}${SKINP.S.price} · S · M · L · Custom</span></div></a>`).join('')}
    <a class="catc" href="#" data-ownskin="1"><div class="table" style="aspect-ratio:3/2;background:#0a0a0a;display:grid;place-items:center;border:1px dashed var(--line2)"><span style="font-size:30px">＋</span></div>
    <div class="cmeta"><span class="no">${String(SKINS.filter(s => s[2] === 'photo').length + 1).padStart(2, '0')}</span><b>Your own picture</b><span>Send it on WhatsApp</span></div></a></div>`;
}
function wireSkins(root) {
  root.querySelectorAll('[data-art]').forEach(el => skinThumb(el.dataset.art, el, 330, 220));
  root.querySelectorAll('[data-skin]').forEach(a => a.onclick = e => { e.preventDefault(); skinSheet(a.dataset.skin); });
  const own = root.querySelector('[data-ownskin]'); if (own) own.onclick = e => { e.preventDefault(); openInspo(); $('#i-idea').value = 'A full laptop skin with my own picture'; };
}

// ---------- router ----------
function render() {
  const r = route(); closeSheets();
  if (r === 'design' || r === 'studio' || r === 'design-pick') { location.replace('/design/'); return; }
  if (r === 'cart') { history.replaceState(null, '', location.pathname); vHome(); setTimeout(openCart, 50); } else if (r === 'inspo') vInspo(); else if (r === 'mine') vMine(); else if (r === 'categories') vCats(); else if (r.startsWith('order-')) vOrder(r); else if (r.startsWith('v-')) vView(r.slice(2)); else if (r.startsWith('o-')) vSealed(r.slice(2).split('.')[0]); else if (r.startsWith('unlock-')) vUnlock(r.slice(7)); else if (r === 'unlocked') vUnlock(store.get('sl-owner', '')); else if (CAT[r]) vCat(CAT[r]); else if (PK[r]) vPack(PK[r]); else vHome();
  scrollTo(0, 0);
  const tab = r === 'inspo' || r === 'mine' ? 'inspo' : r.startsWith('design') || r === 'studio' ? 'design' : 'home'; document.body.classList.toggle('is-design', tab === 'design' && r !== 'design-pick' && !!G.lap);
  ['home', 'design', 'inspo'].forEach(k => { $('#t-' + k).classList.toggle('on', tab === k); $('#nv-' + k).classList.toggle('on', tab === k); });
  updBar(); document.documentElement.classList.remove('nh');
}
addEventListener('hashchange', render);
fetch('/api/catalog/').then(r => r.ok ? r.json() : null).then(c => { if (!c) return; try { localStorage.setItem('sl-drops', JSON.stringify(c)); } catch (e) {}
  if (addDrops(c) && !document.querySelector('.sheet:not([hidden])')) { const y = scrollY; render(); scrollTo(0, y); } }).catch(() => {});
let rt, lw = innerWidth;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lw) { lw = innerWidth; const y = scrollY; render(); scrollTo(0, y); } }, 200); });
// AVIF when the browser decodes it (almost all now), WebP otherwise. Decided before the first paint.
let IX = 'webp';
(() => { let done = 0; const go = () => { if (!done++) render(); };
  try { if (localStorage.getItem('sl-ix') === 'avif') { IX = 'avif'; return go(); } } catch (e) {}
  const t = new Image(); t.onload = () => { if (t.width === 2) { IX = 'avif'; try { localStorage.setItem('sl-ix', 'avif'); } catch (e) {} } go(); };
  t.onerror = go; setTimeout(go, 250); t.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAA2iAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg'; })();
})();