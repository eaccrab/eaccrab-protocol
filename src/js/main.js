import { register, isStated, handleOf, hrefOf } from './register.js';
import { gateCA } from './gate.js';
import { createPoller } from './poller.js';
import { fetchTrending } from './market.js';
import { fetchOwn, composeRows } from './own.js';
import { createBoard, ICON_COPY, ICON_CHECK } from './board.js';
import { initSpotlight, initReveal, initProgress, initParallax, initStars, copyText } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);

const X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const GH_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// ---------- social (icon only; unstated record renders the icon inert, no href) ----------
function socialIcon(rec, svg, name) {
  const href = hrefOf(rec);
  if (href) {
    const a = document.createElement('a');
    a.className = 'ico';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', name + ' ' + (handleOf(rec) ?? ''));
    a.innerHTML = svg;
    return a;
  }
  const s = document.createElement('span');
  s.className = 'ico is-inert';
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', name + ', not published yet');
  s.title = name + ' is not published yet';
  s.innerHTML = svg;
  return s;
}
$('#social').append(socialIcon(register.x, X_SVG, 'X'), socialIcon(register.github, GH_SVG, 'GitHub'));

const xHref = hrefOf(register.x);
if (xHref) {
  const a = document.createElement('a');
  a.className = 'btn';
  a.href = xHref;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = 'Follow ' + handleOf(register.x);
  $('#cta-x').replaceWith(a);
} else $('#cta-x').remove();

// ---------- CA slot: top of page, large, full address, click-to-copy; inert until stated ----------
const gate = gateCA(register.ca);
function renderCA() {
  const bar = $('#cabar');
  bar.dataset.state = gate.state;
  const label = '<span class="cap">Contract address</span>';
  if (gate.state === 'stated') {
    bar.innerHTML = label + '<code id="ca-code"></code><button type="button" class="cp big" id="ca-btn" aria-label="Copy contract address"><span class="cy">' + ICON_COPY + '</span><span class="ck">' + ICON_CHECK + '</span></button><span class="copied" id="ca-fb" aria-live="polite"></span>';
    $('#ca-code').textContent = gate.address;
    const btn = $('#ca-btn');
    const go = async () => {
      if (!(await copyText(gate.address))) { $('#ca-fb').textContent = 'Copy failed'; return; }
      btn.classList.add('ok');
      $('#ca-fb').textContent = 'Copied';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove('ok'); $('#ca-fb').textContent = ''; }, 1800);
    };
    btn.addEventListener('click', go);
    $('#ca-code').addEventListener('click', go);
  } else {
    bar.innerHTML = label + '<code class="ph" aria-disabled="true">0x · · · · · · · · · · · · · · · · · · · ·</code><span class="wait">not announced yet</span>';
  }
}
renderCA();

// ---------- chain panel (from the register) ----------
const ch = register.chain;
if (isStated(ch)) {
  const rows = [
    ['Chain id', ch.chainId + ' · ' + ch.chainIdHex],
    ['Currency', ch.currency],
    ['RPC', ch.rpc.replace(/^https:\/\//, '')],
    ['Explorer', '<a href="' + ch.explorer + '" target="_blank" rel="noopener noreferrer">' + ch.explorer.replace(/^https:\/\//, '') + '</a>'],
  ];
  $('#chain-spec').innerHTML = rows.map(([k, v]) => '<div>' + k + '</div><div>' + v + '</div>').join('');
  $('#chain-name').textContent = ch.name;
  $('#add-chain').addEventListener('click', async () => {
    const note = $('#chain-note');
    note.hidden = false;
    if (!window.ethereum?.request) { note.textContent = 'No wallet detected in this browser.'; return; }
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: ch.chainIdHex, chainName: ch.name, nativeCurrency: { name: ch.currency, symbol: ch.currency, decimals: 18 }, rpcUrls: [ch.rpc], blockExplorerUrls: [ch.explorer] }],
      });
      note.textContent = 'Network request sent to your wallet.';
    } catch (e) { note.textContent = e?.code === 4001 ? 'Request dismissed.' : 'Wallet could not add the network.'; }
  });
}

// ---------- footer links ----------
{
  const f = $('#foot-links');
  f.append(socialIcon(register.x, X_SVG, 'X'), socialIcon(register.github, GH_SVG, 'GitHub'));
}

// ---------- tabs ----------
{
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on) { p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap'); }
    });
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
}

// ---------- market board ----------
const board = createBoard({
  rows: $('#rows'),
  ticker: $('#ticker'),
  status: $('#mk-status'),
  err: $('#mk-err'),
  tiles: { root: $('#tiles'), count: $('#t-count'), vol: $('#t-vol'), liq: $('#t-liq'), mover: $('#t-mover'), moverChg: $('#t-mover-chg') },
}, { brandLogo: '/brand/crab-128.png' });
board.init();
board.setOwn({ gate: gate.state, address: gate.address });

let trending = [];
function paint() {
  const rows = composeRows(trending, gate.address, 9);
  board.setTrending(rows);
  board.setTickerAndTiles(gate.address ? composeRows(trending, gate.address, 10) : trending);
}

// Market: follows the market register record only.
if (isStated(register.market)) {
  createPoller({
    run: async (signal) => {
      const list = await fetchTrending(register.market, signal);
      if (!list.length) throw new Error('empty');
      trending = list;
      paint();
    },
    onState: (s) => { if (!s.ok) board.setError(s); },
  }).start();
}

// Own token: only the stated branch polls; the absent branch is the pinned brand placeholder row.
if (gate.state === 'stated' && isStated(register.pairs)) {
  board.setOwn({ loading: true, failed: false });
  createPoller({
    run: async (signal) => {
      const d = await fetchOwn(register.pairs, gate.address, signal);
      board.setOwn({ data: d, loading: false, failed: false });
    },
    onState: (s) => { if (!s.ok) board.setOwn({ loading: false, failed: true }); },
  }).start();
}

// ---------- fx ----------
initProgress($('#progress'));
initStars($('#stars'));
initParallax($('#hero'));
initSpotlight();
initReveal();
