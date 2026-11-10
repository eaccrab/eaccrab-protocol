import { fetchJson } from './poller.js';
import { num } from './format.js';

// Depends on the market register record only. Nothing here knows about the contract address.
export function parseTrending(json) {
  const tokens = new Map();
  for (const inc of json?.included ?? []) if (inc.type === 'token') tokens.set(inc.id, inc.attributes ?? {});
  const rows = [];
  for (const p of json?.data ?? []) {
    const a = p.attributes ?? {};
    const tokId = p.relationships?.base_token?.data?.id ?? '';
    const tok = tokens.get(tokId) ?? {};
    const address = String(tok.address ?? tokId.replace(/^[^_]*_/, '')).toLowerCase();
    if (!address) continue;
    rows.push({
      key: address,
      address,
      symbol: String(tok.symbol ?? String(a.name ?? '?').split('/')[0]).trim(),
      name: String(tok.name ?? a.name ?? '').trim(),
      logo: tok.image_url && /^https:\/\//.test(tok.image_url) ? tok.image_url : null,
      price: num(a.base_token_price_usd),
      change: num(a.price_change_percentage?.h24),
      volume: num(a.volume_usd?.h24),
      liquidity: num(a.reserve_in_usd),
    });
  }
  rows.sort((x, y) => (y.volume ?? -1) - (x.volume ?? -1));
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (seen.has(r.key)) continue; // one row per token: keep its busiest pool
    seen.add(r.key);
    out.push(r);
  }
  return out.slice(0, 10);
}

export async function fetchTrending(rec, signal) {
  const url = rec.url + (rec.include ? '?include=' + encodeURIComponent(rec.include) : '');
  return parseTrending(await fetchJson(url, signal));
}
