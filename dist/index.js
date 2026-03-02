/**
 * New JS Clock - A modern TypeScript clock library
 * Copyright (c) Thiago Cavalcanti Pimenta
 * Licensed under MIT
 */
import { addClock, removeClock } from './internal/globalTicker.js';
/**
 * Validates a time string in HH:MM:SS or HH:MM:SS:CC format
 */
function validateTimeString(timeString) {
    const pattern = /^(([01][0-9])|(2[0-3])):[0-5][0-9]:[0-5][0-9](:[0-9][0-9])?$/;
    return pattern.test(timeString);
}
/**
 * Validates an IANA timezone name
 */
function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Parses a time string into its components
 */
function parseTimeString(timeString) {
    const parts = timeString.split(':');
    return {
        hours: parseInt(parts[0], 10),
        minutes: parseInt(parts[1], 10),
        seconds: parseInt(parts[2], 10),
        centiseconds: parts[3] ? parseInt(parts[3], 10) : 0
    };
}
/**
 * Adds leading zero to single digit numbers
 */
function padZero(num) {
    return num < 10 ? `0${num}` : num.toString();
}
/**
 * Converts 24-hour format to 12-hour format
 */
function to12Hour(hours) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const convertedHours = hours % 12 || 12;
    return { hours: convertedHours, period };
}
/**
 * Formats time components into a display string
 */
function formatTimeString(components, showCenti, showHour, showMinute, use12Hour) {
    const parts = [];
    let period = '';
    if (showHour) {
        let displayHours = components.hours;
        if (use12Hour) {
            const converted = to12Hour(components.hours);
            displayHours = converted.hours;
            period = converted.period;
        }
        parts.push(padZero(displayHours));
    }
    if (showMinute) {
        parts.push(padZero(components.minutes));
    }
    parts.push(padZero(components.seconds));
    if (showCenti) {
        parts.push(padZero(components.centiseconds));
    }
    let timeString = parts.join(':');
    if (period) {
        timeString += ' ' + period;
    }
    return timeString;
}
/**
 * Runtime guard for validating DOM element inputs from JavaScript consumers
 */
function isHTMLelement(value) {
    return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}
/**
 * Creates a new clock instance attached to a DOM element
 *
 * @param element - The DOM element to render the clock in
 * @param initialTime - Optional initial time in HH:MM:SS or HH:MM:SS:CC format
 * @param options - Configuration options
 * @returns ClockInstance with control methods
 */
