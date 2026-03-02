export interface TickerClock {
  _tick: (now: number, timestamp?: number) => void;
  _requestsAnimationFrame: () => boolean;
  _isSystemDriven: () => boolean;
  _getTimeoutDelay: (now: number) => number;
}

const activeClocks = new Set<TickerClock>();
let globalTimeoutId: number | null = null;
let globalAnimationFrameId: number | null = null;
let isGlobalPageVisible = true;

function getGlobalTimeoutDelay(now: number): number {
  let nextDelay = Infinity;

  for (const clock of activeClocks) {
    const delay = clock._getTimeoutDelay(now);
    if (Number.isFinite(delay) && delay >= 0 && delay < nextDelay) {
      nextDelay = delay;
    }
  }

  if (!Number.isFinite(nextDelay)) {
    return 1000;
  }

  return Math.max(nextDelay, 0);
}

function handleGlobalVisibilityChange(): void {
  isGlobalPageVisible = !document.hidden;

  if (!isGlobalPageVisible) {
    if (globalAnimationFrameId !== null) {
      window.cancelAnimationFrame(globalAnimationFrameId);
      globalAnimationFrameId = null;
    }
    // Schedule a setTimeout fallback (hidden tabs may still be clamped by the browser)
    if (globalTimeoutId === null) {
      globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(Date.now()));
    }
  } else {
    // Page became visible
    window.clearTimeout(globalTimeoutId as number);
    globalTimeoutId = null;

    // Resync system clocks immediately
    const now = Date.now();
    for (const clock of activeClocks) {
      if (clock._isSystemDriven()) {
        clock._tick(now);
      }
    }

    const requestsRaf = Array.from(activeClocks).some(c => c._requestsAnimationFrame());
    if (requestsRaf) {
      window.cancelAnimationFrame(globalAnimationFrameId as number);
      globalAnimationFrameId = window.requestAnimationFrame(globalTick);
    } else {
      globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
    }
  }
}

export function ensureVisibilityListener(): void {
  document.addEventListener('visibilitychange', handleGlobalVisibilityChange);
}

function detachVisibilityListener(): void {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleGlobalVisibilityChange);
  }
}

function stopGlobalTicker(): void {
  if (globalTimeoutId !== null) {
    window.clearTimeout(globalTimeoutId);
    globalTimeoutId = null;
  }
  if (globalAnimationFrameId !== null) {
    window.cancelAnimationFrame(globalAnimationFrameId);
    globalAnimationFrameId = null;
  }
}

function startGlobalTicker(): void {
  const requestsRaf = Array.from(activeClocks).some(c => c._requestsAnimationFrame());

  if (requestsRaf && isGlobalPageVisible) {
    if (globalTimeoutId !== null) {
      window.clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }
    if (globalAnimationFrameId === null) {
      globalAnimationFrameId = window.requestAnimationFrame(globalTick);
    }
  } else {
    if (globalAnimationFrameId !== null) {
      window.cancelAnimationFrame(globalAnimationFrameId);
      globalAnimationFrameId = null;
    }
    if (globalTimeoutId === null) {
      globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(Date.now()));
    }
  }
}

function globalTick(timestamp?: number): void {
  if (activeClocks.size === 0) {
    stopGlobalTicker();
    return;
  }

  const now = Date.now();
  const requestsRaf = Array.from(activeClocks).some(c => c._requestsAnimationFrame());

  for (const clock of activeClocks) {
    clock._tick(now, timestamp);
  }

  if (requestsRaf && isGlobalPageVisible) {
    globalAnimationFrameId = window.requestAnimationFrame(globalTick);
  } else {
    globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
  }
}

export function addClock(clock: TickerClock): void {
  activeClocks.add(clock);
  if (clock._requestsAnimationFrame()) {
    ensureVisibilityListener();
  }
  startGlobalTicker();
}

export function removeClock(clock: TickerClock): void {
  activeClocks.delete(clock);

  if (activeClocks.size === 0) {
    stopGlobalTicker();
    detachVisibilityListener();
    return;
  }

  const hasRafClock = Array.from(activeClocks).some(c => c._requestsAnimationFrame());
  if (!hasRafClock) {
    detachVisibilityListener();
  }

  startGlobalTicker();
}

export function resetGlobalStateForTesting(): void {
  activeClocks.clear();
  stopGlobalTicker();
  detachVisibilityListener();
}
