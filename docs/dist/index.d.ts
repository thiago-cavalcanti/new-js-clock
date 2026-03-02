/**
 * New JS Clock - A modern TypeScript clock library
 * Copyright (c) Thiago Cavalcanti Pimenta
 * Licensed under MIT
 */
export type LapMode = 'splits' | 'laps' | 'both';
export interface LapRecord {
    lapNumber: number;
    lapTime: string;
    splitTime: string;
    /** High-resolution lap delta in milliseconds (from performance.now()) */
    preciseElapsedMs: number;
    timestamp: number;
}
export interface ClockOptions {
    /** Whether to display centiseconds */
    showCenti?: boolean;
    /** Whether to run as countdown timer */
    countdown?: boolean;
    /** Callback function when countdown reaches zero */
    callback?: () => void;
    /** Whether to show hours */
    showHour?: boolean;
    /** Whether to show minutes */
    showMinute?: boolean;
    /** Whether to use 12-hour format with AM/PM */
    use12Hour?: boolean;
    /** Timezone offset in hours from UTC (e.g., -5 for EST, +1 for CET, +5.5 for IST). Does NOT handle DST. */
    timezoneOffset?: number;
    /** IANA timezone name for DST-aware timezone support (e.g., "America/New_York", "Europe/London") */
    timezone?: string;
    /** Run as stopwatch (counts up from 00:00:00) instead of using system time */
    stopwatch?: boolean;
    /** Enable lap/split mode - records lap times */
    lap?: boolean;
    /** Lap mode type: "splits" (total time since start), "laps" (time between laps), or "both" */
    lapMode?: LapMode;
    /** Custom word to display before lap number (default: "Lap" for laps, "Split" for splits). Set to "" for no word. */
    lapWord?: string;
    /** Use requestAnimationFrame for smoother updates. Falls back to setTimeout when page is hidden. */
    useAnimationFrame?: boolean;
}
export interface ClockInstance {
    /** Get the current time string */
    getTime: () => string;
    /** Set a new time for the clock */
    setTime: (timeString: string) => void;
    /** Stop the clock */
    stopClock: () => void;
    /** Start the clock */
    startClock: () => void;
    /** Toggle the clock on/off */
    toggleClock: () => void;
    /** Destroy the clock instance and clean up */
    destroy: () => void;
    /** Check if the clock is currently running */
    isRunning: () => boolean;
    /** Reset the clock to its initial time (useful for countdown timers) */
    reset: () => void;
    /** Record a lap/split and return it (only works in lap mode) */
    lap: () => string;
    /** Get all recorded laps/splits (only works in lap mode) */
    getLaps: () => string[];
    /** Get all split times (only works in lap mode with lapMode: "splits" or "both") */
    getSplitTimes: () => string[];
    /** Get all lap times (only works in lap mode with lapMode: "laps" or "both") */
    getLapTimes: () => string[];
    /** Get all lap records with full details (only works in lap mode) */
    getLapRecords: () => LapRecord[];
    /** Clear all recorded laps/splits (only works in lap mode) */
    clearLaps: () => void;
    /** Get the best lap time (only works in lap mode with lapMode: "laps" or "both") */
    bestLap: () => LapRecord | null;
    /** Get the worst lap time (only works in lap mode with lapMode: "laps" or "both") */
    worstLap: () => LapRecord | null;
}
/**
 * Creates a new clock instance attached to a DOM element
 *
 * @param element - The DOM element to render the clock in
 * @param initialTime - Optional initial time in HH:MM:SS or HH:MM:SS:CC format
 * @param options - Configuration options
 * @returns ClockInstance with control methods
 */
export declare function createClock(element: HTMLElement, initialTime?: string, options?: ClockOptions): ClockInstance;
export default createClock;
//# sourceMappingURL=index.d.ts.map