export function createClock(element, initialTime, options = {}) {
    if (!isHTMLelement(element)) {
        throw new TypeError('Invalid element: must be an HTMLElement');
    }
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('Invalid options: must be an object');
    }
    // Validate options
    if (options.countdown !== undefined && typeof options.countdown !== 'boolean') {
        throw new TypeError('Invalid countdown option: must be a boolean');
    }
    if (options.showCenti !== undefined && typeof options.showCenti !== 'boolean') {
        throw new TypeError('Invalid showCenti option: must be a boolean');
    }
    if (options.showHour !== undefined && typeof options.showHour !== 'boolean') {
        throw new TypeError('Invalid showHour option: must be a boolean');
    }
    if (options.showMinute !== undefined && typeof options.showMinute !== 'boolean') {
        throw new TypeError('Invalid showMinute option: must be a boolean');
    }
    if (options.callback !== undefined && typeof options.callback !== 'function') {
        throw new TypeError('Invalid callback: must be a function');
    }
    if (options.use12Hour !== undefined && typeof options.use12Hour !== 'boolean') {
        throw new TypeError('Invalid use12Hour option: must be a boolean');
    }
    if (options.timezoneOffset !== undefined && typeof options.timezoneOffset !== 'number') {
        throw new TypeError('Invalid timezoneOffset option: must be a number');
    }
    if (options.timezoneOffset !== undefined &&
        (!Number.isFinite(options.timezoneOffset) || options.timezoneOffset < -12 || options.timezoneOffset > 14)) {
        throw new RangeError('Invalid timezoneOffset: must be between -12 and +14');
    }
    if (options.timezone !== undefined && typeof options.timezone !== 'string') {
        throw new TypeError('Invalid timezone option: must be a string');
    }
    if (options.timezone !== undefined && !isValidTimezone(options.timezone)) {
        throw new RangeError(`Invalid timezone: "${options.timezone}" is not a valid IANA timezone name`);
    }
    if (options.timezone !== undefined && options.timezoneOffset !== undefined) {
        throw new Error('Cannot use both timezone and timezoneOffset options; choose one');
    }
    if (options.stopwatch !== undefined && typeof options.stopwatch !== 'boolean') {
        throw new TypeError('Invalid stopwatch option: must be a boolean');
    }
    if (options.lap !== undefined && typeof options.lap !== 'boolean') {
        throw new TypeError('Invalid lap option: must be a boolean');
    }
    if (options.lapWord !== undefined && typeof options.lapWord !== 'string') {
        throw new TypeError('Invalid lapWord option: must be a string');
    }
    if (options.lapMode !== undefined && !['splits', 'laps', 'both'].includes(options.lapMode)) {
        throw new TypeError('Invalid lapMode option: must be "splits", "laps", or "both"');
    }
    if (options.useAnimationFrame !== undefined && typeof options.useAnimationFrame !== 'boolean') {
        throw new TypeError('Invalid useAnimationFrame option: must be a boolean');
    }
    // Lap mode requires stopwatch mode
    if (options.lap === true && options.stopwatch !== true) {
        throw new Error('Lap mode requires stopwatch mode to be enabled');
    }
    // lapMode requires lap to be enabled
    if (options.lapMode !== undefined && options.lap !== true) {
        throw new Error('lapMode requires lap mode to be enabled');
    }
    // State
    let time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
    let isStopped = false;
    let isDestroyed = false;
    let lapRecords = [];
    let lastLapPerfTime = performance.now();
    // Custom clock anchoring
    let customClockStartTimeMs = Date.now();
    let customClockElapsedMs = 0;
    let initialTimeMs = 0;
    // Animation frame state for this specific clock
    let lastTimestamp = 0;
    let accumulatedTime = 0;
    const useAnimationFrame = options.useAnimationFrame ?? false;
    const showCenti = options.showCenti ?? false;
    const showHour = options.showHour ?? true;
    const showMinute = options.showMinute ?? true;
    const isCountdown = options.countdown ?? false;
    const isStopwatch = options.stopwatch ?? false;
    const useLap = options.lap ?? false;
    const lapMode = options.lapMode ?? 'both';
    const lapWord = options.lapWord ?? (lapMode === 'splits' ? 'Split' : 'Lap');
    const callback = options.callback;
    const use12Hour = options.use12Hour ?? false;
    const timezoneOffset = options.timezoneOffset;
    const timezone = options.timezone;
    const isSystemDrivenClock = !isCountdown && !isStopwatch && !initialTime;
    // If countdown mode, require initial time
    if (isCountdown && !initialTime) {
        throw new Error('Initial time required for countdown mode');
    }
    // Stopwatch mode cannot be combined with timezone options
    if (isStopwatch && (timezone !== undefined || timezoneOffset !== undefined)) {
        throw new Error('Stopwatch mode cannot be combined with timezone options');
    }
    // Parse initial time if provided
    if (initialTime) {
        if (!validateTimeString(initialTime)) {
            throw new Error('Invalid time string format: must be HH:MM:SS or HH:MM:SS:CC with leading zeros');
        }
        time = parseTimeString(initialTime);
        initialTimeMs = time.hours * 3600000 + time.minutes * 60000 + time.seconds * 1000 + time.centiseconds * 10;
    }
    else if (isStopwatch) {
        // Stopwatch starts at 00:00:00 (or 00:00:00:00 if centiseconds)
        time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
        initialTimeMs = 0;
    }
    /**
     * Updates the display with current time
     */
    function updateDisplay() {
        const timeString = formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
        if (element.textContent !== timeString) {
            element.textContent = timeString;
        }
    }
    /**
     * Gets current time from system clock with optional timezone offset
     */
    function syncWithSystemTime(nowTime) {
        const now = nowTime ? new Date(nowTime) : new Date();
        // Use IANA timezone (DST-aware)
        if (timezone !== undefined) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            const parts = formatter.formatToParts(now);
            const getPart = (type) => {
                const part = parts.find(p => p.type === type);
                return part ? parseInt(part.value, 10) : 0;
            };
            time = {
                hours: getPart('hour'),
                minutes: getPart('minute'),
                seconds: getPart('second'),
                centiseconds: showCenti ? Math.floor(now.getMilliseconds() / 10) : 0
            };
        }
        // Apply static timezone offset
        else if (timezoneOffset !== undefined) {
            const offsetMs = timezoneOffset * 60 * 60 * 1000;
            const adjustedTime = new Date(now.getTime() + offsetMs);
            time = {
                hours: adjustedTime.getUTCHours(),
                minutes: adjustedTime.getUTCMinutes(),
                seconds: adjustedTime.getUTCSeconds(),
                centiseconds: showCenti ? Math.floor(adjustedTime.getUTCMilliseconds() / 10) : 0
            };
        }
        // Use local system time
        else {
            time = {
                hours: now.getHours(),
                minutes: now.getMinutes(),
                seconds: now.getSeconds(),
                centiseconds: showCenti ? Math.floor(now.getMilliseconds() / 10) : 0
            };
        }
    }
    /**
     * Syncs the custom clock time using the Date.now() anchor
     */
    function syncCustomTimeAnchor(now) {
        const currentElapsedMs = customClockElapsedMs + (now - customClockStartTimeMs);
        const intervalMs = showCenti ? 10 : 1000;
        const elapsedIntervals = Math.floor(currentElapsedMs / intervalMs);
        const effectiveElapsedMs = elapsedIntervals * intervalMs;
        if (isCountdown) {
            // Use raw elapsed time for callback precision, even when display is quantized to seconds.
            const remainingRawMs = initialTimeMs - currentElapsedMs;
            if (remainingRawMs <= 0) {
                completeCountdown(true);
                return;
            }
            const currentMs = initialTimeMs - effectiveElapsedMs;
            const totalCs = Math.floor(currentMs / 10);
            time = {
                hours: Math.floor(totalCs / 360000) % 24,
                minutes: Math.floor((totalCs % 360000) / 6000),
                seconds: Math.floor((totalCs % 6000) / 100),
                centiseconds: totalCs % 100
            };
        }
        else {
            const currentMs = initialTimeMs + effectiveElapsedMs;
            const totalCs = Math.floor(currentMs / 10);
            time = {
                hours: Math.floor(totalCs / 360000) % 24,
                minutes: Math.floor((totalCs % 360000) / 6000),
                seconds: Math.floor((totalCs % 6000) / 100),
                centiseconds: totalCs % 100
            };
        }
    }
    function _getTimeoutDelay(now) {
        if (showCenti) {
            return 10;
        }
        if (isSystemDrivenClock) {
            return 1000 - (now % 1000);
        }
        const elapsedMs = customClockElapsedMs + (now - customClockStartTimeMs);
        const elapsedRemainder = elapsedMs % 1000;
        const msToNextSecond = elapsedRemainder === 0 ? 1000 : 1000 - elapsedRemainder;
        if (isCountdown) {
            const remainingMs = initialTimeMs - elapsedMs;
            if (remainingMs <= 0) {
                return 0;
            }
            if (remainingMs < 1000) {
                return remainingMs;
            }
            return Math.min(msToNextSecond, remainingMs);
        }
        return msToNextSecond;
    }
    function setTimeToZero() {
        time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
    }
    function completeCountdown(invokeCallback) {
        stopClock();
        customClockElapsedMs = initialTimeMs;
        customClockStartTimeMs = Date.now();
        setTimeToZero();
        if (invokeCallback && callback) {
            callback();
        }
    }
    function finalizeZeroCountdown(invokeCallback) {
        if (!isCountdown || initialTimeMs !== 0) {
            return false;
        }
        completeCountdown(invokeCallback);
        updateDisplay();
        return true;
    }
    /**
     * Internal tick logic driven by the global ticker
     */
    function _tick(now, timestamp) {
        if (isStopped || isDestroyed)
            return;
        if (isSystemDrivenClock) {
            syncWithSystemTime(now);
            updateDisplay();
            return;
        }
        if (useAnimationFrame && timestamp !== undefined) {
            // rAF path - calculate delta time
            if (lastTimestamp === 0) {
                lastTimestamp = timestamp;
            }
            const delta = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            accumulatedTime += delta;
            const tickInterval = showCenti ? 10 : 1000;
            let shouldUpdate = false;
            while (accumulatedTime >= tickInterval) {
                accumulatedTime -= tickInterval;
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                syncCustomTimeAnchor(now);
                updateDisplay();
            }
        }
        else {
            // setTimeout path
            syncCustomTimeAnchor(now);
            updateDisplay();
        }
    }
    const internalInstance = {
        getTime,
        setTime,
        stopClock,
        startClock,
        toggleClock,
        destroy,
        isRunning,
        reset,
        lap,
        getLaps,
        getSplitTimes,
        getLapTimes,
        getLapRecords,
        clearLaps,
        bestLap,
        worstLap,
        _tick,
        _requestsAnimationFrame: () => useAnimationFrame,
        _isSystemDriven: () => isSystemDrivenClock,
        _getTimeoutDelay
    };
    /**
     * Starts the system clock mode
     */
    function startSystemClock() {
        syncWithSystemTime();
        updateDisplay();
        addClock(internalInstance);
    }
    /**
     * Starts the custom time clock mode
     */
    function startCustomClock() {
        customClockStartTimeMs = Date.now();
        updateDisplay();
        addClock(internalInstance);
    }
    /**
     * Stops the clock
     */
    function stopClock() {
        if (!isStopped && !isSystemDrivenClock) {
            customClockElapsedMs += Date.now() - customClockStartTimeMs;
        }
        isStopped = true;
        removeClock(internalInstance);
    }
    /**
     * Starts the clock
     */
    function startClock() {
        if (isDestroyed || !isStopped)
            return;
        isStopped = false;
        if (!isSystemDrivenClock) {
            customClockStartTimeMs = Date.now();
        }
        else {
            // System clock mode - sync first
            syncWithSystemTime();
        }
        updateDisplay();
        addClock(internalInstance);
    }
    /**
     * Toggles the clock on/off
     */
    function toggleClock() {
        if (isStopped) {
            startClock();
        }
        else {
            stopClock();
        }
    }
    /**
     * Gets current time string
     */
    function getTime() {
        return formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
    }
    /**
     * Checks if clock is running
     */
    function isRunning() {
        return !isStopped && !isDestroyed;
    }
    /**
     * Destroys the clock instance
     */
    function destroy() {
        isDestroyed = true;
        stopClock();
        element.textContent = '';
    }
    /**
     * Sets a new time for the clock
     */
    function setTime(timeString) {
        if (isDestroyed)
            return;
        if (!validateTimeString(timeString)) {
            throw new Error('Invalid time string format: must be HH:MM:SS or HH:MM:SS:CC with leading zeros');
        }
        time = parseTimeString(timeString);
        initialTimeMs = time.hours * 3600000 + time.minutes * 60000 + time.seconds * 1000 + time.centiseconds * 10;
        customClockElapsedMs = 0;
        customClockStartTimeMs = Date.now();
        if (finalizeZeroCountdown(true)) {
            return;
        }
        updateDisplay();
    }
    /**
     * Resets the clock to its initial time
     */
    function reset() {
        if (isDestroyed)
            return;
        if (isStopwatch) {
            // Stopwatch always resets to 00:00:00
            time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
            initialTimeMs = 0;
            customClockElapsedMs = 0;
            customClockStartTimeMs = Date.now();
            lapRecords = [];
            lastLapPerfTime = performance.now();
        }
        else if (initialTime) {
            time = parseTimeString(initialTime);
            initialTimeMs = time.hours * 3600000 + time.minutes * 60000 + time.seconds * 1000 + time.centiseconds * 10;
            customClockElapsedMs = 0;
            customClockStartTimeMs = Date.now();
        }
        else {
            syncWithSystemTime();
        }
        if (finalizeZeroCountdown(true)) {
            return;
        }
        isStopped = false;
        updateDisplay();
        addClock(internalInstance);
    }
    /**
     * Records a lap/split time (only works in lap mode)
     */
    function lap() {
        if (isDestroyed)
            return '';
        assertLapModeEnabled();
        const now = performance.now();
        const preciseElapsedMs = now - lastLapPerfTime;
        lastLapPerfTime = now;
        const splitTime = formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
        const lapNumber = lapRecords.length + 1;
        // Derive lap time components from high-resolution elapsed measurement
        const totalCs = Math.round(preciseElapsedMs / 10);
        const lapDiff = {
            hours: Math.floor(totalCs / 360000),
            minutes: Math.floor((totalCs % 360000) / 6000),
            seconds: Math.floor((totalCs % 6000) / 100),
            centiseconds: totalCs % 100
        };
        const lapTime = formatTimeString(lapDiff, showCenti, showHour, showMinute, use12Hour);
        const timestamp = Date.now();
        const record = {
            lapNumber,
            lapTime,
            splitTime,
            preciseElapsedMs,
            timestamp
        };
        lapRecords.push(record);
        if (lapMode === 'splits') {
            return lapWord ? `${lapWord} ${lapNumber}: ${splitTime}` : `${lapNumber}: ${splitTime}`;
        }
        else if (lapMode === 'laps') {
            return lapWord ? `${lapWord} ${lapNumber}: ${lapTime}` : `${lapNumber}: ${lapTime}`;
        }
        else {
            return lapWord ? `${lapWord} ${lapNumber}: ${lapTime} (${splitTime})` : `${lapNumber}: ${lapTime} (${splitTime})`;
        }
    }
    /**
     * Gets all recorded lap/split times based on lapMode
     */
    function getLaps() {
        if (isDestroyed)
            return [];
        assertLapModeEnabled();
        return lapRecords.map(record => {
            if (lapMode === 'splits') {
                return lapWord ? `${lapWord} ${record.lapNumber}: ${record.splitTime}` : `${record.lapNumber}: ${record.splitTime}`;
            }
            else if (lapMode === 'laps') {
                return lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime}` : `${record.lapNumber}: ${record.lapTime}`;
            }
            else {
                return lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime} (${record.splitTime})` : `${record.lapNumber}: ${record.lapTime} (${record.splitTime})`;
            }
        });
    }
    /**
     * Gets all split times
     */
    function getSplitTimes() {
        if (isDestroyed)
            return [];
        assertLapModeEnabled();
        if (lapMode === 'laps') {
            throw new Error('Split times are only available when lapMode is "splits" or "both"');
        }
        return lapRecords.map(record => lapWord ? `${lapWord} ${record.lapNumber}: ${record.splitTime}` : `${record.lapNumber}: ${record.splitTime}`);
    }
    /**
     * Gets all lap times
     */
    function getLapTimes() {
        if (isDestroyed)
            return [];
        assertLapModeEnabled();
        if (lapMode === 'splits') {
            throw new Error('Lap times are only available when lapMode is "laps" or "both"');
        }
        return lapRecords.map(record => lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime}` : `${record.lapNumber}: ${record.lapTime}`);
    }
    /**
     * Gets all lap records with full details
     */
    function getLapRecords() {
        if (isDestroyed)
            return [];
        assertLapModeEnabled();
        return [...lapRecords];
    }
    /**
     * Gets the best (fastest) lap time
     */
    function bestLap() {
        if (isDestroyed)
            return null;
        assertLapModeEnabled();
        if (lapMode === 'splits') {
            throw new Error('bestLap() is only available when lapMode is "laps" or "both"');
        }
        if (lapRecords.length === 0)
            return null;
        return lapRecords.reduce((best, record) => record.preciseElapsedMs < best.preciseElapsedMs ? record : best);
    }
    /**
     * Gets the worst (slowest) lap time
     */
    function worstLap() {
        if (isDestroyed)
            return null;
        assertLapModeEnabled();
        if (lapMode === 'splits') {
            throw new Error('worstLap() is only available when lapMode is "laps" or "both"');
        }
        if (lapRecords.length === 0)
            return null;
        return lapRecords.reduce((worst, record) => record.preciseElapsedMs > worst.preciseElapsedMs ? record : worst);
    }
    /**
     * Clears all recorded lap/split times
     */
    function clearLaps() {
        if (isDestroyed)
            return;
        assertLapModeEnabled();
        lapRecords = [];
        lastLapPerfTime = performance.now();
    }
    function assertLapModeEnabled() {
        if (!useLap) {
            throw new Error('Lap mode is not enabled');
        }
    }
    // Initialize the clock
    if (finalizeZeroCountdown(true)) {
        // Countdown at zero completes immediately during initialization.
    }
    else if (isStopwatch) {
        // Stopwatch mode - start at 00:00:00 and count up
        startCustomClock();
    }
    else if (initialTime) {
        startCustomClock();
    }
    else {
        startSystemClock();
    }
    // Return the public API
    return internalInstance;
}
// Default export for easier importing
export default createClock;
//# sourceMappingURL=index.js.map