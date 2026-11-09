// GET /o/<id> : the customer's order page: payment state, progress with real timestamps, what was bought, help and reviews.
// Coming back from Paystack (?reference=...) the payment is checked with Paystack first; success is only shown once verified.
import { findOrder, esc, SITE, payOn, confirmPayment, FLOW } from './_lib.js';

const LBL = { new: 'Order received', confirmed: 'Payment confirmed', artwork: 'Preparing artwork', printing: 'Printing', qc: 'Quality check', ready: 'Ready for pickup / dispatch', 'on-the-way': 'Out for delivery', delivered: 'Delivered',
  clarify: 'We need a quick word with you', hold: 'On hold', 'failed-delivery': 'Delivery unsuccessful', cancelled: 'Cancelled', 'refund-review': 'Refund in progress', refunded: 'Refunded' };
const NEXT = { new: 'Pay to send it to print. We WhatsApp you about delivery.', confirmed: 'We are getting your artwork ready for print.', artwork: 'Your artwork is being prepared and checked.', printing: 'Your stickers are on the printer right now.',
  qc: 'We check every sticker and cut before it leaves.', ready: 'Packed and ready. We will WhatsApp you to arrange pickup or delivery.', 'on-the-way': 'Your order is on its way. We will call when we are close.', delivered: 'Enjoy! Show us your laptop.',
  clarify: 'We have a question about your order. Check WhatsApp, or tap Chat with Skin Lab below.', hold: 'Your order is paused for now. We will message you.', 'failed-delivery': 'We could not deliver this time. We will WhatsApp you to try again.',
  cancelled: 'This order was cancelled.', 'refund-review': 'Your refund has been sent to Paystack. It shows here as Refunded once Paystack confirms it.', refunded: 'Your refund has been processed by Paystack.' };
