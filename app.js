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
    <div class="sech"><div><h1 class="h1">Laptop sticker packs, printed in Accra</h1><p class="sub">Pick a category to see the packs. Full sheets from ${CUR}50, or pick single stickers at ${CUR}${PRICE} each.</p></div></div>
    ${catGrid()}
    <div class="extra">
      <a class="xcard" href="#inspo">${INS.length ? `<span class="xthumbs">${[2, 1, 0].map((k, j) => INS[k] ? `<img src="inspo/sm/${INS[k].id}.${IX}" alt="" loading="lazy" style="left:${j * 24}px;transform:rotate(${[-8, 2, 9][j]}deg)">` : '').join('')}</span>` : '<span class="xart" id="xa1"></span>'}<span><b>Inspiration</b><small>Laptops and sticker sheets to steal ideas from. Tap one, we print it.</small></span></a>
      <button type="button" class="xcard" id="x-inspo"><span class="xart" id="xa2"></span><span><b>Send us your idea</b><small>Your name, picture or logo made into stickers. From ${CUR}15.</small></span></button>
    </div>
  </section>${footer}`;
  const art = (id, list) => { $(id).innerHTML = list.map(([pid, k], i) => spr(PK[pid], PK[pid].items[k], 52, `transform:rotate(${[-8, 7][i]}deg);margin-right:-12px`)).join(''); };
  if ($('#xa1')) art('#xa1', [['p3-code-languages-1', 3], ['m2-spider-verse', 2]]); art('#xa2', [['emoji-mood', 0], ['anime-vibes', 4]]);
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
        <span class="kick">the whole sheet</span>
        <h2>${esc(p.nice)}</h2>
        <p class="sub">${p.items.length} stickers on one ${p.price >= 60 ? 'A4' : ''} sheet, ${esc(p.tag)}. Peel them one by one for your laptop, keyboard, mousepad and phone.</p>
        <div class="bigprice">${CUR}${p.price}<small>for the full pack</small></div>
        <button class="btn wa" type="button" id="orderpack">${waIcon}Order this pack</button>
        <button class="btn o" type="button" data-packbtn="${p.id}" id="addpack"></button>
        <div class="two"><a class="btn o" href="#inspo">Inspiration</a><button class="btn o" type="button" id="toinspo">Send your idea</button></div>
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

// ---------- inspiration: real photos, tap one to get stickers like it ----------
const INS = window.INSPO || [];
const ITAGS = [['', 'All'], ['laptop', 'On laptops'], ['code', 'Coding'], ['pop', 'Anime & pop'], ['custom', 'Custom']];
const hasT = (x, k) => !k || (x.t || '').split(' ').includes(k);
let insF = '', ivList = [], ivI = 0;
function vInspo() {
  app.innerHTML = `<section class="sec" style="padding-top:18px">
    <div class="ihead"><div><h1 class="h1">Inspiration</h1><p class="sub">Laptops and sticker sheets we like. Tap one and we'll print stickers like it.</p></div></div>
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

// ---------- router ----------
function render() {
  const r = route(); closeSheets();
  if (r === 'inspo' || r === 'studio') vInspo(); else if (r === 'categories') vCats(); else if (r.startsWith('order-')) vOrder(r); else if (CAT[r]) vCat(CAT[r]); else if (PK[r]) vPack(PK[r]); else vHome();
  scrollTo(0, 0);
  const tab = r === 'inspo' || r === 'studio' ? 'studio' : 'home';
  [['t-home', 'home'], ['t-cats', 'cats'], ['t-studio', 'studio']].forEach(([id, k]) => $('#' + id).classList.toggle('on', tab === k));
  [['nv-home', 'home'], ['nv-cats', 'cats'], ['nv-studio', 'studio']].forEach(([id, k]) => $('#' + id).classList.toggle('on', tab === k));
  updBar();
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