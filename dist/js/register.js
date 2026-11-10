// Register pattern: every external fact is exactly one record.
// state: 'stated' | 'absent' | 'unconfirmed'. Nothing else in the codebase hardcodes these facts.
export const register = Object.freeze({
  brand: { state: 'stated', name: 'EACCRAB', domain: 'eaccrab.xyz' },
  chain: {
    state: 'stated',
    name: 'Elysium',
    chainId: 99901,
    chainIdHex: '0x1863d',
    currency: 'HYPE',
    rpc: 'https://rpc.elysium.kinetiq.xyz',
    explorer: 'https://explorer.elysium.kinetiq.xyz',
  },
  // Contract address: not announced. Change to { state: 'stated', value: '0x...' } and rebuild.
  ca: { state: 'absent', value: null },
  x: { state: 'stated', url: 'https://x.com/eaccrabxyz' },
  github: { state: 'absent', url: null },
  // Market follows this record only. The contract address has no say in it.
  market: {
    state: 'stated',
    url: 'https://api.geckoterminal.com/api/v2/networks/elysium/trending_pools',
    include: 'base_token',
  },
  pairs: { state: 'stated', urlBase: 'https://api.dexscreener.com/latest/dex/tokens/' },
});

export const isStated = (rec) => !!rec && rec.state === 'stated';

// Link rule: store the URL, derive the handle. No href for an unstated record.
export function handleOf(rec) {
  if (!isStated(rec) || !rec.url) return null;
  try {
    const seg = new URL(rec.url).pathname.split('/').filter(Boolean)[0];
    return seg ? '@' + seg : null;
  } catch {
    return null;
  }
}
export const hrefOf = (rec) => (isStated(rec) && rec.url ? rec.url : null);