const fmt = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
export default async function handler(req, res) {
  const id = String(req.query.id || '').toUpperCase(), ref = String(req.query.reference || req.query.trxref || ''), tries = Math.min(9, +req.query.n || 0);
  if (ref.startsWith(id + '-')) await confirmPayment(ref).catch(() => null);   // back from Paystack: ask Paystack, never trust the browser
  const f = await findOrder(id);
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
  if (!f) { res.statusCode = 404; return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order not found · Skin Lab</title><body style="background:#000;color:#fff;font:16px system-ui;padding:40px 20px"><h1>Order not found</h1><p>Check the link, or <a style="color:#fff" href="https://wa.me/233558362423">chat with Skin Lab</a>.</p></body>`); }
  const o = f.order, d = o.design, pk = o.picks, first = esc(String(o.name || '').split(' ')[0]);
  const pic = (d && (d.sheet || d.mock)) || (pk && pk.sheet) || `${SITE}/og.jpg`, at = FLOW.indexOf(o.status), exc = at < 0;
  const att = ref ? (o.attempts || []).find(a => a.ref === ref) : null;
  // payment state for this visit
  let pay = '';
  const closed = ['cancelled', 'refunded', 'refund-review'].includes(o.status), canPay = payOn() && !o.paid && o.total > 0 && !closed;
  if (o.paid) pay = ref ? `<div class="ok"><span class="tick">✓</span><div><b>Payment successful!</b><span>Thank you for shopping with Skin Lab. GH₵${o.paid.amount} paid${o.paid.channel === 'mobile_money' ? ' with Mobile Money' : o.paid.channel === 'card' ? ' by card' : ''}.</span></div></div>`
    : `<p class="paid">✓ Paid GH₵${o.paid.amount}${o.paid.channel === 'mobile_money' ? ' with Mobile Money' : o.paid.channel === 'card' ? ' by card' : ''} · ${fmt(o.paid.at)}</p>`;
  else if (o.payIssue && ref) pay = `<div class="warn"><b>We could not confirm this payment</b><span>Paystack reported an amount that does not match your order. Nothing is marked paid. Please chat with us and quote ${esc(o.id)}.</span></div>`;
  else if (ref && att && ['abandoned', 'failed', 'reversed'].includes(att.status)) pay = `<div class="warn"><b>${att.status === 'failed' ? 'Payment failed' : 'Payment not completed'}</b><span>${att.status === 'failed' ? esc(att.msg || 'Paystack could not take the payment.') + ' ' : 'The Paystack page was closed before paying. '}Nothing was charged. You can try again below.</span></div>`;
  else if (ref && canPay) pay = tries < 6 ? `<div class="chk"><span class="spin"></span><div><b>Checking your payment…</b><span>We're confirming your transaction securely with Paystack.</span></div></div>`
    : `<div class="chk"><div><b>Still confirming</b><span>MoMo payments can take a minute. Tap Check again: it never charges you twice.</span></div></div><a class="btn" href="/o/${esc(o.id)}/?reference=${esc(ref)}&n=0">Check again</a>`;
  const refresh = ref && canPay && tries < 6 && !(att && ['abandoned', 'failed', 'reversed'].includes(att.status)) ? `<meta http-equiv="refresh" content="4;url=/o/${esc(o.id)}/?reference=${encodeURIComponent(ref)}&n=${tries + 1}">` : '';
  const when = s => { const h = (o.history || []).find(x => x.s === s || (s === 'confirmed' && x.s === 'paid')); return h ? fmt(h.at) : ''; };
  const steps = FLOW.map((s, i) => { const done = !exc && i <= at, cur = !exc && i === at; return `<li class="${done ? 'done' : ''} ${cur ? 'cur' : ''}"><i></i><span><b>${LBL[s]}</b>${done && when(s) ? `<small>${when(s)}</small>` : ''}</span></li>`; }).join('');
  const lines = [...(o.packs || []).map(p => `<li><span>${esc(p.label)}<small>${/^skin~|^kb~|^ms~|^tp~/.test(p.key) ? 'skin' : /^dc~/.test(p.key) ? 'Laptop Art' : (p.n ? p.n + ' stickers' : 'sticker sheet')}</small></span><b>×${p.q} · GH₵${p.q * p.price}</b></li>`),
    ...(o.free ? [`<li><span class="thumb"><img src="${esc(o.free.img || `/free/${o.free.code}.webp`)}" alt=""><span>${esc(o.free.name)}<small>free sticker</small></span></span><b>FREE</b></li>`] : []),
    ...(o.singles || []).map(s => ({ ...s, img: s.img || (/^[A-Z]{3}-\d{3}$/.test(s.code) ? `/hd/${s.code}.avif` : '') })).map(s => `<li><span class="thumb">${s.img ? `<img src="${esc(s.img)}" alt="">` : ''}<span>${esc(s.code)}<small>single sticker</small></span></span><b>×${s.q}</b></li>`)].join('');
  const wa = `https://wa.me/233558362423?text=${encodeURIComponent(`Hello Skin Lab, I need help with order ${o.id}.`)}`;
  const review = o.status === 'delivered' ? `<section class="card" id="rv"><h2>How did we do?</h2><p class="lbl">Your review shows on the shop as a verified purchase once we've checked it.</p>
    <form id="rvf"><div class="stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}" data-r="${n}">★</button>`).join('')}</div>
    <label for="rvt">Your experience</label><textarea id="rvt" maxlength="600" placeholder="e.g. The stickers look great on my laptop"></textarea>
    <label for="rvp">Photo of your laptop (optional)</label><input id="rvp" type="file" accept="image/*">
    <label class="ck"><input type="checkbox" id="rvk"> Skin Lab may show my photo on the shop</label>
    <details><summary>Quick questions (optional)</summary>${[['ease', 'How easy was ordering?'], ['pay', 'Was paying clear?'], ['product', 'Did the stickers meet your expectations?'], ['delivery', 'How was delivery?']].map(([k, t]) => `<label>${t}<select data-fb="${k}"><option value="0">–</option>${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label>`).join('')}</details>
    <button class="btn y" type="submit" id="rvb">Send review</button><p class="lbl" id="rvm" role="status"></p></form></section>` : '';
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refresh}
<title>Skin Lab order ${esc(o.id)}</title><meta name="robots" content="noindex">
<meta property="og:title" content="Skin Lab order ${esc(o.id)}"><meta property="og:description" content="${esc(d ? `${d.packName || 'Custom pack'} · ${d.size} · ${d.n} stickers` : 'Sticker order')} · GH₵${o.total}"><meta property="og:image" content="${esc(pic)}">
<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&family=Instrument+Serif:ital@0;1&display=swap">
<style>*{box-sizing:border-box;margin:0}body{background:#000;color:#fff;font:15px/1.5 Geist,system-ui,sans-serif;padding:0 16px 60px;-webkit-font-smoothing:antialiased}.w{max-width:720px;margin:0 auto}
a{color:inherit}:focus-visible{outline:2px solid #ffd400;outline-offset:2px}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
.top{display:flex;justify-content:space-between;align-items:center;height:60px;border-bottom:1px solid #222}.top b{font-size:20px;letter-spacing:-.04em}.lbl,small{font-family:'Geist Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9a9a9a}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(40px,10vw,64px);line-height:1;margin:26px 0 6px}h1 em{font-style:italic}h2{font-family:'Instrument Serif',serif;font-weight:400;font-size:30px;margin-bottom:4px}
.ok,.warn,.chk{display:flex;gap:14px;align-items:flex-start;padding:16px;margin:18px 0 6px;border:1px solid}.ok{background:#0f2e1b;border-color:#1faa53}.warn{background:#2e1310;border-color:#ff8a7a;display:block}.chk{background:#111;border-color:#333}
.ok b,.warn b,.chk b{display:block;font-size:17px}.ok span,.warn span,.chk span{color:#cfcfcf}.tick{width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:#1faa53;color:#fff!important;display:grid;place-items:center;font-size:20px}
.spin{width:22px;height:22px;flex:0 0 22px;border:3px solid #333;border-top-color:#ffd400;border-radius:50%;animation:sp .9s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.paid{margin-top:14px;padding:12px 14px;background:#0f2e1b;border:1px solid #1faa53;color:#7ee2a2;font-weight:600}
.tl{list-style:none;padding:0;margin:22px 0 4px;border:0}.tl li{display:flex;gap:12px;padding:0 0 16px;border:0;position:relative}.tl li i{width:14px;height:14px;flex:0 0 14px;margin-top:4px;border:2px solid #444;border-radius:50%;background:#000;position:relative;z-index:1}
.tl li:not(:last-child):after{content:'';position:absolute;left:6px;top:18px;bottom:-2px;width:2px;background:#2a2a2a}.tl li.done i{background:#1faa53;border-color:#1faa53}.tl li.done:not(:last-child):after{background:#1faa53}
.tl li.cur i{box-shadow:0 0 0 4px rgba(31,170,83,.25)}.tl li span b{font-weight:500;color:#777}.tl li.done span b{color:#fff}.tl li small{display:block}
.exc{padding:14px;border:1px solid #ff9f43;background:#2a1a08;margin:18px 0}.note{padding:12px 14px;border-left:3px solid #4cc2ff;background:#0c1a24;margin:14px 0}
.pics{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:22px 0}.pics img{width:100%;display:block;background:#111}
ul.it{list-style:none;padding:0;margin:10px 0;border-top:1px solid #222}ul.it li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #222}ul.it li small{display:block}.thumb{display:flex;gap:10px;align-items:center}.thumb img{width:44px;height:44px;object-fit:contain}
.tot{display:flex;justify-content:space-between;font-size:22px;margin-top:14px}.sub{display:flex;justify-content:space-between;color:#aaa;margin-top:4px}
.btn{display:flex;justify-content:center;align-items:center;gap:8px;min-height:52px;margin-top:12px;background:#fff;color:#000;text-decoration:none;font:600 16px Geist,system-ui;border:0;width:100%;cursor:pointer}.btn.y{background:#ffd400}.btn.g{background:#1faa53;color:#fff}.btn.o{background:none;color:#fff;border:1px solid #444}
.card{margin-top:28px;padding:18px;border:1px solid #2a2a2a;background:#0a0a0a}.card label{display:block;margin-top:12px;font-size:13px;color:#bbb}.card textarea,.card select,.card input[type=file]{width:100%;margin-top:6px;background:#000;color:#fff;border:1px solid #333;padding:10px;font:inherit}
.card textarea{min-height:90px}.stars{display:flex;gap:6px;margin-top:12px}.stars button{font-size:30px;background:none;border:0;color:#444;cursor:pointer;padding:0 2px}.stars button.on{color:#ffd400}.ck{display:flex!important;gap:8px;align-items:center}
details{margin-top:12px}summary{cursor:pointer;color:#bbb}.links{display:grid;grid-template-columns:1fr 1fr;gap:10px}.links .btn{margin-top:0;font-size:14px;min-height:48px}</style></head>
<body><div class="w"><header class="top"><b>Skin Lab</b><span class="lbl">Order ${esc(o.id)}</span></header>
${pay}
<h1>${esc(LBL[o.status] || 'Order received')}<em>.</em></h1>
<p class="lbl">${first} · placed ${fmt(o.at)}</p>
<p style="margin-top:10px;color:#cfcfcf">${esc(NEXT[o.status] || '')}</p>
${exc ? `<div class="exc"><b>${esc(LBL[o.status])}</b><br>${esc(NEXT[o.status] || '')}</div>` : `<ol class="tl" aria-label="Order progress">${steps}</ol>`}
${o.custNote ? `<div class="note"><span class="lbl">Message from Skin Lab</span><br>${esc(o.custNote)}</div>` : ''}
${canPay ? `<button class="btn y" id="pay" type="button">Pay GH₵${o.total} securely · MoMo or card</button><p class="lbl" style="margin-top:8px">Secure payment by Paystack. Delivery is agreed with you on WhatsApp and is not included.</p>` : ''}
${d ? `<div class="pics">${d.sheet ? `<a href="${esc(d.sheet)}"><img src="${esc(d.sheet)}" alt="Your sticker sheet"></a>` : ''}${d.mock ? `<a href="${esc(d.mock)}"><img src="${esc(d.mock)}" alt="Your laptop design"></a>` : ''}</div>
<p><b>${esc(d.packName || 'Your custom pack')}</b> · ${esc(d.size)} sheet · ${d.n} stickers<br><small>${esc(d.laptop)}${d.skins.length ? ` · ${esc(d.skins.join(', '))} skin${d.skinSize ? ' (' + ({ S: 'Small', M: 'Medium', L: 'Large', C: 'Custom' }[d.skinSize] || '') + ')' : ''}` : ''}</small></p>` : ''}
${pk && pk.sheet ? `<div class="pics"><a href="${esc(pk.sheet)}"><img src="${esc(pk.sheet)}" alt="Your singles sheet"></a></div><p><b>Your singles sheet</b> · ${esc(pk.size)} · ${pk.n} stickers</p>` : ''}
${lines ? `<ul class="it">${lines}</ul>` : ''}
<div class="sub"><span>Products</span><span>GH₵${o.total}</span></div><div class="sub"><span>Delivery</span><span>${o.paid ? 'arranged on WhatsApp' : 'to be confirmed on WhatsApp'}</span></div>
<div class="tot"><span>${o.paid ? 'Paid' : 'Total'}</span><b>GH₵${o.paid ? o.paid.amount : o.total}</b></div>
${review}
<div class="links" style="margin-top:22px"><a class="btn" href="${wa}">Chat with Skin Lab</a><a class="btn o" href="/#help-${esc(o.id)}">Report a problem</a></div>
<a class="btn o" href="/care/">How to apply your stickers</a>
<a class="btn g" href="https://wa.me/?text=${encodeURIComponent(`Just got my laptop stickers from Skin Lab 🔥 Stickers from GH₵3 and a free one with every order: ${SITE}/`)}">Show your friends on WhatsApp</a>
<a class="btn o" href="/">Back to the shop</a></div>
<script>
${canPay ? `document.getElementById('pay').onclick=async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;b.textContent='Opening Paystack…';try{const r=await fetch('/api/pay/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:${JSON.stringify(o.id)}})}),j=await r.json();if(j.url)return location.href=j.url;if(j.paid)return location.reload();throw new Error(j.error)}catch(x){b.disabled=false;b.textContent='Try paying again';alert((x&&x.message)||'No connection')}};` : ''}
${review ? `(()=>{let R=0;const st=[...document.querySelectorAll('.stars button')];st.forEach(b=>b.onclick=()=>{R=+b.dataset.r;st.forEach(x=>{const on=+x.dataset.r<=R;x.classList.toggle('on',on);x.setAttribute('aria-checked',+x.dataset.r===R)})});
const small=f=>new Promise(ok=>{if(!f)return ok(null);const i=new Image();i.onload=()=>{const k=Math.min(1,1400/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.82))};i.onerror=()=>ok(null);i.src=URL.createObjectURL(f)});
document.getElementById('rvf').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('rvm'),b=document.getElementById('rvb');if(!R){m.textContent='Pick a star rating first';return}b.disabled=true;b.textContent='Sending…';
const fb={};document.querySelectorAll('[data-fb]').forEach(s=>fb[s.dataset.fb]=+s.value);
try{const r=await fetch('/api/public/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'review',id:${JSON.stringify(o.id)},rating:R,text:document.getElementById('rvt').value,permit:document.getElementById('rvk').checked,photo:await small(document.getElementById('rvp').files[0]),fb})}),j=await r.json();if(!r.ok)throw new Error(j.error);
document.getElementById('rvf').innerHTML='<p style="margin-top:12px"><b>Thank you!</b> Your review shows on the shop once we\\'ve checked it.</p>'}catch(x){b.disabled=false;b.textContent='Send review';m.textContent=(x&&x.message)||'No connection'}}})();` : ''}
</script></body></html>`);
}
