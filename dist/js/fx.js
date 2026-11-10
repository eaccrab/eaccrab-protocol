// Motion helpers. Every effect has an instant fallback under prefers-reduced-motion.
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => mq.matches;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Count a number cell toward its new value, flash on change (0.9s ease-out, see css .f-up / .f-dn).
export function setNumber(el, to, fmt, { duration = 700 } = {}) {
  const from = el._v;
  cancelAnimationFrame(el._raf);
  if (to == null || !isFinite(to)) {
    el._v = null;
    el.textContent = fmt(null);
    return;
  }
  el._v = to;
  if (reduced() || from === to) {
    el.textContent = fmt(to);
    return;
  }
  if (from != null) {
    el.classList.remove('f-up', 'f-dn');
    void el.offsetWidth;
    el.classList.add(to > from ? 'f-up' : 'f-dn');
  }
  const start = from ?? 0;
  // final value goes in first, so a throttled or paused rAF can never leave the cell empty;
  // the frame callback below overwrites it before the next paint
  el.textContent = fmt(to);
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    el.textContent = fmt(start + (to - start) * easeOut(k));
    if (k < 1) el._raf = requestAnimationFrame(step);
    else el.textContent = fmt(to);
  };
  el._raf = requestAnimationFrame(step);
}

// Spotlight: one delegated listener writes the pointer position into the hovered [data-spot].
export function initSpotlight() {
  let last = null;
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('[data-spot]');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', e.clientX - r.left + 'px');
    t.style.setProperty('--my', e.clientY - r.top + 'px');
    last = t;
  }, { passive: true });
  document.addEventListener('pointerleave', () => last?.style.removeProperty('--mx'));
}

// Scroll reveal with stagger: --i drives transition-delay (see css .rv).
export function initReveal() {
  const els = [...document.querySelectorAll('.rv')];
  if (reduced() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
}

export function initProgress(bar) {
  const upd = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  upd();
}

// Parallax: layers carry data-depth; pointer and scroll offset them. Static when motion is reduced.
export function initParallax(root) {
  const layers = [...root.querySelectorAll('[data-depth]')];
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
  const apply = () => {
    raf = 0;
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    const sy = Math.min(scrollY, innerHeight * 1.2);
    for (const l of layers) {
      const d = parseFloat(l.dataset.depth);
      l.style.transform = 'translate3d(' + (px * d * 26).toFixed(2) + 'px,' + (py * d * 20 - sy * d * 0.22).toFixed(2) + 'px,0)';
    }
    if (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) raf = requestAnimationFrame(apply);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
  if (reduced()) return;
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });
  addEventListener('scroll', kick, { passive: true });
  kick();
}

// Starfield on canvas, three depth layers, colours read from the palette tokens.
export function initStars(canvas) {
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const cols = [css.getPropertyValue('--edge'), css.getPropertyValue('--glow'), css.getPropertyValue('--blue')].map((s) => s.trim());
  let w = 0, h = 0, dpr = 1, stars = [];
  const build = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const n = Math.round((w * h) / 7000);
    stars = Array.from({ length: n }, () => {
      const z = Math.random();
      return { x: Math.random() * w, y: Math.random() * h, z, r: 0.4 + z * 1.3, c: cols[(Math.random() * 3) | 0], p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.4 };
    });
  };
  let ox = 0, oy = 0, tx = 0, ty = 0;
  const draw = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;
    for (const s of stars) {
      const x = ((s.x + ox * s.z * 18) % w + w) % w;
      const y = ((s.y + oy * s.z * 14 - sy * s.z * 0.12) % h + h) % h;
      const a = reduced() ? 0.7 : 0.45 + 0.5 * Math.sin(t / 900 * s.s + s.p);
      ctx.globalAlpha = Math.max(0.1, Math.min(1, a)) * (0.35 + s.z * 0.65);
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.2832); ctx.fill();
    }
  };
  const loop = (t) => {
    ox += (tx - ox) * 0.05; oy += (ty - oy) * 0.05;
    draw(t);
    if (!reduced() && !document.hidden) requestAnimationFrame(loop);
  };
  build();
  addEventListener('resize', () => { build(); draw(0); });
  if (reduced()) { draw(0); mq.addEventListener('change', () => location.reload()); return; }
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(loop); });
  requestAnimationFrame(loop);
}

// Copy with feedback; resolves true on success.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
