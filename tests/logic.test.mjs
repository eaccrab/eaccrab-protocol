import test from 'node:test';
import assert from 'node:assert/strict';
import { gateCA, sameAddress } from '../src/js/gate.js';
import { handleOf, hrefOf, register } from '../src/js/register.js';
import { parseTrending } from '../src/js/market.js';
import { parsePair, composeRows } from '../src/js/own.js';
import { fmtPrice, fmtChange, fmtUsdCompact } from '../src/js/format.js';

const A = '0x8df4f39d592de2aaee15838b265c2392d19a4128';

test('gate: absent register keeps the absent branch', () => {
  assert.equal(gateCA(register.ca).state, 'absent');
});
test('gate: any well-formed 0x hex is accepted, either case', () => {
  assert.equal(gateCA({ state: 'stated', value: A }).state, 'stated');
  assert.equal(gateCA({ state: 'stated', value: A.toUpperCase().replace('0X', '0x') }).state, 'stated');
});
test('gate: malformed or unconfirmed never throws, never counts as stated', () => {
  assert.equal(gateCA({ state: 'stated', value: '0x12' }).state, 'unconfirmed');
  assert.equal(gateCA({ state: 'unconfirmed', value: A }).state, 'unconfirmed');
  assert.equal(gateCA(undefined).state, 'absent');
});
test('link rule: handle derived from url, no href when unstated', () => {
  assert.equal(handleOf(register.x), '@eaccrabxyz');
  assert.equal(hrefOf(register.github), null);
  assert.equal(handleOf(register.github), null);
});

const gecko = {
  data: [
    { attributes: { base_token_price_usd: '1', price_change_percentage: { h24: '5' }, volume_usd: { h24: '10' }, reserve_in_usd: '100' }, relationships: { base_token: { data: { id: 'elysium_0xaaa' } } } },
    { attributes: { base_token_price_usd: '2', price_change_percentage: { h24: '-5' }, volume_usd: { h24: '900' }, reserve_in_usd: null }, relationships: { base_token: { data: { id: 'elysium_0xbbb' } } } },
    { attributes: { base_token_price_usd: '3', price_change_percentage: { h24: '1' }, volume_usd: { h24: '500' }, reserve_in_usd: '5' }, relationships: { base_token: { data: { id: 'elysium_0xbbb' } } } },
  ],
  included: [{ id: 'elysium_0xaaa', type: 'token', attributes: { address: '0xaaa', symbol: 'AAA', name: 'Aaa', image_url: null } }],
};
test('market: sorted by 24h volume, one row per token, null-safe', () => {
  const rows = parseTrending(gecko);
  assert.deepEqual(rows.map((r) => r.address), ['0xbbb', '0xaaa']);
  assert.equal(rows[0].liquidity, null);
  assert.equal(rows[1].logo, null);
});
test('own: pair with highest volume.h24 wins', () => {
  const p = parsePair({ pairs: [
    { baseToken: { address: A, symbol: 'LOW' }, priceUsd: '1', volume: { h24: 1 }, liquidity: { usd: 1 }, priceChange: { h24: 1 } },
    { baseToken: { address: A, symbol: 'TOP' }, priceUsd: '2', volume: { h24: 9 }, liquidity: { usd: 7 }, priceChange: { h24: -2 } },
  ] }, A);
  assert.equal(p.symbol, 'TOP');
  assert.equal(p.price, 2);
  assert.equal(p.liquidity, 7);
  assert.equal(parsePair({ pairs: null }, A), null);
});
test('dedup: own token removed from trending, list backfilled', () => {
  const list = Array.from({ length: 10 }, (_, i) => ({ address: '0x' + i }));
  const out = composeRows(list, '0X3', 9);
  assert.equal(out.length, 9);
  assert.ok(!out.some((r) => sameAddress(r.address, '0x3')));
});
test('format: dash for missing, readable tiny prices', () => {
  assert.equal(fmtPrice(null), '–');
  assert.equal(fmtChange(undefined), '–');
  assert.equal(fmtUsdCompact(1756766), '$1.76M');
  assert.match(fmtPrice(0.00425051), /^\$0\.00425/);
});
