import { fetchJson } from './poller.js';
import { num } from './format.js';
import { sameAddress } from './gate.js';

// Pair selection: sort by volume.h24 desc, take pairs[0].
export function parsePair(json, address) {
  const pairs = (json?.pairs ?? []).filter(Boolean).slice();
  if (!pairs.length) return null;
  pairs.sort((a, b) => (num(b.volume?.h24) ?? -1) - (num(a.volume?.h24) ?? -1));
  const p = pairs[0];
  const tok = sameAddress(p.quoteToken?.address, address) ? p.quoteToken : p.baseToken;
  return {
    key: String(address).toLowerCase(),
    address,
    symbol: tok?.symbol ?? 'EACCRAB',
    name: tok?.name ?? 'EACCRAB',
    price: num(p.priceUsd),
    change: num(p.priceChange?.h24),
    volume: num(p.volume?.h24),
    liquidity: num(p.liquidity?.usd),
  };
}

export async function fetchOwn(rec, address, signal) {
  return parsePair(await fetchJson(rec.urlBase + encodeURIComponent(address), signal), address);
}

// Dedup: the own token never shows twice. Drop it from trending, backfill from the sorted remainder.
export function composeRows(trending, ownAddress, slots = 9) {
  const list = ownAddress ? trending.filter((r) => !sameAddress(r.address, ownAddress)) : trending;
  return list.slice(0, slots);
}
