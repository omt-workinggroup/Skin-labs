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
const total = Object.keys(CODE).length;
const light = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const waIcon = '<svg class="wa-i"><use href="#wa"/></svg>';
function spr(p, it, box, extra = '') {
  const [, x, y, w, h] = it, s = box / Math.max(w, h);
  return `<span class="s" style="display:block;width:${w * s}px;height:${h * s}px;background:url(atlas/${p.id}.${IX}) ${-x * s}px ${-y * s}px/${p.aw * s}px ${p.ah * s}px no-repeat;${extra}"></span>`;
}
const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

// ---------- cart: packs { packId: qty } + singles { code: qty } ----------
let cart = {}, packs = {};
const old = store.get('sl-sel', null); if (Array.isArray(old)) old.forEach(c => cart[c] = 1);
Object.assign(cart, store.get('sl-cart', {})); Object.assign(packs, store.get('sl-packs', {}));
Object.keys(cart).forEach(c => { if (!CODE[c] || !(cart[c] > 0)) delete cart[c]; });
Object.keys(packs).forEach(k => { if (!PK[k] || !(packs[k] > 0)) delete packs[k]; });
let who = store.get('sl-who', { name: '', loc: '', note: '' });
const saveCart = () => { store.set('sl-cart', cart); store.set('sl-packs', packs); };
const nSingles = () => Object.values(cart).reduce((a, b) => a + b, 0);
const nPacks = () => Object.values(packs).reduce((a, b) => a + b, 0);
function curDsg() { const d = store.get('sl-dsg', null); if (!d || !d.lap || !d.items) return null;
  return Object.values(d.items).some(v => v.length) || Object.values(d.skin || {}).some(Boolean) ? d : null; }
