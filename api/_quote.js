// Private pricing: what the printer charges us, and how we turn that into a customer price.
// Lives only on the server (and the owner's admin). Customers only ever get the final price; the printer never sees prices.
import { createHash } from 'crypto';
import { saveDoc, loadDoc } from './_lib.js';
// Blob files are public by URL, so the settings folder name carries a secret derived from the storage token (so changing passwords keeps the settings).
const DIR = () => 'settings/pricing-' + createHash('sha256').update('pricing:' + (process.env.BLOB_READ_WRITE_TOKEN || '')).digest('hex').slice(0, 20);

// Printer's quote per printed sheet (print & cut on SAV, laminated), Nov 2026. His public calculator says GH₵6 per sq ft.
export const DEFAULTS = { cost: { A5: 5, A4: 10, A3: 18 }, sqft: 6, markup: 3, extra: 2, min: 25, round: 5, cut: 1.5 };
export const SHEETS = { A5: [14.8, 21], A4: [21, 29.7], A3: [29.7, 42] };
export async function settings() { const d = await loadDoc(DIR()).catch(() => null); return { ...DEFAULTS, ...(d || {}), cost: { ...DEFAULTS.cost, ...((d || {}).cost || {}) } }; }
export async function saveSettings(s, by) {
  const n = v => Math.max(0, Math.min(10000, Math.round(+v * 100) / 100 || 0)), c = s.cost || {};
  const o = { cost: { A5: n(c.A5), A4: n(c.A4), A3: n(c.A3) }, sqft: n(s.sqft), markup: Math.max(1, Math.min(20, +s.markup || 3)), extra: n(s.extra), min: n(s.min), round: [1, 5, 10].includes(+s.round) ? +s.round : 5, cut: Math.max(1, Math.min(5, +s.cut || 1.5)), at: Date.now(), by };
  await saveDoc(DIR(), o); return o;
}
const fits = ([w, h], [W, H]) => (w <= W && h <= H) || (w <= H && h <= W);
// Our cost of one job of w x h cm (q copies). Small jobs go on the smallest sheet they fit; big ones are priced by area from the A3 rate.
export function cost(s, w, h, q = 1, kind = 'sticker') {
  w = Math.max(1, Math.min(300, +w || 0)); h = Math.max(1, Math.min(300, +h || 0)); q = Math.max(1, Math.min(500, Math.round(+q) || 1));
  let sheet = Object.keys(SHEETS).find(k => fits([w, h], SHEETS[k])), per;
  if (sheet) { // how many copies fit on one sheet (2 mm gaps), so 10 small stickers do not cost 10 sheets
    const [W, H] = SHEETS[sheet], n = Math.max(Math.floor(W / (w + .4)) * Math.floor(H / (h + .4)), Math.floor(H / (w + .4)) * Math.floor(W / (h + .4)), 1);
    // use a bigger sheet if that is cheaper for many copies
    let best = { sheet, sheets: Math.ceil(q / n), c: Math.ceil(q / n) * s.cost[sheet] };
    for (const k of Object.keys(SHEETS)) { if (!fits([w, h], SHEETS[k])) continue; const [A, B] = SHEETS[k], m = Math.max(Math.floor(A / (w + .4)) * Math.floor(B / (h + .4)), Math.floor(B / (w + .4)) * Math.floor(A / (h + .4)), 1), sh = Math.ceil(q / m);
      if (sh * s.cost[k] < best.c) best = { sheet: k, sheets: sh, c: sh * s.cost[k] }; }
    per = best;
  } else { const a3 = s.cost.A3 / (29.7 * 42); per = { sheet: 'custom', sheets: 0, c: Math.round(w * h * q * a3 * 1.1 * 100) / 100 }; }
  const c = per.c * (kind === 'decal' ? s.cut : 1);
  return { w, h, q, sheet: per.sheet, sheets: per.sheets, cost: Math.round(c * 100) / 100, calc: Math.round(w * h * q / 929.0304 * s.sqft * 100) / 100 };
}
export function price(s, w, h, q, kind) {
  const c = cost(s, w, h, q, kind), raw = (c.cost + s.extra) * s.markup, r = s.round || 5;
  const p = Math.max(s.min, Math.ceil(raw / r) * r);
  return { ...c, price: p, profit: Math.round((p - c.cost - s.extra) * 100) / 100, margin: Math.round((1 - (c.cost + s.extra) / p) * 100) };
}
