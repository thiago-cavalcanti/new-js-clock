export interface TickerClock {
    _tick: (now: number, timestamp?: number) => void;
    _requestsAnimationFrame: () => boolean;
    _isSystemDriven: () => boolean;
    _getTimeoutDelay: (now: number) => number;
}
export declare function ensureVisibilityListener(): void;
export declare function addClock(clock: TickerClock): void;
export declare function removeClock(clock: TickerClock): void;
export declare function resetGlobalStateForTesting(): void;
//# sourceMappingURL=globalTicker.d.ts.map