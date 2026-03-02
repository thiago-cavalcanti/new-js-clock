const activeClocks = new Set();
let globalTimeoutId = null;
let globalAnimationFrameId = null;
let isGlobalPageVisible = true;
function getGlobalTimeoutDelay(now) {
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
function handleGlobalVisibilityChange() {
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
    }
    else {
        // Page became visible
        window.clearTimeout(globalTimeoutId);
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
            window.cancelAnimationFrame(globalAnimationFrameId);
            globalAnimationFrameId = window.requestAnimationFrame(globalTick);
        }
        else {
            globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
        }
    }
}
export function ensureVisibilityListener() {
    document.addEventListener('visibilitychange', handleGlobalVisibilityChange);
}
function detachVisibilityListener() {
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleGlobalVisibilityChange);
    }
}
function stopGlobalTicker() {
    if (globalTimeoutId !== null) {
        window.clearTimeout(globalTimeoutId);
        globalTimeoutId = null;
    }
    if (globalAnimationFrameId !== null) {
        window.cancelAnimationFrame(globalAnimationFrameId);
        globalAnimationFrameId = null;
    }
}
function startGlobalTicker() {
    const requestsRaf = Array.from(activeClocks).some(c => c._requestsAnimationFrame());
    if (requestsRaf && isGlobalPageVisible) {
        if (globalTimeoutId !== null) {
            window.clearTimeout(globalTimeoutId);
            globalTimeoutId = null;
        }
        if (globalAnimationFrameId === null) {
            globalAnimationFrameId = window.requestAnimationFrame(globalTick);
        }
    }
    else {
        if (globalAnimationFrameId !== null) {
            window.cancelAnimationFrame(globalAnimationFrameId);
            globalAnimationFrameId = null;
        }
        if (globalTimeoutId === null) {
            globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(Date.now()));
        }
    }
}
function globalTick(timestamp) {
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
    }
    else {
        globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
    }
}
export function addClock(clock) {
    activeClocks.add(clock);
    if (clock._requestsAnimationFrame()) {
        ensureVisibilityListener();
    }
    startGlobalTicker();
}
export function removeClock(clock) {
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
export function resetGlobalStateForTesting() {
    activeClocks.clear();
    stopGlobalTicker();
    detachVisibilityListener();
}
//# sourceMappingURL=globalTicker.js.map