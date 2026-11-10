export const DASH = '–';
const nf = (n, o) => new Intl.NumberFormat('en-US', o).format(n);

export function fmtUsdCompact(v) {
  if (v == null || !isFinite(v)) return DASH;
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + nf(v / 1e9, { maximumFractionDigits: 2 }) + 'B';
  if (a >= 1e6) return '$' + nf(v / 1e6, { maximumFractionDigits: 2 }) + 'M';
  if (a >= 1e3) return '$' + nf(v / 1e3, { maximumFractionDigits: 1 }) + 'K';
  return '$' + nf(v, { maximumFractionDigits: 0 });
}
export function fmtPrice(v) {
  if (v == null || !isFinite(v)) return DASH;
  if (v >= 1000) return '$' + nf(v, { maximumFractionDigits: 0 });
  if (v >= 1) return '$' + nf(v, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  if (v === 0) return '$0';
  const digits = Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(v))));
  return '$' + v.toFixed(digits);
}
export function fmtChange(v) {
  if (v == null || !isFinite(v)) return DASH;
  const s = v > 0 ? '▲ ' : v < 0 ? '▼ ' : '';
  return s + nf(Math.abs(v), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}
export const fmtInt = (v) => (v == null || !isFinite(v) ? DASH : nf(Math.round(v)));
export const shortAddr = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : DASH);
export const num = (x) => {
  const n = typeof x === 'string' ? parseFloat(x) : x;
  return Number.isFinite(n) ? n : null;
};
