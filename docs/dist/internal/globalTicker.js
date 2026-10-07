const activeClocks = new Set();
// Only one of these is ever pending; each is cleared as soon as its callback fires.
let globalTimeoutId = null;
let globalAnimationFrameId = null;
function isPageVisible() {
    return typeof document === 'undefined' || !document.hidden;
}
function anyClockRequestsAnimationFrame() {
    for (const clock of activeClocks) {
        if (clock._requestsAnimationFrame()) {
            return true;
        }
    }
    return false;
}
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
    if (isPageVisible()) {
        // Drop the hidden-tab fallback timeout so scheduling restarts from the current state
        if (globalTimeoutId !== null) {
            window.clearTimeout(globalTimeoutId);
            globalTimeoutId = null;
        }
        // Resync system clocks immediately
        const now = Date.now();
        for (const clock of activeClocks) {
            if (clock._isSystemDriven()) {
                clock._tick(now);
            }
        }
    }
    // Hidden tabs don't run animation frames, so this switches to the setTimeout fallback when hidden
    // and back to requestAnimationFrame when visible again
    scheduleGlobalTick();
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
/**
 * Ensures exactly one tick is pending, using requestAnimationFrame when a clock asks for it and
 * the page is visible, and setTimeout otherwise. Safe to call repeatedly, including mid-tick.
 */
function scheduleGlobalTick() {
    if (activeClocks.size === 0) {
        stopGlobalTicker();
        return;
    }
    if (anyClockRequestsAnimationFrame() && isPageVisible()) {
        if (globalTimeoutId !== null) {
            window.clearTimeout(globalTimeoutId);
            globalTimeoutId = null;
        }
        if (globalAnimationFrameId === null) {
            globalAnimationFrameId = window.requestAnimationFrame(onAnimationFrame);
        }
    }
    else {
        if (globalAnimationFrameId !== null) {
            window.cancelAnimationFrame(globalAnimationFrameId);
            globalAnimationFrameId = null;
        }
        if (globalTimeoutId === null) {
            globalTimeoutId = window.setTimeout(onTimeout, getGlobalTimeoutDelay(Date.now()));
        }
    }
}
function onTimeout() {
    globalTimeoutId = null;
    globalTick();
}
function onAnimationFrame() {
    globalAnimationFrameId = null;
    globalTick();
}
function globalTick() {
    const now = Date.now();
    const errors = [];
    // Iterate over a snapshot: countdown callbacks may create or destroy clocks mid-tick
    for (const clock of Array.from(activeClocks)) {
        try {
            clock._tick(now);
        }
        catch (error) {
            errors.push(error);
        }
    }
    // Schedule the next tick before surfacing errors, so one failing callback can't stop every clock
    scheduleGlobalTick();
    if (errors.length > 0) {
        for (const error of errors.slice(1)) {
            queueMicrotask(() => {
                throw error;
            });
        }
        throw errors[0];
    }
}
export function addClock(clock) {
    activeClocks.add(clock);
    if (clock._requestsAnimationFrame()) {
        ensureVisibilityListener();
    }
    scheduleGlobalTick();
}
export function removeClock(clock) {
    activeClocks.delete(clock);
    if (!anyClockRequestsAnimationFrame()) {
        detachVisibilityListener();
    }
    scheduleGlobalTick();
}
export function resetGlobalStateForTesting() {
    activeClocks.clear();
    stopGlobalTicker();
    detachVisibilityListener();
}
//# sourceMappingURL=globalTicker.js.map