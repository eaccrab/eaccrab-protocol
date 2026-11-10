import { DASH, fmtPrice, fmtChange, fmtUsdCompact, fmtInt } from './format.js';
import { setNumber, copyText, reduced } from './fx.js';

export const ICON_COPY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
export const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SLOTS = 9;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tileFor(symbol) {
  let h = 0;
  for (const ch of String(symbol)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const t = document.createElement('span');
  t.className = 'tile t' + (h % 3);
  t.textContent = (String(symbol).trim()[0] || '?').toUpperCase();
  return t;
}
// token image with letter-tile fallback (missing logo or a load failure)
function logoNode(src, symbol, alt) {
  const wrap = document.createElement('span');
  wrap.className = 'logo';
  if (!src) { wrap.appendChild(tileFor(symbol)); return wrap; }
  const img = new Image();
  img.alt = alt || '';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => { wrap.replaceChildren(tileFor(symbol)); };
  img.src = src;
  wrap.appendChild(img);
  return wrap;
}

const CELLS = `
  <span class="c price" data-f="price"></span>
  <span class="c chg" data-f="chg"></span>
  <span class="sub"><span class="c vol" data-f="vol" data-l="turn"></span><span class="c liq" data-f="liq" data-l="depth"></span></span>
  <span class="cpw"></span>`;

function rowShell(rank) {
  const el = document.createElement('div');
  el.className = 'row';
  el.setAttribute('role', 'row');
  el.setAttribute('data-spot', '');
  el.innerHTML = `<span class="rk">${String(rank).padStart(2, '0')}</span><span class="tk"></span>${CELLS}`;
  return el;
}
const f = (el, k) => el.querySelector(`[data-f="${k}"]`);

function setChangeClass(c, v) {
  c.classList.toggle('up', v != null && v > 0);
  c.classList.toggle('dn', v != null && v < 0);
}

function copyButton(address, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cp';
  b.setAttribute('aria-label', 'Copy address of ' + label);
  b.innerHTML = '<span class="cy">' + ICON_COPY + '</span><span class="ck">' + ICON_CHECK + '</span>';
  b.addEventListener('click', async () => {
    if (!(await copyText(address))) return;
    b.classList.add('ok');
    b.setAttribute('aria-label', 'Address copied');
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.classList.remove('ok'); b.setAttribute('aria-label', 'Copy address of ' + label); }, 1600);
  });
  return b;
}

