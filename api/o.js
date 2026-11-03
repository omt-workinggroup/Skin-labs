// GET /o/<id> : the customer's order page (also what WhatsApp shows as a preview, with the sheet picture).
import { findOrder, esc, SITE } from './_lib.js';

const STEP = { new: 'Order received', confirmed: 'Confirmed', printing: 'Printing', 'on-the-way': 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' };
const ORDER = ['new', 'confirmed', 'printing', 'on-the-way', 'delivered'];
export default async function handler(req, res) {
  const id = String(req.query.id || '').toUpperCase(), f = await findOrder(id);
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  if (!f) { res.statusCode = 404; return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order not found · Skin Lab</title><body style="background:#000;color:#fff;font:16px system-ui;padding:40px 20px"><h1>Order not found</h1><p>Check the link, or <a style="color:#fff" href="https://wa.me/233558362423">chat with Skin Lab</a>.</p></body>`); }
  const o = f.order, d = o.design, pic = (d && (d.sheet || d.mock)) || `${SITE}/og.jpg`, at = ORDER.indexOf(o.status);
  const lines = [...(o.packs || []).map(p => `<li><span>${esc(p.label)}<small>${p.n} stickers</small></span><b>×${p.q} · GH₵${p.q * p.price}</b></li>`),
    ...(o.singles || []).map(s => `<li><span>${esc(s.code)}<small>single sticker</small></span><b>×${s.q}</b></li>`)].join('');
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skin Lab order ${esc(o.id)}</title><meta name="robots" content="noindex">
<meta property="og:title" content="Skin Lab order ${esc(o.id)} · ${esc(o.name)}"><meta property="og:description" content="${esc(d ? `${d.packName || 'Custom pack'} · ${d.size} · ${d.n} stickers` : 'Sticker order')} · GH₵${o.total}"><meta property="og:image" content="${esc(pic)}">
<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&family=Instrument+Serif:ital@0;1&display=swap">
<style>*{box-sizing:border-box;margin:0}body{background:#000;color:#fff;font:15px/1.5 Geist,system-ui,sans-serif;padding:0 16px 60px;-webkit-font-smoothing:antialiased}.w{max-width:720px;margin:0 auto}
.top{display:flex;justify-content:space-between;align-items:center;height:60px;border-bottom:1px solid #222}.top b{font-size:20px;letter-spacing:-.04em}.lbl,small{font-family:'Geist Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#8c8c8c}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(40px,10vw,64px);line-height:1;margin:26px 0 6px}h1 em{font-style:italic}
.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:22px 0 6px}.steps i{height:4px;background:#2a2a2a}.steps i.on{background:#1faa53}
.pics{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:22px 0}.pics img{width:100%;display:block;background:#111}
ul{list-style:none;padding:0;margin:10px 0;border-top:1px solid #222}li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #222}li small{display:block}
.tot{display:flex;justify-content:space-between;font-size:22px;margin-top:14px}.btn{display:flex;justify-content:center;align-items:center;gap:8px;height:52px;margin-top:22px;background:#fff;color:#000;text-decoration:none;font-weight:600}</style></head>
<body><div class="w"><header class="top"><b>Skin Lab</b><span class="lbl">Order ${esc(o.id)}</span></header>
<h1>${o.status === 'cancelled' ? 'Order <em>cancelled.</em>' : `${esc(STEP[o.status] || 'Order received')}<em>.</em>`}</h1>
<p class="lbl">${esc(o.name)} · ${new Date(o.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' })}</p>
${o.status !== 'cancelled' ? `<div class="steps">${ORDER.map((s, i) => `<i class="${i <= at ? 'on' : ''}"></i>`).join('')}</div><p class="lbl">${ORDER.map(s => STEP[s]).join(' → ')}</p>` : ''}
${d ? `<div class="pics">${d.sheet ? `<a href="${esc(d.sheet)}"><img src="${esc(d.sheet)}" alt="Your sticker sheet"></a>` : ''}${d.mock ? `<a href="${esc(d.mock)}"><img src="${esc(d.mock)}" alt="Your laptop design"></a>` : ''}</div>
<p><b>${esc(d.packName || 'Your custom pack')}</b> · ${esc(d.size)} sheet · ${d.n} stickers<br><small>${esc(d.laptop)}${d.skins.length ? ' · skin price on WhatsApp' : ''}</small></p>` : ''}
${lines ? `<ul>${lines}</ul>` : ''}
<div class="tot"><span>Total</span><b>GH₵${o.total}${o.skinOnDM ? ' + skin' : ''}</b></div>
<p class="lbl" style="margin-top:8px">We'll message you on WhatsApp to confirm delivery and payment (MoMo).</p>
<a class="btn" href="https://wa.me/233558362423?text=${encodeURIComponent(`Hello Skin Lab, about my order ${o.id}`)}">Chat with Skin Lab</a></div></body></html>`);
}
