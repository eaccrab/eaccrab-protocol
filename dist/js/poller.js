// Poll loop: fixed cadence on success, exponential backoff on failure, paused while the tab is hidden,
// immediate fetch when it becomes visible again.
export async function fetchJson(url, signal, timeoutMs = 12000) {
  const ctl = new AbortController();
  let timedOut = false;
  const t = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, timeoutMs);
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    if (timedOut) throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function createPoller({ run, interval = 60000, baseDelay = 3000, maxDelay = 60000, onState }) {
  let timer = null;
  let ctl = null;
  let fails = 0;
  let active = false;
  const jitter = (ms) => ms * (0.9 + Math.random() * 0.2);
  const schedule = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(tick, jitter(ms));
  };

  async function tick() {
    clearTimeout(timer);
    if (!active || document.hidden) return;
    ctl?.abort();
    ctl = new AbortController();
    const mine = ctl;
    try {
      await run(mine.signal);
      if (mine.signal.aborted) return;
      fails = 0;
      onState?.({ ok: true, fails });
      schedule(interval);
    } catch (error) {
      if (mine.signal.aborted) return; // paused by visibility: not a failure
      fails += 1;
      const wait = Math.min(maxDelay, baseDelay * 2 ** (fails - 1));
      onState?.({ ok: false, fails, error, retryIn: wait });
      schedule(wait);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) {
      clearTimeout(timer);
      ctl?.abort();
    } else tick();
  });
  return {
    start() {
      active = true;
      tick();
    },
    stop() {
      active = false;
      clearTimeout(timer);
      ctl?.abort();
    },
  };
}
