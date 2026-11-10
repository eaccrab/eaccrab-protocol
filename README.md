# EACCRAB

**The crab that moves first.**

[![Live site](https://img.shields.io/badge/live-eaccrab.xyz-01c0fe?style=flat-square&labelColor=020d56)](https://eaccrab.xyz)

A neon crab on the Elysium chain. The site is a static page with a live pool board, a pinned row for the project's own token, and a contract slot that stays inert until the address is announced.

| | |
|---|---|
| Chain | Elysium (chain id `99901` / `0x1863d`, currency HYPE) |
| RPC | https://rpc.elysium.kinetiq.xyz |
| Explorer | https://explorer.elysium.kinetiq.xyz |
| Contract address | `TBA` (placeholder, not announced yet) |

## Overview

Plain HTML, CSS and ES modules. No framework, no runtime dependencies. `npm run build` copies the site into `dist/`, and `dist/` is the folder you deploy.

## Features

- Contract slot pinned at the top of the page: full address, click to copy, inert until stated.
- Live Elysium board: top pools by one-day turnover from GeckoTerminal, refreshed every 60 seconds, paused while the tab is hidden, with exponential backoff and last-good-data retention.
- Pinned own-token row backed by DexScreener once the address is stated; a brand-logo placeholder row until then.
- Ticker, count-up values with change flashes, spotlight hover, scroll reveal, parallax hero and a scroll progress bar. Every animation has a `prefers-reduced-motion` fallback.
- Every external fact lives in one register record (`stated`, `absent` or `unconfirmed`) in `src/js/register.js`.

## Going live with the address

Edit one record in `src/js/register.js`:

```js
ca: { state: 'stated', value: '0x...' },
```

Then run `npm run build` and redeploy `dist/`. The same applies to the GitHub link.

## Develop

```bash
npm run build   # writes dist/
npm test        # logic tests (gate, pair selection, dedup, formatting)
```

`python tools/gen_assets.py` regenerates the resized logos, favicon, palette and image crops from `brand/` and `reference/` (needs Pillow). Its outputs are committed in `public/`.

## Links

- Site: https://eaccrab.xyz
- X: https://x.com/eaccrabxyz
- GitHub: not published yet
- Whitepaper: [docs/whitepaper.md](docs/whitepaper.md)

## License

MIT, see [LICENSE](LICENSE).