export function createBoard(els, { brandLogo }) {
  const { rows, ticker, status, err, tiles } = els;
  const trendEls = new Map(); // key -> element
  let own = { gate: 'absent', data: null, loading: false, failed: false };
  let ownEl = null;
  let hadData = false;
  let tickerSig = '';

  function buildOwn() {
    ownEl = rowShell(1);
    ownEl.classList.add('own');
    ownEl.querySelector('.tk').append(
      logoNode(brandLogo, 'E', 'EACCRAB logo'),
      Object.assign(document.createElement('span'), { className: 'nm', innerHTML: '<b>EACCRAB</b><i class="own-sub"></i>' }),
    );
    rows.prepend(ownEl);
    renderOwn();
  }

  function renderOwn() {
    const sub = ownEl.querySelector('.own-sub');
    const cpw = ownEl.querySelector('.cpw');
    const cells = ['price', 'chg', 'vol', 'liq'].map((k) => f(ownEl, k));
    ownEl.classList.toggle('is-ph', !(own.gate === 'stated' && own.data));
    ownEl.classList.toggle('is-load', own.gate === 'stated' && !own.data && own.loading && !own.failed);
    if (own.gate !== 'stated') {
      sub.textContent = 'awaiting address';
      cells.forEach((c) => { c.textContent = '· · · · ·'; c._v = null; c.classList.remove('up', 'dn'); });
      cpw.replaceChildren(Object.assign(document.createElement('span'), { className: 'cp-ph', textContent: '·' }));
      ownEl.setAttribute('aria-label', 'EACCRAB, awaiting contract address');
      return;
    }
    ownEl.removeAttribute('aria-label');
    const d = own.data;
    if (!d) {
      sub.textContent = own.failed ? 'source unreachable' : 'no pool found yet';
      cells.forEach((c) => { c.textContent = own.loading && !own.failed ? '' : DASH; c._v = null; });
      cpw.replaceChildren(copyButton(own.address, 'EACCRAB'));
      return;
    }
    sub.textContent = d.symbol;
    setNumber(f(ownEl, 'price'), d.price, fmtPrice);
    setNumber(f(ownEl, 'chg'), d.change, fmtChange);
    setChangeClass(f(ownEl, 'chg'), d.change);
    setNumber(f(ownEl, 'vol'), d.volume, fmtUsdCompact);
    setNumber(f(ownEl, 'liq'), d.liquidity, fmtUsdCompact);
    if (!cpw.firstChild || !cpw.firstChild.classList?.contains('cp')) cpw.replaceChildren(copyButton(own.address, d.symbol));
  }

  function skeletonRows() {
    for (let i = 0; i < SLOTS; i++) {
      const el = rowShell(i + 2);
      el.classList.add('sk');
      el.setAttribute('aria-hidden', 'true');
      el.querySelector('.tk').innerHTML = '<span class="logo"><span class="tile sk-b"></span></span><span class="nm"><b class="sk-b w1"></b><i class="sk-b w2"></i></span>';
      el.querySelectorAll('.c').forEach((c) => c.classList.add('sk-b'));
      rows.appendChild(el);
    }
  }

  function trendRow(r, rank) {
    let el = trendEls.get(r.key);
    const fresh = !el;
    if (fresh) {
      el = rowShell(rank);
      el.dataset.key = r.key;
      el.querySelector('.tk').append(
        logoNode(r.logo, r.symbol, r.symbol + ' logo'),
        Object.assign(document.createElement('span'), { className: 'nm', innerHTML: '<b>' + esc(r.symbol) + '</b><i>' + esc(r.name) + '</i>' }),
      );
      el.querySelector('.cpw').appendChild(copyButton(r.address, r.symbol));
      trendEls.set(r.key, el);
    }
    el.querySelector('.rk').textContent = String(rank).padStart(2, '0');
    setNumber(f(el, 'price'), r.price, fmtPrice);
    setNumber(f(el, 'chg'), r.change, fmtChange);
    setChangeClass(f(el, 'chg'), r.change);
    setNumber(f(el, 'vol'), r.volume, fmtUsdCompact);
    setNumber(f(el, 'liq'), r.liquidity, fmtUsdCompact);
    return { el, fresh };
  }

  function errorRows() {
    rows.querySelectorAll('.row.sk,.row.dash').forEach((n) => n.remove());
    for (let i = 0; i < SLOTS; i++) {
      const el = rowShell(i + 2);
      el.classList.add('dash');
      el.querySelector('.tk').innerHTML = '<span class="logo"><span class="tile t0">–</span></span><span class="nm"><b>–</b><i>no data</i></span>';
      el.querySelectorAll('.c').forEach((c) => { c.textContent = DASH; });
      rows.appendChild(el);
    }
  }

  function renderTicker(list) {
    const sig = list.map((r) => r.key + r.price + r.change).join('|');
    if (sig === tickerSig) return;
    tickerSig = sig;
    const track = ticker.querySelector('.track');
    track.replaceChildren();
    const make = (hidden) => {
      const g = document.createElement('div');
      g.className = 'tg';
      if (hidden) g.setAttribute('aria-hidden', 'true');
      for (const r of list) {
        const it = document.createElement('span');
        it.className = 'ti';
        it.append(logoNode(r.logo, r.symbol, ''));
        const up = r.change != null && r.change > 0, dn = r.change != null && r.change < 0;
        it.insertAdjacentHTML('beforeend', '<b>' + esc(r.symbol) + '</b><span class="tp">' + fmtPrice(r.price) + '</span><span class="tc ' + (up ? 'up' : dn ? 'dn' : '') + '">' + fmtChange(r.change) + '</span>');
        g.appendChild(it);
      }
      return g;
    };
    track.append(make(false), make(true));
    ticker.classList.add('ready');
  }

  function renderTiles(list) {
    const vol = list.reduce((s, r) => s + (r.volume ?? 0), 0);
    const liq = list.reduce((s, r) => s + (r.liquidity ?? 0), 0);
    setNumber(tiles.count, list.length, fmtInt);
    setNumber(tiles.vol, vol, fmtUsdCompact);
    setNumber(tiles.liq, liq, fmtUsdCompact);
    const best = list.filter((r) => r.change != null).sort((a, b) => b.change - a.change)[0];
    tiles.mover.textContent = best ? best.symbol : DASH;
    setNumber(tiles.moverChg, best ? best.change : null, fmtChange);
    tiles.root.classList.add('ready');
  }

  return {
    init() { buildOwn(); skeletonRows(); },
    setOwn(next) { own = { ...own, ...next }; if (ownEl) renderOwn(); },
    setTrending(list) {
      hadData = true;
      err.hidden = true;
      status.textContent = 'live';
      status.dataset.s = 'ok';
      rows.querySelectorAll('.row.sk,.row.dash').forEach((n) => n.remove());
      const keep = new Set(list.map((r) => r.key));
      for (const [k, el] of trendEls) if (!keep.has(k)) { el.remove(); trendEls.delete(k); }
      list.forEach((r, i) => {
        const { el, fresh } = trendRow(r, i + 2);
        rows.appendChild(el); // appendChild keeps ordering in step with the sorted list
        if (fresh && !reduced()) {
          el.classList.add('enter');
          el.style.animationDelay = i * 55 + 'ms';
        }
      });
    },
    // ownAddress is passed by the caller so trending data stays independent of CA state
    setTickerAndTiles(list) { renderTicker(list); renderTiles(list); },
    setError({ retryIn }) {
      status.dataset.s = hadData ? 'stale' : 'err';
      status.textContent = hadData ? 'stale' : 'offline';
      err.hidden = false;
      err.textContent = (hadData ? 'Showing the last good snapshot. ' : 'The market source did not answer. ') +
        'Retrying in ' + Math.round(retryIn / 1000) + 's.';
      if (!hadData) { errorRows(); ticker.classList.remove('ready'); }
    },
    hasData: () => hadData,
  };
}
