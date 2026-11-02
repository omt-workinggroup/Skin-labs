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
const count = () => nSingles() + nPacks();
const money = () => nSingles() * PRICE + Object.entries(packs).reduce((a, [k, q]) => a + q * PK[k].price, 0);
const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
function toggle(code) { if (cart[code]) delete cart[code]; else cart[code] = 1; buzz(); saveCart(); updBar(); }
function setQty(code, q) { if (q <= 0) delete cart[code]; else cart[code] = Math.min(q, 99); saveCart(); updBar(); }
function setPack(id, q) { if (q <= 0) delete packs[id]; else packs[id] = Math.min(q, 20); saveCart(); updBar(); }
const PIDX = id => D.packs.findIndex(p => p.id === id);
const orderLink = (pk, items) => base + '#order-' + [...pk.map(([k, q]) => 'K' + PIDX(k) + (q > 1 ? 'x' + q : '')), ...items.map(([c, q]) => c.replace('-', '') + (q > 1 ? 'x' + q : ''))].join('-');
function orderText(pk, items, extra = '') {
  let t = `🛒 *New order*\nHello Skin Lab, I'd like to order:\n`, i = 0, tot = 0;
  if (pk.length) { t += `\n*Sticker packs*\n` + pk.map(([k, q]) => { tot += q * PK[k].price; return `${++i}. ${PK[k].nice} pack (${PK[k].items.length} stickers) x${q} = ${CUR}${q * PK[k].price}`; }).join('\n') + '\n'; }
  if (items.length) { const n = items.reduce((a, [, q]) => a + q, 0); tot += n * PRICE;
    t += `\n*My own picks* (${CUR}${PRICE} each)\n` + items.map(([c, q]) => `${++i}. ${c} (${CODE[c].p.nice}) x${q} = ${CUR}${q * PRICE}`).join('\n') + '\n'; }
  t += `\n*Total: ${CUR}${tot}*\n`;
  if (who.name) t += `\nName: ${who.name}`;
  if (who.loc) t += `\nLocation: ${who.loc}`;
  if (who.note) t += `\nNote: ${who.note}`;
  if (extra) t += `\n${extra}`;
  return t + `\n\nSee my order: ${orderLink(pk, items)}`;
}
const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
function updBar() {
  const n = count(), np = nPacks(), ns = nSingles();
  $('#bar-n').textContent = n;
  $('#bar-t').textContent = [np ? `${np} pack${np > 1 ? 's' : ''}` : '', ns ? `${ns} sticker${ns > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ') + ' in your cart';
  $('#bar-p').textContent = `${CUR}${money()}`;
  $('#bar').classList.toggle('show', n > 0 && route() !== 'studio');
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
  if (!items.length && !pk.length) {
    b.innerHTML = `<div class="empty-c"><b>Your cart is empty</b>Pick a category and choose a pack.</div><a class="btn y" href="#" id="c-go">Choose a category</a>`;
    $('#c-go').onclick = () => $('#cart').hidden = true;
  } else {
    const ns = nSingles();
    b.innerHTML = `${pk.length ? `<div class="rows">${pk.map(([k, q]) => `<div class="row"><div class="th"><img src="sheets-sm/${k}.${IX}" alt="" loading="lazy" style="height:54px;width:auto;border-radius:3px"></div><div class="nm"><b style="font-family:var(--body)">${esc(PK[k].nice)} pack</b><span>${PK[k].items.length} stickers · ${CUR}${PK[k].price}</span></div>
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
    const txt = () => orderText(Object.entries(packs), Object.entries(cart));
    const keep = () => { who = { name: $('#c-name').value.trim(), loc: $('#c-loc').value.trim(), note: who.note || '' }; store.set('sl-who', who); $('#c-prev').innerHTML = waFmt(txt()) + '<span class="tm">now ✓✓</span>'; };
    ['#c-name', '#c-loc'].forEach(s => $(s).addEventListener('input', keep)); keep();
    b.onclick = e => { const k = e.target.closest('[data-q],[data-p]'); if (!k) return;
      if (k.dataset.q) setQty(k.dataset.q, (cart[k.dataset.q] || 0) + +k.dataset.d); else setPack(k.dataset.p, (packs[k.dataset.p] || 0) + +k.dataset.d); openCart(); };
    $('#c-send').onclick = () => { keep(); if (!who.name) { $('#f-name').classList.add('err'); $('#c-name').focus(); toast('Add your name so we know who is ordering'); return; }
      store.set('sl-last', { packs: { ...packs }, cart: { ...cart }, at: Date.now() });
      const u = waLink(txt()); if (!window.open(u, '_blank', 'noopener')) location.href = u; };
    $('#c-copy').onclick = () => { keep(); copy(txt()); };
    $('#c-clear').onclick = () => { cart = {}; packs = {}; saveCart(); updBar(); openCart(); };
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
$('#t-cats').onclick = openInspo; $('#nv-cats').onclick = openInspo;
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
const footer = `<footer><div><div class="sig">Thanks for stopping by.</div>Skin Lab is run by Baiden Creatives in Accra. Questions, custom ideas or bulk orders for your class or office, just message us.</div>
  <div>WhatsApp / Call<br><span class="num">055 836 2423</span></div><div>Instagram<br><span class="num">@baidencreatives</span></div></footer>`;
const HERO = [['p1-hacker-mode', 4, 6, 30], ['g1-gta-rockstar', 33, 3, 26], ['m2-spider-verse', 62, 5, 30], ['k1-sneakerhead-1', 8, 40, 24], ['v2-jdm-and-euro', 36, 34, 30], ['an1-anime-legends', 70, 38, 24],
  ['gen-z-girlies', 3, 70, 26], ['f1-club-crests-i', 30, 66, 26], ['p2-ai-vibe-coding', 57, 66, 30], ['d1-dark-street-art-1', 82, 72, 18], ['b1-moto-bike-life-1', 86, 10, 18], ['c1-marvel-chibis', 48, 18, 16]];

// category covers: the real printed sheets of that category, laid on a table like a product photo
function catGrid() {
  return `<div class="cats">${D.cats.map((c, ci) => { const ps = c.packs.map(id => PK[id]), lo = Math.min(...ps.map(p => p.price));
    return `<a class="catc" href="#${c.id}"><div class="table" style="--tb:${ps[0].bg}">${ps.slice(0, 2).reverse().map((p, i, a) => `<img src="sheets-xs/${p.id}.${IX}" alt="${esc(p.nice)} sticker pack" width="${Math.round(p.sw * .3)}" height="${Math.round(p.sh * .3)}" ${ci < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--r:${[-5, 9][a.length - 1 - i]}deg;--x:${[-10, 24][a.length - 1 - i]}%">`).join('')}</div>
      <div class="cmeta"><b>${esc(c.name)}</b><span>${c.packs.length} pack${c.packs.length > 1 ? 's' : ''} · from ${CUR}${lo}</span></div></a>`; }).join('')}</div>`;
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
    <div class="sech"><div><h1 class="h1">Laptop sticker packs, printed in Accra</h1><p class="sub">Pick a category to see the packs. Full sheets from ${CUR}50, or build your own from ${CUR}${PRICE} a sticker.</p></div></div>
    ${catGrid()}
    <div class="extra">
      <a class="xcard" href="#studio"><span class="xart" id="xa1"></span><span><b>Design your own layout</b><small>Pick single stickers from any pack and arrange them on a laptop. ${CUR}${PRICE} each.</small></span></a>
      <button type="button" class="xcard" id="x-inspo"><span class="xart" id="xa2"></span><span><b>Send us your idea</b><small>Your name, picture or logo made into stickers. From ${CUR}15.</small></span></button>
    </div>
  </section>${footer}`;
  const art = (id, list) => { $(id).innerHTML = list.map(([pid, k], i) => spr(PK[pid], PK[pid].items[k], 52, `transform:rotate(${[-8, 7][i]}deg);margin-right:-12px`)).join(''); };
  art('#xa1', [['p3-code-languages-1', 3], ['m2-spider-verse', 2]]); art('#xa2', [['emoji-mood', 0], ['anime-vibes', 4]]);
  $('#x-inspo').onclick = openInspo;
  if ($('#again')) $('#again').onclick = reorder;
}
function vCats() { vHome(); }
function vCat(c) {
  app.innerHTML = `<section class="sec" style="padding-top:14px">
    <div class="crumb"><a href="#">Categories</a> / <span>${esc(c.name)}</span></div>
    <div class="sech"><div><h2>${esc(c.name)} packs</h2><p class="sub">Tap a pack to see every sticker on it.</p></div></div>
    <div class="packs">${c.packs.map(id => { const p = PK[id];
      return `<div class="pack"><a href="#${p.id}" class="pv" style="--tb:${p.bg}"><img src="sheets-sm/${p.id}.${IX}" alt="${esc(p.nice)} sticker sheet" width="${Math.round(p.sw * .44)}" height="${Math.round(p.sh * .44)}" loading="lazy" decoding="async"></a>
        <div class="meta"><a href="#${p.id}"><b>${esc(p.nice)}</b><span>${p.items.length} stickers on one sheet</span></a><span class="price">${CUR}${p.price}</span></div>
        <div class="pbtns"><button class="btn y" type="button" data-quick="${p.id}">Order this pack</button><a class="btn o" href="#${p.id}">See stickers</a></div></div>`; }).join('')}</div>
    <a class="xcard" href="#studio" style="margin-top:16px"><span><b>Want only some of them?</b><small>Design your own layout with single stickers at ${CUR}${PRICE} each.</small></span></a>
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
        <span class="kick">the whole sheet</span>
        <h2>${esc(p.nice)}</h2>
        <p class="sub">${p.items.length} stickers on one ${p.price >= 60 ? 'A4' : ''} sheet, ${esc(p.tag)}. Peel them one by one for your laptop, keyboard, mousepad and phone.</p>
        <div class="bigprice">${CUR}${p.price}<small>for the full pack</small></div>
        <button class="btn wa" type="button" id="orderpack">${waIcon}Order this pack</button>
        <button class="btn o" type="button" data-packbtn="${p.id}" id="addpack"></button>
        <div class="two"><a class="btn o" href="#studio" id="diy">Design your own</a><button class="btn o" type="button" id="toinspo">Send your idea</button></div>
      </div>
    </div>
    <div class="sech" style="margin-top:26px"><div><h2 style="font-size:clamp(28px,7vw,40px)">What's inside</h2><p class="sub">Only want a few? Tap them to pick singles at ${CUR}${PRICE} each. Hold one to see it bigger.</p></div></div>
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
  $('#diy').onclick = () => { S.cat = c.id; S.pack = p.id; saveS(); };
  $('#toinspo').onclick = openInspo;
  $('#zoom').onclick = () => { $('#lb-img').src = `sheets/${p.id}.${IX}`; $('#lb').hidden = false; };
}
// an order link sent on WhatsApp: #order-K12x2-PRG014x2-GAM003
function vOrder(r) {
  const pk = [], items = [];
  r.slice(6).split('-').forEach(t => { let m = t.match(/^K(\d+)(?:x(\d+))?$/); if (m && D.packs[+m[1]]) { pk.push([D.packs[+m[1]].id, +(m[2] || 1)]); return; }
    m = t.match(/^([A-Z]{3})(\d{3})(?:x(\d+))?$/); if (m && CODE[`${m[1]}-${m[2]}`]) items.push([`${m[1]}-${m[2]}`, +(m[3] || 1)]); });
  const tot = pk.reduce((a, [k, q]) => a + q * PK[k].price, 0) + items.reduce((a, [, q]) => a + q * PRICE, 0);
  app.innerHTML = `<section class="sec"><h2>Sticker order</h2><p class="sub">${CUR}${tot} in total.</p>
    ${pk.length ? `<h3 class="grp" style="margin-top:16px">Packs</h3><div class="packs">${pk.map(([k, q]) => `<a class="pack" href="#${k}"><div class="pv" style="--tb:${PK[k].bg}"><img src="sheets-sm/${k}.${IX}" alt="" loading="lazy"></div><div class="meta"><div><b>${esc(PK[k].nice)}</b><span>${PK[k].items.length} stickers</span></div><span class="price">x${q}</span></div></a>`).join('')}</div>` : ''}
    ${items.length ? `<h3 class="grp" style="margin-top:16px">Single stickers</h3><div class="oview" id="ov"></div>` : ''}
    <div class="ctas" style="margin-top:16px"><button class="btn y" type="button" id="o-add">Put this in my cart</button><a class="btn o" href="#categories">See all packs</a></div></section>${footer}`;
  const g = $('#ov');
  if (g) { const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, cell = (g.clientWidth - 20 - (cols - 1) * 8) / cols;
    g.innerHTML = items.map(([c, q]) => `<div class="tile" style="background:${CODE[c].p.bg}">${spr(CODE[c].p, CODE[c].it, cell * .8)}<span class="code">${c}</span><span class="chk">${q > 1 ? q : '✓'}</span></div>`).join(''); }
  $('#o-add').onclick = () => { items.forEach(([c, q]) => cart[c] = q); pk.forEach(([k, q]) => packs[k] = q); saveCart(); updBar(); openCart(); };
}

// ---------- studio: lid, keyboard, mousepad, phone at real sizes ----------
const LAP = { '13.3': [30.4, 21.2], '14': [32.2, 22.4], '15.6': [35.8, 24.2], '16': [35.6, 24.8], '17.3': [39.8, 26.8] }, SIZES = ['13.3', '14', '15.6', '16', '17.3'];
const PADS = { std: [25, 21, 'Standard'], xl: [80, 30, 'Desk mat'] };
const COLS = { space: ['Space grey', '#3d3e44', '#1f2023'], silver: ['Silver', '#e6e8ec', '#b8bbc2'], black: ['Black', '#232326', '#0b0b0c'], white: ['White', '#f6f5f1', '#d9d8d2'], pink: ['Pink', '#f7c9da', '#e59bb8'], blue: ['Blue', '#5f7fd8', '#2f4ea8'] };
const SURF = {
  lid: { name: 'Laptop lid', short: 'Lid', dims: () => LAP[S.size], def: 5.5 },
  kb: { name: 'Keyboard area', short: 'Keyboard', dims: () => [LAP[S.size][0], Math.round(LAP[S.size][1] * 9.6) / 10], def: 3.5 },
  pad: { name: 'Mousepad', short: 'Mousepad', dims: () => PADS[S.pad].slice(0, 2), def: 5 },
  phone: { name: 'Phone back', short: 'Phone', dims: () => [7.5, 15.6], def: 3 },
};
let S = { size: '15.6', pad: 'std', surf: 'lid', col: { lid: 'space', kb: 'space', pad: 'black', phone: 'black' }, items: { lid: [], kb: [], pad: [], phone: [] } };
(() => { const o = store.get('sl-studio', {});
  if (Array.isArray(o.items)) o.items = { lid: o.items }; if (o.lid && COLS[o.lid]) o.col = { ...S.col, lid: o.lid };
  Object.assign(S, o, { col: { ...S.col, ...(o.col || {}) }, items: { ...S.items, ...(o.items || {}) } });
  for (const k in SURF) S.items[k] = (S.items[k] || []).filter(i => CODE[i.c]);
  if (!LAP[S.size]) S.size = '15.6'; if (!PADS[S.pad]) S.pad = 'std'; if (!SURF[S.surf]) S.surf = 'lid'; S.on = -1; })();
const saveS = () => store.set('sl-studio', { size: S.size, pad: S.pad, surf: S.surf, col: S.col, items: S.items, cat: S.cat, pack: S.pack, sized: S.sized });
const allItems = () => Object.values(S.items).flat();

// paint a surface onto a canvas context (used for the live stage and the final picture)
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function paint(g, surf, W, H) {
  const [, a, b] = COLS[S.col[surf]], lg = g.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, a); lg.addColorStop(.62, b); lg.addColorStop(1, a);
  g.clearRect(0, 0, W, H); g.fillStyle = lg;
  const lightCol = ['silver', 'white', 'pink'].includes(S.col[surf]), ink = lightCol ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
  if (surf === 'lid') { rr(g, 0, 0, W, H, W * .035); g.fill();
    g.fillStyle = ink + '.08)'; g.beginPath(); g.arc(W / 2, H / 2, W * .045, 0, 7); g.fill(); }
  if (surf === 'kb') { rr(g, 0, 0, W, H, W * .03); g.fill();
    const kx = W * .07, ky = H * .07, kw = W * .86, kh = H * .48, rows = [14, 14, 13, 12, 11, 8];
    g.fillStyle = ink + '.06)'; rr(g, kx - W * .01, ky - H * .015, kw + W * .02, kh + H * .03, W * .012); g.fill();
    rows.forEach((n, r) => { const rh = kh / rows.length, y = ky + r * rh + rh * .1, gap = kw * .006;
      const widths = r === 5 ? [1, 1, 1, 1.4, 5, 1.4, 1, 1] : Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1) && r > 1 ? 1.6 : 1);
      const tot = widths.reduce((s, v) => s + v, 0); let x = kx;
      widths.forEach(wv => { const w = wv / tot * (kw - gap * (widths.length - 1)); g.fillStyle = lightCol ? '#2a2b2f' : '#111214'; rr(g, x, y, w, rh * .8, rh * .14); g.fill(); x += w + gap; }); });
    g.fillStyle = ink + '.07)'; rr(g, W * .33, H * .62, W * .34, H * .3, W * .015); g.fill(); }
  if (surf === 'pad') { rr(g, 0, 0, W, H, Math.min(W, H) * .06); g.fill();
    let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647; g.fillStyle = ink + '.035)';
    for (let i = 0; i < W * H / 60; i++) g.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
    g.strokeStyle = ink + '.22)'; g.lineWidth = Math.max(1.5, W * .004); g.setLineDash([W * .012, W * .008]);
    const m = Math.min(W, H) * .025; rr(g, m, m, W - 2 * m, H - 2 * m, Math.min(W, H) * .05); g.stroke(); g.setLineDash([]); }
  if (surf === 'phone') { rr(g, 0, 0, W, H, W * .16); g.fill();
    g.fillStyle = ink + '.10)'; rr(g, W * .07, W * .07, W * .42, W * .42, W * .1); g.fill();
    g.fillStyle = '#0a0a0b'; [[.18, .18], [.38, .18], [.18, .38]].forEach(([x, y]) => { g.beginPath(); g.arc(W * x, W * y, W * .075, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(80,90,120,.6)'; [[.18, .18], [.38, .18], [.18, .38]].forEach(([x, y]) => { g.beginPath(); g.arc(W * x, W * y, W * .03, 0, 7); g.fill(); }); }
}

function vStudio() {
  app.innerHTML = `<section class="studio">
    <div class="stagebox">
      <div class="surfs" role="tablist" aria-label="What are you decorating?">${Object.entries(SURF).map(([k, v]) => `<button type="button" role="tab" data-surf="${k}">${v.short}<i></i></button>`).join('')}</div>
      <div class="hs opts" id="st-opts"></div>
      <div class="stagewrap" id="stagewrap"><div class="stage" id="stage"><canvas id="st-bg"></canvas><div class="empty" id="st-empty"></div><div class="glare"></div><span class="cm" id="st-cm" hidden></span></div></div>
      <div class="dims" id="st-dims"></div>
      <div class="acts"><button class="btn o" type="button" id="st-undo">Undo</button><button class="btn o" type="button" id="st-fill">Fill</button><button class="btn o" type="button" id="st-clear">Clear</button><button class="btn y" type="button" id="st-done">Done</button></div>
    </div>
    <aside class="lib">
      <h2>Pick stickers</h2>
      <div class="hs" id="st-cats">${D.cats.map(c => `<button type="button" class="chip" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div>
      <div class="hs" id="st-packs"></div>
      <div class="tray" id="tray"></div>
    </aside>
  </section>`;
  const stage = $('#stage'), tray = $('#tray'), bg = $('#st-bg'), wrap = $('#stagewrap');
  let hist = [];
  const items = () => S.items[S.surf];
  const snap = () => { hist.push(JSON.stringify(S.items)); if (hist.length > 50) hist.shift(); };
  const dimsCm = () => SURF[S.surf].dims();

  function opts() {
    const s = S.surf, sz = s === 'lid' || s === 'kb' ? SIZES.map(k => `<button type="button" class="chip ${S.size === k ? 'on' : ''}" data-size="${k}">${k}″</button>`).join('')
      : s === 'pad' ? Object.entries(PADS).map(([k, v]) => `<button type="button" class="chip ${S.pad === k ? 'on' : ''}" data-pad="${k}">${v[2]}</button>`).join('') : '';
    $('#st-opts').innerHTML = sz + `<span class="sep"></span>` + Object.entries(COLS).map(([k, v]) => `<button type="button" class="sw ${S.col[s] === k ? 'on' : ''}" data-col="${k}" style="background:linear-gradient(140deg,${v[1]},${v[2]})" aria-label="${v[0]}"></button>`).join('');
    document.querySelectorAll('[data-surf]').forEach(b => { b.setAttribute('aria-selected', b.dataset.surf === s); const n = S.items[b.dataset.surf].length; b.querySelector('i').textContent = n || ''; });
  }
  function layout() {
    const [w, h] = dimsCm(), ar = w / h, avail = wrap.clientWidth, mob = innerWidth < 1000;
    const maxH = mob ? Math.max(150, innerHeight * .26) : Math.min(innerHeight * .6, 560);
    let sw = avail, sh = sw / ar; if (sh > maxH) { sh = maxH; sw = sh * ar; }
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
    const dpr = Math.min(2, devicePixelRatio || 1); bg.width = sw * dpr; bg.height = sh * dpr; bg.style.width = sw + 'px'; bg.style.height = sh + 'px';
    const g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g, S.surf, sw, sh);
    stage.style.borderRadius = S.surf === 'phone' ? sw * .16 + 'px' : '';
    const lbl = S.surf === 'lid' || S.surf === 'kb' ? `${S.size}″ laptop · ` : S.surf === 'pad' ? `${PADS[S.pad][2]} · ` : '';
    $('#st-dims').textContent = `${SURF[S.surf].name} · ${lbl}${w} × ${h} cm`;
    $('#st-empty').innerHTML = S.sized || S.surf !== 'lid' ? 'tap a sticker below to stick it here.<br>drag to move, pinch to resize' : 'First, pick your laptop size above.<br><small>Not sure? Check the sticker under your laptop.</small>';
    draw();
  }
  const setCat = id => { S.cat = id; document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === id));
    const c = CAT[id]; if (!c.packs.includes(S.pack)) S.pack = c.packs[0];
    $('#st-packs').innerHTML = c.packs.map(pid => `<button type="button" class="chip ${pid === S.pack ? 'y' : ''}" data-pk="${pid}">${esc(PK[pid].nice)}</button>`).join('');
    fillTray(); };
  const fillTray = () => { const p = PK[S.pack]; document.querySelectorAll('[data-pk]').forEach(b => b.classList.toggle('y', b.dataset.pk === S.pack));
    tray.innerHTML = p.items.map(it => `<div class="tile" data-c="${it[0]}" role="button" tabindex="0" aria-label="Stick ${it[0]}">${spr(p, it, 54)}</div>`).join(''); tray.scrollLeft = 0; saveS(); };
  $('#st-cats').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); };
  $('#st-packs').onclick = e => { const b = e.target.closest('[data-pk]'); if (b) { S.pack = b.dataset.pk; fillTray(); } };
  document.querySelector('.surfs').onclick = e => { const b = e.target.closest('[data-surf]'); if (!b) return; S.surf = b.dataset.surf; S.on = -1; saveS(); opts(); layout(); };
  $('#st-opts').onclick = e => { const b = e.target.closest('[data-size],[data-pad],[data-col]'); if (!b) return;
    if (b.dataset.size) { S.size = b.dataset.size; S.sized = true; } if (b.dataset.pad) S.pad = b.dataset.pad; if (b.dataset.col) S.col[S.surf] = b.dataset.col;
    saveS(); opts(); layout(); };

  const add = (code, fx, fy) => { snap(); const w = dimsCm()[0];
    items().push({ c: code, x: fx ?? .2 + Math.random() * .6, y: fy ?? .25 + Math.random() * .5, s: Math.min(.6, SURF[S.surf].def / w), r: Math.round(Math.random() * 14 - 7) });
    S.on = items().length - 1; buzz(); saveS(); opts(); draw(); };
  function draw() {
    const W = stage.clientWidth, H = stage.clientHeight;
    stage.querySelectorAll('.it').forEach(e => e.remove());
    items().forEach((o, i) => { const { p, it } = CODE[o.c], L = o.s * W, k = L / Math.max(it[3], it[4]), w = it[3] * k, h = it[4] * k;
      const el = document.createElement('div'); el.className = 'it' + (i === S.on ? ' on' : ''); el.dataset.i = i;
      el.style.cssText = `width:${w}px;height:${h}px;transform:translate(${o.x * W - w / 2}px,${o.y * H - h / 2}px) rotate(${o.r}deg);background:url(atlas/${p.id}.${IX}) ${-it[1] * k}px ${-it[2] * k}px/${p.aw * k}px ${p.ah * k}px no-repeat`;
      if (i === S.on) el.innerHTML = `<span class="h up" data-a="up" title="Bring to front">▲</span><span class="h del" data-a="del" title="Remove">×</span><span class="h rs" data-a="rs" title="Resize and rotate">⤡</span>`;
      stage.insertBefore(el, stage.querySelector('.glare')); });
    $('#st-empty').hidden = items().length > 0;
    const n = allItems().length; $('#st-done').textContent = n ? `Done (${n})` : 'Done';
  }
  const showCm = o => { const c = $('#st-cm'); c.hidden = !o; if (o) c.textContent = `${(o.s * dimsCm()[0]).toFixed(1)} cm`; };
  const pts = new Map(); let drag = null;
  const R = () => stage.getBoundingClientRect();
  stage.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const h = e.target.closest('.h'), el = e.target.closest('.it'), r = R(), its = items();
    if (pts.size === 2 && S.on >= 0) { const [a, b] = [...pts.values()], o = its[S.on];
      drag = { m: 'pinch', i: S.on, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), s0: o.s, r0: o.r }; stage.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (h) { e.stopPropagation(); const i = S.on, o = its[i];
      if (h.dataset.a === 'del') { snap(); its.splice(i, 1); S.on = -1; saveS(); opts(); draw(); return; }
      if (h.dataset.a === 'up') { snap(); its.push(its.splice(i, 1)[0]); S.on = its.length - 1; saveS(); draw(); return; }
      snap(); const cx = r.left + o.x * r.width, cy = r.top + o.y * r.height;
      drag = { m: 'rs', i, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, a0: Math.atan2(e.clientY - cy, e.clientX - cx), s0: o.s, r0: o.r };
    } else if (el) { const i = +el.dataset.i; snap(); S.on = i; drag = { m: 'mv', i, ox: e.clientX, oy: e.clientY, x0: its[i].x, y0: its[i].y }; draw(); }
    else { S.on = -1; draw(); return; }
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener('pointermove', e => { if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return; const r = R(), o = items()[drag.i]; if (!o) return; const mx = Math.min(.9, 12 / dimsCm()[0]), mn = 1.5 / dimsCm()[0];
    if (drag.m === 'pinch' && pts.size >= 2) { const [a, b] = [...pts.values()];
      o.s = Math.min(mx, Math.max(mn, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0)); o.r = Math.round(drag.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180 / Math.PI); showCm(o); }
    else if (drag.m === 'mv') { o.x = Math.min(1, Math.max(0, drag.x0 + (e.clientX - drag.ox) / r.width)); o.y = Math.min(1, Math.max(0, drag.y0 + (e.clientY - drag.oy) / r.height)); }
    else if (drag.m === 'rs') { o.s = Math.min(mx, Math.max(mn, drag.s0 * Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / drag.d0)); o.r = Math.round(drag.r0 + (Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) - drag.a0) * 180 / Math.PI); showCm(o); }
    draw(); });
  const end = e => { pts.delete(e.pointerId); if (drag && (drag.m !== 'pinch' || pts.size < 2)) { drag = null; showCm(null); saveS(); } };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  let tg = null;
  tray.addEventListener('pointerdown', e => { const t = e.target.closest('.tile'); if (!t) return; tg = { c: t.dataset.c, x: e.clientX, y: e.clientY, g: null, fine: e.pointerType === 'mouse' }; });
  tray.addEventListener('pointermove', e => { if (!tg) return; const d = Math.hypot(e.clientX - tg.x, e.clientY - tg.y);
    if (!tg.fine && d > 10) { tg = null; return; }
    if (tg.fine && !tg.g && d > 8) { const { p, it } = CODE[tg.c]; tg.g = document.createElement('div'); tg.g.className = 'ghost'; tg.g.innerHTML = spr(p, it, 80); document.body.appendChild(tg.g); tray.setPointerCapture(e.pointerId); }
    if (tg.g) { tg.g.style.left = e.clientX + 'px'; tg.g.style.top = e.clientY + 'px'; } });
  tray.addEventListener('pointerup', e => { if (!tg) return; const r = R();
    if (tg.g) { tg.g.remove(); if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) add(tg.c, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }
    else add(tg.c);
    tg = null; });
  tray.addEventListener('pointercancel', () => { if (tg && tg.g) tg.g.remove(); tg = null; });
  tray.addEventListener('keydown', e => { const t = e.target.closest('.tile'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); add(t.dataset.c); } });
  $('#st-undo').onclick = () => { if (!hist.length) { toast('Nothing to undo'); return; } S.items = JSON.parse(hist.pop()); S.on = -1; saveS(); opts(); draw(); };
  $('#st-clear').onclick = () => { if (!items().length) return; snap(); S.items[S.surf] = []; S.on = -1; saveS(); opts(); draw(); toast('Cleared. Tap Undo to get them back.'); };
  $('#st-fill').onclick = () => { snap(); const p = PK[S.pack], [w, h] = dimsCm(), sz = SURF[S.surf].def, cols = Math.max(1, Math.round(w / (sz * 1.35))), rows = Math.max(1, Math.round(h / (sz * 1.35)));
    const pool = [...p.items].sort(() => Math.random() - .5).slice(0, cols * rows);
    pool.forEach((it, k) => items().push({ c: it[0], x: (k % cols + .5) / cols + (Math.random() - .5) * .04, y: (Math.floor(k / cols) + .5) / rows + (Math.random() - .5) * .05, s: sz * (.85 + Math.random() * .3) / w, r: Math.round(Math.random() * 18 - 9) }));
    S.on = -1; saveS(); opts(); draw(); };
  $('#st-done').onclick = exportDesign;
  setCat(CAT[S.cat] ? S.cat : D.cats[0].id);
  opts(); new ResizeObserver(layout).observe(wrap); layout();
}

const imgs = {};
const loadImg = id => imgs[id] || (imgs[id] = new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `atlas/${id}.${IX}`; }));
async function exportDesign() {
  const used = Object.keys(SURF).filter(k => S.items[k].length);
  if (!used.length) { toast('Stick a few on first'); return; }
  const H = 760, pad = 50, lab = 60, parts = used.map(k => { const [w, h] = SURF[k].dims(); return { k, w: Math.round(H * w / h), h: H }; });
  const W = parts.reduce((a, p) => a + p.w, 0) + pad * (parts.length + 1), cv = document.createElement('canvas'); cv.width = Math.min(W, 4000); cv.height = H + pad * 2 + lab;
  const sc = cv.width / W, g = cv.getContext('2d'); g.fillStyle = '#0d0d0e'; g.fillRect(0, 0, cv.width, cv.height); g.scale(sc, sc);
  let x = pad;
  for (const p of parts) { g.save(); g.translate(x, pad); paint(g, p.k, p.w, p.h); g.save(); rr(g, 0, 0, p.w, p.h, p.k === 'phone' ? p.w * .16 : 20); g.clip();
      for (const o of S.items[p.k]) { const { p: pk, it } = CODE[o.c], im = await loadImg(pk.id), L = o.s * p.w, k = L / Math.max(it[3], it[4]), w = it[3] * k, h = it[4] * k;
        g.save(); g.translate(o.x * p.w, o.y * p.h); g.rotate(o.r * Math.PI / 180); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 5;
        g.drawImage(im, it[1], it[2], it[3], it[4], -w / 2, -h / 2, w, h); g.restore(); }
      g.restore(); g.restore();
    g.fillStyle = '#a9a69e'; g.font = '600 30px "Bricolage Grotesque", sans-serif'; g.textAlign = 'center'; g.fillText(`${SURF[p.k].name} (${S.items[p.k].length})`, x + p.w / 2, pad + H + 44);
    x += p.w + pad; }
  const url = cv.toDataURL('image/jpeg', .9); $('#exp-img').src = url;
  $('#exp-dl').hidden = framed; if (!framed) $('#exp-dl').href = url;
  $('#exp-hint').textContent = framed ? 'Long-press the picture to save it, then send it with your order so we can see your layout.' : 'Save the picture and send it with your order so we can see your layout.';
  const n = allItems().length;
  $('#exp-sum').innerHTML = used.map(k => `<div><span>${SURF[k].name}</span><span>${S.items[k].length}</span></div>`).join('') + `<div class="big"><span>${n} stickers</span><span>${CUR}${n * PRICE}</span></div>`;
  $('#exp-cart').onclick = () => { const counts = {}; allItems().forEach(o => counts[o.c] = (counts[o.c] || 0) + 1);
    Object.entries(counts).forEach(([c, q]) => cart[c] = Math.max(cart[c] || 0, q)); saveCart(); updBar();
    who.note = `My layout: ${used.map(k => `${SURF[k].short.toLowerCase()} (${S.items[k].length})`).join(', ')}${used.some(k => k === 'lid' || k === 'kb') ? `, ${S.size}" laptop` : ''}. Sending the picture.`; store.set('sl-who', who);
    $('#exp').hidden = true; openCart(); };
  $('#exp').hidden = false;
}
$('#exp-x').onclick = () => $('#exp').hidden = true;
$('#lb-x').onclick = () => $('#lb').hidden = true;
$('#lb').onclick = e => { if (e.target.id === 'lb') e.currentTarget.hidden = true; };

// ---------- router ----------
function render() {
  const r = route(); closeSheets(); document.body.classList.toggle('is-studio', r === 'studio');
  if (r === 'studio') vStudio(); else if (r === 'categories') vCats(); else if (r.startsWith('order-')) vOrder(r); else if (CAT[r]) vCat(CAT[r]); else if (PK[r]) vPack(PK[r]); else vHome();
  scrollTo(0, 0);
  const tab = r === 'studio' ? 'studio' : 'home';
  [['t-home', 'home'], ['t-cats', 'cats'], ['t-studio', 'studio']].forEach(([id, k]) => $('#' + id).classList.toggle('on', tab === k));
  [['nv-home', 'home'], ['nv-cats', 'cats'], ['nv-studio', 'studio']].forEach(([id, k]) => $('#' + id).classList.toggle('on', tab === k));
  updBar();
}
addEventListener('hashchange', render);
let rt, lw = innerWidth;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lw && route() !== 'studio') { lw = innerWidth; const y = scrollY; render(); scrollTo(0, y); } }, 200); });
// AVIF when the browser decodes it (almost all now), WebP otherwise. Decided before the first paint.
let IX = 'webp';
(() => { let done = 0; const go = () => { if (!done++) render(); };
  try { if (localStorage.getItem('sl-ix') === 'avif') { IX = 'avif'; return go(); } } catch (e) {}
  const t = new Image(); t.onload = () => { if (t.width === 2) { IX = 'avif'; try { localStorage.setItem('sl-ix', 'avif'); } catch (e) {} } go(); };
  t.onerror = go; setTimeout(go, 250); t.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAA2iAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg'; })();
})();