const dsgSkins = () => { const d = curDsg(); return d ? Object.values(d.skin).filter(Boolean).length : 0; };
const count = () => nSingles() + nPacks() + dsgSkins();
const money = () => nSingles() * PRICE + Object.entries(packs).reduce((a, [k, q]) => a + q * PK[k].price, 0);
const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
function toggle(code) { if (cart[code]) delete cart[code]; else cart[code] = 1; buzz(); saveCart(); updBar(); }
function setQty(code, q) { if (q <= 0) delete cart[code]; else cart[code] = Math.min(q, 99); saveCart(); updBar(); }
function setPack(id, q) { if (q <= 0) delete packs[id]; else packs[id] = Math.min(q, 20); saveCart(); updBar(); }
const PIDX = id => D.packs.findIndex(p => p.id === id);
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
async function orderRef(s) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return 'SL-' + [...h.slice(0, 5)].map(b => A[b & 31]).join(''); }
async function sealedText(pk, items) {
  try { const s = await sealOrder({ n: who.name, l: who.loc, m: who.note, p: pk.map(([k, q]) => [PIDX(k), q]), s: items, d: dsgPack(curDsg()), t: Date.now() });
    return orderText(pk, items, { link: base + '#o-' + s + '.k', ref: await orderRef(s) }); }
  catch (e) { return orderText(pk, items); }
}
function orderText(pk, items, lk = null, dg = curDsg()) {
  let t = `🛒 *New order*\nHello Skin Lab, I'd like to order:\n`, i = 0, tot = 0;
  if (pk.length) { t += `\n*Sticker packs*\n` + pk.map(([k, q]) => { tot += q * PK[k].price; return `${++i}. ${PK[k].nice} pack (${PK[k].items.length} stickers) x${q} = ${CUR}${q * PK[k].price}`; }).join('\n') + '\n'; }
  if (items.length) { const n = items.reduce((a, [, q]) => a + q, 0); tot += n * PRICE;
    t += `\n*My own picks* (${CUR}${PRICE} each)\n` + items.map(([c, q]) => `${++i}. ${c} (${CODE[c].p.nice}) x${q} = ${CUR}${q * PRICE}`).join('\n') + '\n'; }
  if (dg) { t += `\n*My laptop design*\n${dsgLine(dg)}\n`; if (Object.values(dg.skin).some(Boolean)) t += `(skin price to confirm on WhatsApp)\n`; }
  t += `\n*Total: ${CUR}${tot}*${dg && Object.values(dg.skin).some(Boolean) ? ' + skin' : ''}\n`;
  if (who.name) t += `\nName: ${who.name}`;
  if (who.loc) t += `\nLocation: ${who.loc}`;
  if (who.note) t += `\nNote: ${who.note}`;
  if (!lk) return lk === false ? t + `\n\nOrder link: ${SITE}#o-•••••• (private, only Skin Lab can open it)` : t;
  return t + `\n\nOrder ${lk.ref}\nOrder link (only Skin Lab can open it): ${lk.link}`;
}
const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
function updBar() {
  const n = count(), np = nPacks(), ns = nSingles();
  $('#bar-n').textContent = n;
  $('#bar-t').textContent = [np ? `${np} pack${np > 1 ? 's' : ''}` : '', ns ? `${ns} sticker${ns > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ') + ' in your cart';
  $('#bar-p').textContent = `${CUR}${money()}`;
  $('#bar').classList.toggle('show', n > 0);
  for (const id of ['#t-bd', '#nv-bd']) { $(id).hidden = !n; $(id).textContent = n; }
  document.querySelectorAll('.grid .tile[data-c]').forEach(t => { const q = cart[t.dataset.c]; t.classList.toggle('sel', !!q); const k = t.querySelector('.chk'); if (k) k.textContent = q > 1 ? q : '✓'; });
  document.querySelectorAll('[data-packbtn]').forEach(b => { const q = packs[b.dataset.packbtn]; b.innerHTML = q ? `In your cart (${q}) · add one more` : `Add to cart, keep shopping`; });
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Order copied'); } catch (e) { toast('Could not copy. Long-press to select instead.'); } }
const closeSheets = () => { document.querySelectorAll('.sheet').forEach(s => s.hidden = true); $('#lb').hidden = true; };
document.querySelectorAll('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) s.hidden = true; }));

// WhatsApp-style preview of the exact message we will receive
const waFmt = t => esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(https?:\/\/\S+)/g, '<u>$1</u>').replace(/\n/g, '<br>');
function openCart() {
  const items = Object.entries(cart), pk = Object.entries(packs), b = $('#c-body');
  const dg = curDsg();
  if (!items.length && !pk.length && !dg) {
    b.innerHTML = `<div class="empty-c"><b>Your cart is empty</b>Pick a pack, or design your laptop.</div><a class="btn y" href="#" id="c-go">Choose a category</a>`;
    $('#c-go').onclick = () => $('#cart').hidden = true;
  } else {
    const ns = nSingles();
    b.innerHTML = `${dg ? `<div class="dsgc"><div class="dimg" id="c-dsg"></div><div class="dtx"><b>Your laptop design</b><span>${esc(dsgLine(dg))}</span><span class="dl"><a href="#design" id="c-edit">Edit</a><button type="button" class="lnk" id="c-rmd">Remove</button></span></div></div>` : ''}${pk.length ? `<div class="rows">${pk.map(([k, q]) => `<div class="row"><div class="th"><img src="sheets-sm/${k}.${IX}" alt="" loading="lazy" style="height:54px;width:auto;border-radius:3px"></div><div class="nm"><b style="font-family:var(--body)">${esc(PK[k].nice)} pack</b><span>${PK[k].items.length} stickers · ${CUR}${PK[k].price}</span></div>
        <div class="qty"><button type="button" data-p="${k}" data-d="-1" aria-label="One less ${esc(PK[k].nice)} pack">−</button><span>${q}</span><button type="button" data-p="${k}" data-d="1" aria-label="One more ${esc(PK[k].nice)} pack">+</button></div></div>`).join('')}</div>` : ''}
      ${items.length ? `<div class="grp">Single stickers · ${CUR}${PRICE} each</div><div class="rows">${items.map(([c, q]) => `<div class="row"><div class="th">${spr(CODE[c].p, CODE[c].it, 50)}</div><div class="nm"><b>${c}</b><span>${esc(CODE[c].p.nice)}</span></div>
        <div class="qty"><button type="button" data-q="${c}" data-d="-1" aria-label="One less ${c}">−</button><span>${q}</span><button type="button" data-q="${c}" data-d="1" aria-label="One more ${c}">+</button></div></div>`).join('')}</div>` : ''}
      <div class="sum"><div class="big" style="border:0;padding:0;margin:0"><span>Total</span><span>${CUR}${money()}</span></div><div class="small"><span>Delivery is agreed on WhatsApp</span></div></div>
      <div class="two"><div class="fld" id="f-name"><label for="c-name">Your name</label><input id="c-name" autocomplete="name" placeholder="e.g. Ama" value="${esc(who.name)}"></div>
      <div class="fld"><label for="c-loc">Location</label><input id="c-loc" autocomplete="address-level2" placeholder="e.g. Legon" value="${esc(who.loc)}"></div></div>
      <div class="grp">This is the message we'll get</div>
      <div class="wachat"><div class="wahead">${waIcon}<span><b>Skin Lab</b><small>055 836 2423</small></span></div><div class="wabody"><div class="bub" id="c-prev"></div></div></div>
      <button class="btn wa" type="button" id="c-send">${waIcon}Send order on WhatsApp</button>
      <div class="two"><button class="btn o" type="button" id="c-copy">Copy order</button><button class="btn o" type="button" id="c-clear">Empty cart</button></div>`;
    const txt = () => orderText(Object.entries(packs), Object.entries(cart), false), sealed = () => sealedText(Object.entries(packs), Object.entries(cart));
    const keep = () => { who = { name: $('#c-name').value.trim(), loc: $('#c-loc').value.trim(), note: who.note || '' }; store.set('sl-who', who); $('#c-prev').innerHTML = waFmt(txt()) + '<span class="tm">now ✓✓</span>'; };
    ['#c-name', '#c-loc'].forEach(s => $(s).addEventListener('input', keep)); keep();
    b.onclick = e => { const k = e.target.closest('[data-q],[data-p]'); if (!k) return;
      if (k.dataset.q) setQty(k.dataset.q, (cart[k.dataset.q] || 0) + +k.dataset.d); else setPack(k.dataset.p, (packs[k.dataset.p] || 0) + +k.dataset.d); openCart(); };
    $('#c-send').onclick = async () => { keep(); if (!who.name) { $('#f-name').classList.add('err'); $('#c-name').focus(); toast('Add your name so we know who is ordering'); return; }
      store.set('sl-last', { packs: { ...packs }, cart: { ...cart }, at: Date.now() });
      const b = $('#c-send'); b.disabled = true; const u = waLink(await sealed()); b.disabled = false;
      if (!window.open(u, '_blank', 'noopener')) location.href = u; };
    $('#c-copy').onclick = async () => { keep(); copy(await sealed()); };
    $('#c-clear').onclick = () => { cart = {}; packs = {}; store.set('sl-dsg', null); saveCart(); updBar(); openCart(); };
    if (dg) { designPicture(dg, 150).then(c => { const el = $('#c-dsg'); if (el) { el.innerHTML = ''; el.appendChild(c); } });
      $('#c-edit').onclick = () => { $('#cart').hidden = true; };
      $('#c-rmd').onclick = () => { Object.values(dg.items).flat().forEach(o => { if (cart[o.c]) { cart[o.c]--; if (cart[o.c] <= 0) delete cart[o.c]; } });
        store.set('sl-dsg', null); saveCart(); updBar(); openCart(); toast('Design removed from the cart'); }; }
  }
  $('#cart').hidden = false;
}
function reorder() { const l = store.get('sl-last', null); if (!l) return; cart = {}; packs = {};
  Object.entries(l.cart || {}).forEach(([c, q]) => { if (CODE[c]) cart[c] = q; }); Object.entries(l.packs || {}).forEach(([k, q]) => { if (PK[k]) packs[k] = q; });
  saveCart(); updBar(); openCart(); }
$('#bar-go').onclick = openCart; $('#t-cart').onclick = openCart; $('#nv-cart').onclick = openCart;
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
  return `<div class="cats">${D.cats.map((c, ci) => { const ps = c.packs.map(id => PK[id]), lo = Math.min(...ps.map(p => p.price));
    return `<a class="catc" href="#${c.id}"><div class="table" style="--tb:${ps[0].bg}">${ps.slice(0, 2).reverse().map((p, i, a) => `<img src="sheets-xs/${p.id}.${IX}" alt="${esc(p.nice)} sticker pack" width="${Math.round(p.sw * .3)}" height="${Math.round(p.sh * .3)}" ${ci < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--r:${[-5, 9][a.length - 1 - i]}deg;--x:${[-10, 24][a.length - 1 - i]}%">`).join('')}</div>
      <div class="cmeta"><span class="no">${String(ci + 1).padStart(2, '0')}</span><b>${esc(c.name)}</b><span>${c.packs.length} pack${c.packs.length > 1 ? 's' : ''} · from ${CUR}${lo}</span></div></a>`; }).join('')}</div>`;
}
function lastOrder() {
  const l = store.get('sl-last', null); if (!l) return '';
  const pk = Object.entries(l.packs || {}).filter(([k]) => PK[k]), ns = Object.values(l.cart || {}).reduce((a, b) => a + b, 0);
  if (!pk.length && !ns) return '';
  const label = [...pk.map(([k, q]) => `${q > 1 ? q + '× ' : ''}${PK[k].nice}`), ns ? `${ns} single sticker${ns > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
  return `<button type="button" class="again" id="again"><span class="ic">↻</span><span><b>Order again</b><small>${esc(label)}</small></span><span class="go">Open</span></button>`;
}
function vHome() {
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    ${lastOrder()}
    <div class="kick-row"><span>Laptop skins &amp; stickers · Accra</span><span>From ${CUR}50</span></div>
    <div class="sech hero2"><div><h1 class="h1 hero-h">Your laptop, <em>your story.</em></h1><p class="hsub">Skins and sticker packs, printed in Accra.</p></div>${INS.length > 4 ? `<a class="hcol" href="#inspo" aria-label="See sticker inspiration">${[[0, -5, 0, 4], [3, 4, 34, 0], [12, -2, 56, 14]].map(([k, r, x, y]) => `<img src="inspo/sm/${INS[k].id}.${IX}" alt="" loading="lazy" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)">`).join('')}<span class="lbl">Inspiration →</span></a>` : ''}</div>
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
      return `<div class="pack"><a href="#${p.id}" class="pv" style="--tb:${p.bg}"><img src="sheets-sm/${p.id}.${IX}" alt="${esc(p.nice)} sticker sheet" width="${Math.round(p.sw * .44)}" height="${Math.round(p.sh * .44)}" loading="lazy" decoding="async"></a>
        <div class="meta"><a href="#${p.id}"><b>${esc(p.nice)}</b><span>${p.items.length} stickers on one sheet</span></a><span class="price">${CUR}${p.price}</span></div>
        <div class="pbtns"><button class="btn y" type="button" data-quick="${p.id}">Order this pack</button><a class="btn o" href="#${p.id}">See stickers</a></div></div>`; }).join('')}</div>
    <a class="xcard" href="#inspo" style="margin-top:16px"><span><b>Looking for ideas?</b><small>Browse sticker inspiration, then we'll make the one you like.</small></span></a>
  </section>${footer}`;
  app.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => { const id = b.dataset.quick; if (!packs[id]) setPack(id, 1); buzz(); openCart(); });
}
function vPack(p) {
  const c = CAT[p.cat], lt = light(p.bg);
  app.innerHTML = `<section class="sec" style="padding-top:14px">
    <div class="crumb"><a href="#">Categories</a> / <a href="#${c.id}">${esc(c.name)}</a></div>
    ${c.packs.length > 1 ? `<div class="hs" style="margin:2px 0 12px">${c.packs.map(id => `<a class="chip ${id === p.id ? 'on' : ''}" href="#${id}">${esc(PK[id].nice)}</a>`).join('')}</div>` : ''}
    <div class="phero">
      <button type="button" class="sheetimg" id="zoom" style="--tb:${p.bg}" aria-label="See the ${esc(p.nice)} sheet bigger"><img src="sheets/${p.id}.${IX}" alt="${esc(p.nice)} sticker sheet" width="${p.sw}" height="${p.sh}" fetchpriority="high" decoding="async"><span class="zm">Tap to zoom</span></button>
      <div class="pinfo">
        <span class="lbl">${esc(c.name)} · ${p.items.length} stickers</span>
        <h2>${esc(p.nice)}</h2>
        <p class="sub">${p.items.length} stickers on one ${p.price >= 60 ? 'A4' : ''} sheet, ${esc(p.tag)}. Peel them one by one for your laptop, keyboard, mousepad and phone.</p>
        <div class="bigprice">${CUR}${p.price}<small>for the full pack</small></div>
        <button class="btn wa" type="button" id="orderpack">${waIcon}Order this pack</button>
        <button class="btn o" type="button" data-packbtn="${p.id}" id="addpack"></button>
        <div class="two"><a class="btn o" href="#inspo">Inspiration</a><button class="btn o" type="button" id="toinspo">Send your idea</button></div>
      </div>
    </div>
    <div class="sech" style="margin-top:26px"><div><h2 style="font-size:clamp(32px,8vw,48px)">What's <em>inside</em></h2><p class="sub">Only want a few? Tap them to pick singles at ${CUR}${PRICE} each. Hold one to see it bigger.</p></div></div>
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
  $('#addpack').onclick = () => { setPack(p.id, (packs[p.id] || 0) + 1); buzz(); toast(`${p.nice} pack added. Keep shopping or open your cart.`); };
  $('#orderpack').onclick = () => { if (!packs[p.id]) setPack(p.id, 1); buzz(); openCart(); };
  $('#toinspo').onclick = openInspo;
  $('#zoom').onclick = () => { $('#lb-img').src = `sheets/${p.id}.${IX}`; $('#lb').hidden = false; };
}
// order pages. Owner phone: full order. Anyone else (the customer included): a notice.
function orderBody(pk, items, o, ref) {
  const tot = pk.reduce((a, [k, q]) => a + q * PK[k].price, 0) + items.reduce((a, [, q]) => a + q * PRICE, 0), n = items.reduce((a, [, q]) => a + q, 0);
  const when = o && o.t ? new Date(o.t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  app.innerHTML = `<section class="sec ord">
    <div class="kick-row"><span>${ref ? `Order ${ref}` : 'Order'}</span><span>${when}</span></div>
    <h1 class="h1">${o && o.n ? esc(o.n) : 'Sticker order'}</h1>
    ${o && (o.l || o.m) ? `<dl class="who">${o.l ? `<div><dt>Location</dt><dd>${esc(o.l)}</dd></div>` : ''}${o.m ? `<div><dt>Note</dt><dd>${esc(o.m)}</dd></div>` : ''}</dl>` : ''}
    ${pk.length ? `<div class="lbl" style="margin-top:22px">Packs</div><div class="orows">${pk.map(([k, q]) => `<a class="orow" href="#${k}"><span class="th" style="background:${PK[k].bg}"><img src="sheets-sm/${k}.${IX}" alt="" loading="lazy"></span><span class="nm"><b>${esc(PK[k].nice)}</b><small>${PK[k].items.length} stickers · ${CUR}${PK[k].price}</small></span><span class="q">×${q}</span><span class="pr">${CUR}${q * PK[k].price}</span></a>`).join('')}</div>` : ''}
    ${items.length ? `<div class="lbl" style="margin-top:22px">Single stickers · ${n} × ${CUR}${PRICE}</div><div class="oview" id="ov"></div>` : ''}
    ${o && o.d ? `<div class="lbl" style="margin-top:22px">Laptop design</div><p style="margin:8px 0">${esc(dsgLine(dsgUnpack(o.d)))}</p><div class="odsg" id="o-dsg"></div>` : ''}
    <div class="otot"><span>Total</span><b>${CUR}${tot}</b></div>
    <div class="ctas" style="margin-top:16px"><button class="btn y" type="button" id="o-copy">Copy order</button><a class="btn o" href="#">Back to the shop</a></div>
    <p class="small" style="margin-top:14px">Only this phone can open Skin Lab order links.</p></section>${footer}`;
  const g = $('#ov');
  if (g) { const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, cell = (g.clientWidth - 20 - (cols - 1) * 8) / cols;
    g.innerHTML = items.map(([c, q]) => `<div class="tile" style="background:${CODE[c].p.bg}">${spr(CODE[c].p, CODE[c].it, cell * .8)}<span class="code">${c}</span><span class="chk">${q > 1 ? q : '✓'}</span></div>`).join(''); }
  const sv = who; who = { name: o && o.n || '', loc: o && o.l || '', note: o && o.m || '' };
  const od = o && o.d ? dsgUnpack(o.d) : null;
  const t = orderText(pk, items, null, od) + (ref ? `\n\nOrder ${ref}` : ''); who = sv;
  if (od) designPicture(od, 300).then(c => { const el = $('#o-dsg'); if (el) { el.innerHTML = ''; el.appendChild(c); } });
  $('#o-copy').onclick = () => copy(t);
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
  if (!isOwner()) return vNotice(ref);
  try { const o = await openSealed(s);
    orderBody((o.p || []).filter(([i]) => D.packs[i]).map(([i, q]) => [D.packs[i].id, q]), (o.s || []).filter(([c]) => CODE[c]), o, ref); }
  catch (e) { app.innerHTML = `<section class="sec notice"><div class="kick-row"><span>Order ${ref}</span><span>Error</span></div><h1 class="h1">This link is <em>incomplete.</em></h1><p class="sub">Part of it was probably cut off when it was copied. Ask the customer to send it again, or read the order in their message.</p></section>${footer}`; }
}
function vOrder(r) {
  if (!isOwner()) return vNotice('');
  const pk = [], items = [];
  r.slice(6).split('-').forEach(t => { let m = t.match(/^K(\d+)(?:x(\d+))?$/); if (m && D.packs[+m[1]]) { pk.push([D.packs[+m[1]].id, +(m[2] || 1)]); return; }
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
const ITAGS = [['', 'All'], ['laptop', 'On laptops'], ['code', 'Coding'], ['pop', 'Anime & pop'], ['custom', 'Custom']];
const hasT = (x, k) => !k || (x.t || '').split(' ').includes(k);
let insF = '', ivList = [], ivI = 0;
function vInspo() {
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    <div class="seg iseg"><a href="#inspo" class="on">Ideas</a><a href="#mine">Mine</a></div>
    <div class="ihead"><div><h1 class="h1">Sticker <em>inspiration.</em></h1><p class="sub">Laptops and sticker sheets we like. Tap one and we'll print stickers like it.</p></div></div>
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
    c.html += `<button type="button" class="insp" data-n="${n}" style="background:${x.c};aspect-ratio:${x.w}/${x.h}" aria-label="${esc(x.alt)}"><img src="inspo/sm/${x.id}.${IX}" width="${x.w}" height="${x.h}" alt="${esc(x.alt)}" ${n < 4 ? '' : 'loading="lazy"'} decoding="async" onload="this.classList.add('ok')">${hasT(x, 'laptop') && insF !== 'laptop' ? '<span class="il">On a laptop</span>' : ''}</button>`; });
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
const SURFS = { lid: ['Lid', 'Laptop lid', 5.5], kb: ['Keyboard', 'Keyboard area', 3.2], bot: ['Bottom', 'Bottom', 6] };
const SKINS = [
  ['bomb-code', 'Code · sticker bomb', 'bomb', 'p1-hacker-mode', '#0b1310'], ['bomb-anime', 'Anime · sticker bomb', 'bomb', 'an1-anime-legends', '#151a2c'],
  ['bomb-gaming', 'Gaming · sticker bomb', 'bomb', 'g1-gta-rockstar', '#1d1230'], ['bomb-football', 'Football · sticker bomb', 'bomb', 'f1-club-crests-i', '#0d3b20'],
  ['bomb-marvel', 'Marvel · sticker bomb', 'bomb', 'm2-spider-verse', '#2a0a10'], ['bomb-girly', 'Girly · sticker bomb', 'bomb', 'gen-z-girlies', '#f6d7e6'],
  ['galaxy', 'Galaxy', 'galaxy'], ['carbon', 'Carbon fibre', 'carbon'], ['marble', 'White marble', 'marble'], ['matte', 'Matte black', 'solid', '#141415'], ['sand', 'Sand', 'solid', '#d8cbb6'],
];
const SKIN = Object.fromEntries(SKINS.map(s => [s[0], s]));
const lapOf = l => l && BRANDS[l.b] && BRANDS[l.b][l.m];
const D0 = () => ({ lap: null, col: 'silver', surf: 'lid', skin: { lid: '', kb: '', bot: '' }, items: { lid: [], kb: [], bot: [] } });
let G = Object.assign(D0(), store.get('sl-design', {}));
for (const k in SURFS) { G.items[k] = (G.items[k] || []).filter(o => CODE[o.c]); if (!SKIN[G.skin[k]]) G.skin[k] = ''; }
if (!LCOLS[G.col]) G.col = 'silver'; if (!SURFS[G.surf]) G.surf = 'lid'; if (G.lap && !lapOf(G.lap)) G.lap = null;
G.on = -1;
const saveG = () => store.set('sl-design', { lap: G.lap, col: G.col, surf: G.surf, skin: G.skin, items: G.items, cat: G.cat, pack: G.pack, tab: G.tab });
const dims = (s, d = G) => { const m = lapOf(d.lap) || BRANDS.Other[2]; return [m[2], m[3]]; };
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
    g.save(); g.translate(o.x * W, o.y * H); g.rotate(o.r * Math.PI / 180); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = Math.max(2, W / 120); g.shadowOffsetY = W / 300;
    g.drawImage(im, it[1], it[2], it[3], it[4], -w / 2, -h / 2, w, h); g.restore(); }
  g.restore();
}
async function designPicture(d = G, H = 420, onlyUsed = true) {   // all decorated surfaces side by side
  const used = Object.keys(SURFS).filter(k => !onlyUsed || d.items[k].length || d.skin[k]); if (!used.length) used.push('lid');
  const [w0, h0] = dims('lid', d), pad = Math.round(H * .07), lab = Math.round(H * .12), w = Math.round(H * w0 / h0);
  const cv = document.createElement('canvas'); cv.width = used.length * w + pad * (used.length + 1); cv.height = H + pad * 2 + lab; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  for (const [i, k] of used.entries()) { g.save(); g.translate(pad + i * (w + pad), pad); await paintSurf(g, k, w, H, d); await paintStickers(g, k, w, H, d); g.restore();
    g.fillStyle = '#8c8c8c'; g.font = `${Math.round(lab * .32)}px "Geist Mono", monospace`; g.textAlign = 'center';
    g.fillText(`${SURFS[k][1].toUpperCase()}${d.skin[k] ? ' · ' + SKIN[d.skin[k]][1].toUpperCase() : ''}${d.items[k].length ? ' · ' + d.items[k].length + ' STICKERS' : ''}`, pad + i * (w + pad) + w / 2, pad + H + lab * .7); }
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
    <div class="lbl" style="margin:22px 0 4px">Model</div><div class="models" id="pk-m"></div>
    <div class="lbl" style="margin:22px 0 10px">Colour</div><div class="lcols" id="pk-c"></div>
    <button class="btn y" type="button" id="pk-go" style="width:100%;margin-top:24px">Start designing</button>
    <p class="small" style="margin-top:12px">Not sure of your model? Look at the sticker under your laptop, or pick "Other" and choose the screen size.</p>
  </section>${footer}`;
  const draw = () => {
    $('#pk-b').innerHTML = Object.keys(BRANDS).map(k => `<button type="button" class="chip ${k === b ? 'on' : ''}" data-b="${k}">${k}</button>`).join('');
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
  const head = () => { document.querySelectorAll('#ed-s [data-surf]').forEach(b => { b.classList.toggle('on', b.dataset.surf === G.surf); const n = G.items[b.dataset.surf].length + (G.skin[b.dataset.surf] ? 1 : 0); b.querySelector('i').textContent = n ? ` ${n}` : ''; });
    document.querySelectorAll('#ed-t [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tabNow));
    const n = nStick(); $('#st-done').textContent = n || nSkins() ? `Add to cart${n ? ` · ${CUR}${n * PRICE}` : ''}` : 'Add to cart'; };
  let paintTok = 0;
  async function layout() {
    const [w, h] = dimsCm(), ar = w / h, avail = wrap.clientWidth, mob = innerWidth < 1000, maxH = mob ? Math.max(170, innerHeight * .3) : Math.min(innerHeight * .62, 560);
    let sw = avail, sh = sw / ar; if (sh > maxH) { sh = maxH; sw = sh * ar; }
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px'; stage.style.borderRadius = Math.min(sw, sh) * .045 + 'px';
    const dpr = Math.min(2, devicePixelRatio || 1); bg.width = sw * dpr; bg.height = sh * dpr; bg.style.width = sw + 'px'; bg.style.height = sh + 'px';
    const tok = ++paintTok, off = document.createElement('canvas'); off.width = bg.width; off.height = bg.height; const og = off.getContext('2d'); og.scale(dpr, dpr);
    $('#st-dims').textContent = `${SURFS[G.surf][1]}${G.skin[G.surf] ? ' · ' + SKIN[G.skin[G.surf]][1] : ''} · ${w} × ${h} cm`;
    $('#st-empty').innerHTML = G.surf === 'kb' ? 'Stickers go on the palm rest.<br>Tap one below, then drag it into place.' : 'Tap a sticker below to stick it here.<br>Drag to move, pinch to resize.';
    stage.classList.toggle('is-dark', !['silver', 'gold'].includes(G.col) || !!G.skin[G.surf]);
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
        <p class="small" style="margin-top:8px">The skin covers the whole ${SURFS[G.surf][1].toLowerCase()}. Stickers go on top. Skin prices are confirmed on WhatsApp.</p>`;
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
  $('#ed-s').onclick = e => { const b = e.target.closest('[data-surf]'); if (!b) return; G.surf = b.dataset.surf; G.on = -1; saveG(); layout(); if (tabNow !== 'stickers') pane(); else head(); };
  $('#ed-t').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tabNow = G.tab = b.dataset.tab; saveG(); pane(); };
  $('#st-undo').onclick = () => { if (!hist.length) { toast('Nothing to undo'); return; } const h = JSON.parse(hist.pop()); G.items = h.i; G.skin = h.s; G.on = -1; saveG(); layout(); if (tabNow === 'skins') pane(); };
  $('#st-save').onclick = () => saveMine();
  $('#st-done').onclick = () => designToCart();
  pane(); new ResizeObserver(() => layout()).observe(wrap); layout();
}
const designSnap = () => ({ lap: G.lap, col: G.col, skin: { ...G.skin }, items: JSON.parse(JSON.stringify(G.items)) });
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
const dsgLine = d => !d ? '' : `${lapName(d)} (${LCOLS[d.col][0]}): ` + Object.keys(SURFS).filter(k => d.items[k].length || d.skin[k]).map(k => `${SURFS[k][0].toLowerCase()}${d.skin[k] ? ' with ' + SKIN[d.skin[k]][1] + ' skin' : ''}${d.items[k].length ? `${d.skin[k] ? ' +' : ''} ${d.items[k].length} sticker${d.items[k].length > 1 ? 's' : ''}` : ''}`).join(', ');
const dsgPack = d => d && { l: [d.lap.b, d.lap.m], c: d.col, k: d.skin, i: Object.fromEntries(Object.entries(d.items).map(([k, v]) => [k, v.map(o => [o.c, +o.x.toFixed(3), +o.y.toFixed(3), +o.s.toFixed(3), o.r])])) };
const dsgUnpack = p => p && { lap: { b: p.l[0], m: p.l[1] }, col: p.c, skin: p.k, items: Object.fromEntries(Object.entries(p.i).map(([k, v]) => [k, v.filter(o => CODE[o[0]]).map(([c, x, y, s, r]) => ({ c, x, y, s, r }))])) };

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
    if (o) { const x = store.get('sl-mine', []).find(y => y.id === o.dataset.open); if (!x) return; Object.assign(G, JSON.parse(JSON.stringify(x.d)), { mineId: x.id, on: -1 }); saveG(); location.hash = 'design'; }
    if (d) { store.set('sl-mine', store.get('sl-mine', []).filter(y => y.id !== d.dataset.del)); vMine(); toast('Deleted'); } };
}

// ---- home: Skins ----
function skinsGrid() {
  return `<div class="cats skins">${SKINS.map((s, i) => `<a class="catc" href="#design" data-useskin="${s[0]}"><div class="table sk" data-art="${s[0]}" style="aspect-ratio:3/2;background:#111"></div>
    <div class="cmeta"><span class="no">${String(i + 1).padStart(2, '0')}</span><b>${esc(s[1])}</b><span>Made to fit your laptop</span></div></a>`).join('')}
    <a class="catc" href="#" data-ownskin="1"><div class="table" style="aspect-ratio:3/2;background:#0a0a0a;display:grid;place-items:center;border:1px dashed var(--line2)"><span style="font-size:30px">＋</span></div>
    <div class="cmeta"><span class="no">${String(SKINS.length + 1).padStart(2, '0')}</span><b>Your own picture</b><span>Send it on WhatsApp</span></div></a></div>`;
}
function wireSkins(root) {
  root.querySelectorAll('[data-art]').forEach(el => skinThumb(el.dataset.art, el, 330, 220));
  root.querySelectorAll('[data-useskin]').forEach(a => a.onclick = () => { G.skin.lid = a.dataset.useskin; G.surf = 'lid'; G.tab = 'skins'; saveG(); });
  const own = root.querySelector('[data-ownskin]'); if (own) own.onclick = e => { e.preventDefault(); openInspo(); $('#i-idea').value = 'A full laptop skin with my own picture'; };
}

// ---------- router ----------
function render() {
  const r = route(); closeSheets();
  if (r === 'inspo') vInspo(); else if (r === 'mine') vMine(); else if (r === 'design' || r === 'studio') vDesign(); else if (r === 'design-pick') vPick(); else if (r === 'categories') vCats(); else if (r.startsWith('order-')) vOrder(r); else if (r.startsWith('o-')) vSealed(r.slice(2).split('.')[0]); else if (r.startsWith('unlock-')) vUnlock(r.slice(7)); else if (r === 'unlocked') vUnlock(store.get('sl-owner', '')); else if (CAT[r]) vCat(CAT[r]); else if (PK[r]) vPack(PK[r]); else vHome();
  scrollTo(0, 0);
  const tab = r === 'inspo' || r === 'mine' ? 'inspo' : r.startsWith('design') || r === 'studio' ? 'design' : 'home'; document.body.classList.toggle('is-design', tab === 'design' && r !== 'design-pick' && !!G.lap);
  ['home', 'design', 'inspo'].forEach(k => { $('#t-' + k).classList.toggle('on', tab === k); $('#nv-' + k).classList.toggle('on', tab === k); });
  updBar(); document.documentElement.classList.remove('nh');
}
addEventListener('hashchange', render);
let rt, lw = innerWidth;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lw) { lw = innerWidth; const y = scrollY; render(); scrollTo(0, y); } }, 200); });
// AVIF when the browser decodes it (almost all now), WebP otherwise. Decided before the first paint.
let IX = 'webp';
(() => { let done = 0; const go = () => { if (!done++) render(); };
  try { if (localStorage.getItem('sl-ix') === 'avif') { IX = 'avif'; return go(); } } catch (e) {}
  const t = new Image(); t.onload = () => { if (t.width === 2) { IX = 'avif'; try { localStorage.setItem('sl-ix', 'avif'); } catch (e) {} } go(); };
  t.onerror = go; setTimeout(go, 250); t.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAA2iAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg'; })();
})();