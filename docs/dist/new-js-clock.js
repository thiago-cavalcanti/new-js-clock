/**
 * new-js-clock v1.0.0
 * A modern TypeScript clock library with countdown support - jQuery-free rewrite of JS-Clock
 * 
 * @author tcpweb
 * @license MIT
 * @repository https://github.com/thiago-cavalcanti/new-js-clock.git
 */
"use strict";
var NewJSClock = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    createClock: () => createClock,
    default: () => index_default
  });

  // src/internal/globalTicker.ts
  var activeClocks = /* @__PURE__ */ new Set();
  var globalTimeoutId = null;
  var globalAnimationFrameId = null;
  var isGlobalPageVisible = true;
  function getGlobalTimeoutDelay(now) {
    let nextDelay = Infinity;
    for (const clock of activeClocks) {
      const delay = clock._getTimeoutDelay(now);
      if (Number.isFinite(delay) && delay >= 0 && delay < nextDelay) {
        nextDelay = delay;
      }
    }
    if (!Number.isFinite(nextDelay)) {
      return 1e3;
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
      if (globalTimeoutId === null) {
        globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(Date.now()));
      }
    } else {
      window.clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
      const now = Date.now();
      for (const clock of activeClocks) {
        if (clock._isSystemDriven()) {
          clock._tick(now);
        }
      }
      const requestsRaf = Array.from(activeClocks).some((c) => c._requestsAnimationFrame());
      if (requestsRaf) {
        window.cancelAnimationFrame(globalAnimationFrameId);
        globalAnimationFrameId = window.requestAnimationFrame(globalTick);
      } else {
        globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
      }
    }
  }
  function ensureVisibilityListener() {
    document.addEventListener("visibilitychange", handleGlobalVisibilityChange);
  }
  function detachVisibilityListener() {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleGlobalVisibilityChange);
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
    const requestsRaf = Array.from(activeClocks).some((c) => c._requestsAnimationFrame());
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
  function globalTick(timestamp) {
    if (activeClocks.size === 0) {
      stopGlobalTicker();
      return;
    }
    const now = Date.now();
    const requestsRaf = Array.from(activeClocks).some((c) => c._requestsAnimationFrame());
    for (const clock of activeClocks) {
      clock._tick(now, timestamp);
    }
    if (requestsRaf && isGlobalPageVisible) {
      globalAnimationFrameId = window.requestAnimationFrame(globalTick);
    } else {
      globalTimeoutId = window.setTimeout(globalTick, getGlobalTimeoutDelay(now));
    }
  }
  function addClock(clock) {
    activeClocks.add(clock);
    if (clock._requestsAnimationFrame()) {
      ensureVisibilityListener();
    }
    startGlobalTicker();
  }
  function removeClock(clock) {
    activeClocks.delete(clock);
    if (activeClocks.size === 0) {
      stopGlobalTicker();
      detachVisibilityListener();
      return;
    }
    const hasRafClock = Array.from(activeClocks).some((c) => c._requestsAnimationFrame());
    if (!hasRafClock) {
      detachVisibilityListener();
    }
    startGlobalTicker();
  }

  // src/index.ts
  function validateTimeString(timeString) {
    const pattern = /^(([01][0-9])|(2[0-3])):[0-5][0-9]:[0-5][0-9](:[0-9][0-9])?$/;
    return pattern.test(timeString);
  }
  function isValidTimezone(timezone) {
    try {
      Intl.DateTimeFormat(void 0, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
  function parseTimeString(timeString) {
    const parts = timeString.split(":");
    return {
      hours: parseInt(parts[0], 10),
      minutes: parseInt(parts[1], 10),
      seconds: parseInt(parts[2], 10),
      centiseconds: parts[3] ? parseInt(parts[3], 10) : 0
    };
  }
  function padZero(num) {
    return num < 10 ? `0${num}` : num.toString();
  }
  function to12Hour(hours) {
    const period = hours >= 12 ? "PM" : "AM";
    const convertedHours = hours % 12 || 12;
    return { hours: convertedHours, period };
  }
  function formatTimeString(components, showCenti, showHour, showMinute, use12Hour) {
    const parts = [];
    let period = "";
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
    let timeString = parts.join(":");
    if (period) {
      timeString += " " + period;
    }
    return timeString;
  }
  function isHTMLelement(value) {
    return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
  }
  function createClock(element, initialTime, options = {}) {
    if (!isHTMLelement(element)) {
      throw new TypeError("Invalid element: must be an HTMLElement");
    }
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Invalid options: must be an object");
    }
    if (options.countdown !== void 0 && typeof options.countdown !== "boolean") {
      throw new TypeError("Invalid countdown option: must be a boolean");
    }
    if (options.showCenti !== void 0 && typeof options.showCenti !== "boolean") {
      throw new TypeError("Invalid showCenti option: must be a boolean");
    }
    if (options.showHour !== void 0 && typeof options.showHour !== "boolean") {
      throw new TypeError("Invalid showHour option: must be a boolean");
    }
    if (options.showMinute !== void 0 && typeof options.showMinute !== "boolean") {
      throw new TypeError("Invalid showMinute option: must be a boolean");
    }
    if (options.callback !== void 0 && typeof options.callback !== "function") {
      throw new TypeError("Invalid callback: must be a function");
    }
    if (options.use12Hour !== void 0 && typeof options.use12Hour !== "boolean") {
      throw new TypeError("Invalid use12Hour option: must be a boolean");
    }
    if (options.timezoneOffset !== void 0 && typeof options.timezoneOffset !== "number") {
      throw new TypeError("Invalid timezoneOffset option: must be a number");
    }
    if (options.timezoneOffset !== void 0 && (!Number.isFinite(options.timezoneOffset) || options.timezoneOffset < -12 || options.timezoneOffset > 14)) {
      throw new RangeError("Invalid timezoneOffset: must be between -12 and +14");
    }
    if (options.timezone !== void 0 && typeof options.timezone !== "string") {
      throw new TypeError("Invalid timezone option: must be a string");
    }
    if (options.timezone !== void 0 && !isValidTimezone(options.timezone)) {
      throw new RangeError(`Invalid timezone: "${options.timezone}" is not a valid IANA timezone name`);
    }
    if (options.timezone !== void 0 && options.timezoneOffset !== void 0) {
      throw new Error("Cannot use both timezone and timezoneOffset options; choose one");
    }
    if (options.stopwatch !== void 0 && typeof options.stopwatch !== "boolean") {
      throw new TypeError("Invalid stopwatch option: must be a boolean");
    }
    if (options.lap !== void 0 && typeof options.lap !== "boolean") {
      throw new TypeError("Invalid lap option: must be a boolean");
    }
    if (options.lapWord !== void 0 && typeof options.lapWord !== "string") {
      throw new TypeError("Invalid lapWord option: must be a string");
    }
    if (options.lapMode !== void 0 && !["splits", "laps", "both"].includes(options.lapMode)) {
      throw new TypeError('Invalid lapMode option: must be "splits", "laps", or "both"');
    }
    if (options.useAnimationFrame !== void 0 && typeof options.useAnimationFrame !== "boolean") {
      throw new TypeError("Invalid useAnimationFrame option: must be a boolean");
    }
    if (options.lap === true && options.stopwatch !== true) {
      throw new Error("Lap mode requires stopwatch mode to be enabled");
    }
    if (options.lapMode !== void 0 && options.lap !== true) {
      throw new Error("lapMode requires lap mode to be enabled");
    }
    let time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
    let isStopped = false;
    let isDestroyed = false;
    let lapRecords = [];
    let lastLapPerfTime = performance.now();
    let customClockStartTimeMs = Date.now();
    let customClockElapsedMs = 0;
    let initialTimeMs = 0;
    let lastTimestamp = 0;
    let accumulatedTime = 0;
    const useAnimationFrame = options.useAnimationFrame ?? false;
    const showCenti = options.showCenti ?? false;
    const showHour = options.showHour ?? true;
    const showMinute = options.showMinute ?? true;
    const isCountdown = options.countdown ?? false;
    const isStopwatch = options.stopwatch ?? false;
    const useLap = options.lap ?? false;
    const lapMode = options.lapMode ?? "both";
    const lapWord = options.lapWord ?? (lapMode === "splits" ? "Split" : "Lap");
    const callback = options.callback;
    const use12Hour = options.use12Hour ?? false;
    const timezoneOffset = options.timezoneOffset;
    const timezone = options.timezone;
    const isSystemDrivenClock = !isCountdown && !isStopwatch && !initialTime;
    if (isCountdown && !initialTime) {
      throw new Error("Initial time required for countdown mode");
    }
    if (isStopwatch && (timezone !== void 0 || timezoneOffset !== void 0)) {
      throw new Error("Stopwatch mode cannot be combined with timezone options");
    }
    if (initialTime) {
      if (!validateTimeString(initialTime)) {
        throw new Error("Invalid time string format: must be HH:MM:SS or HH:MM:SS:CC with leading zeros");
      }
      time = parseTimeString(initialTime);
      initialTimeMs = time.hours * 36e5 + time.minutes * 6e4 + time.seconds * 1e3 + time.centiseconds * 10;
    } else if (isStopwatch) {
      time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
      initialTimeMs = 0;
    }
    function updateDisplay() {
      const timeString = formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
      if (element.textContent !== timeString) {
        element.textContent = timeString;
      }
    }
    function syncWithSystemTime(nowTime) {
      const now = nowTime ? new Date(nowTime) : /* @__PURE__ */ new Date();
      if (timezone !== void 0) {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const getPart = (type) => {
          const part = parts.find((p) => p.type === type);
          return part ? parseInt(part.value, 10) : 0;
        };
        const normalizedHour = getPart("hour") % 24;
        time = {
          hours: normalizedHour,
          minutes: getPart("minute"),
          seconds: getPart("second"),
          centiseconds: showCenti ? Math.floor(now.getMilliseconds() / 10) : 0
        };
      } else if (timezoneOffset !== void 0) {
        const offsetMs = timezoneOffset * 60 * 60 * 1e3;
        const adjustedTime = new Date(now.getTime() + offsetMs);
        time = {
          hours: adjustedTime.getUTCHours(),
          minutes: adjustedTime.getUTCMinutes(),
          seconds: adjustedTime.getUTCSeconds(),
          centiseconds: showCenti ? Math.floor(adjustedTime.getUTCMilliseconds() / 10) : 0
        };
      } else {
        time = {
          hours: now.getHours(),
          minutes: now.getMinutes(),
          seconds: now.getSeconds(),
          centiseconds: showCenti ? Math.floor(now.getMilliseconds() / 10) : 0
        };
      }
    }
    function syncCustomTimeAnchor(now) {
      const currentElapsedMs = customClockElapsedMs + (now - customClockStartTimeMs);
      const intervalMs = showCenti ? 10 : 1e3;
      const elapsedIntervals = Math.floor(currentElapsedMs / intervalMs);
      const effectiveElapsedMs = elapsedIntervals * intervalMs;
      if (isCountdown) {
        const remainingRawMs = initialTimeMs - currentElapsedMs;
        if (remainingRawMs <= 0) {
          completeCountdown(true);
          return;
        }
        const currentMs = initialTimeMs - effectiveElapsedMs;
        const totalCs = Math.floor(currentMs / 10);
        time = {
          hours: Math.floor(totalCs / 36e4) % 24,
          minutes: Math.floor(totalCs % 36e4 / 6e3),
          seconds: Math.floor(totalCs % 6e3 / 100),
          centiseconds: totalCs % 100
        };
      } else {
        const currentMs = initialTimeMs + effectiveElapsedMs;
        const totalCs = Math.floor(currentMs / 10);
        time = {
          hours: Math.floor(totalCs / 36e4) % 24,
          minutes: Math.floor(totalCs % 36e4 / 6e3),
          seconds: Math.floor(totalCs % 6e3 / 100),
          centiseconds: totalCs % 100
        };
      }
    }
    function _getTimeoutDelay(now) {
      if (showCenti) {
        return 10;
      }
      if (isSystemDrivenClock) {
        return 1e3 - now % 1e3;
      }
      const elapsedMs = customClockElapsedMs + (now - customClockStartTimeMs);
      const elapsedRemainder = elapsedMs % 1e3;
      const msToNextSecond = elapsedRemainder === 0 ? 1e3 : 1e3 - elapsedRemainder;
      if (isCountdown) {
        const remainingMs = initialTimeMs - elapsedMs;
        if (remainingMs <= 0) {
          return 0;
        }
        if (remainingMs < 1e3) {
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
    function _tick(now, timestamp) {
      if (isStopped || isDestroyed) return;
      if (isSystemDrivenClock) {
        syncWithSystemTime(now);
        updateDisplay();
        return;
      }
      if (useAnimationFrame && timestamp !== void 0) {
        if (lastTimestamp === 0) {
          lastTimestamp = timestamp;
        }
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        accumulatedTime += delta;
        const tickInterval = showCenti ? 10 : 1e3;
        let shouldUpdate = false;
        while (accumulatedTime >= tickInterval) {
          accumulatedTime -= tickInterval;
          shouldUpdate = true;
        }
        if (shouldUpdate) {
          syncCustomTimeAnchor(now);
          updateDisplay();
        }
      } else {
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
    function startSystemClock() {
      syncWithSystemTime();
      updateDisplay();
      addClock(internalInstance);
    }
    function startCustomClock() {
      customClockStartTimeMs = Date.now();
      updateDisplay();
      addClock(internalInstance);
    }
    function stopClock() {
      if (!isStopped && !isSystemDrivenClock) {
        customClockElapsedMs += Date.now() - customClockStartTimeMs;
      }
      isStopped = true;
      removeClock(internalInstance);
    }
    function startClock() {
      if (isDestroyed || !isStopped) return;
      isStopped = false;
      if (!isSystemDrivenClock) {
        customClockStartTimeMs = Date.now();
      } else {
        syncWithSystemTime();
      }
      updateDisplay();
      addClock(internalInstance);
    }
    function toggleClock() {
      if (isStopped) {
        startClock();
      } else {
        stopClock();
      }
    }
    function getTime() {
      return formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
    }
    function isRunning() {
      return !isStopped && !isDestroyed;
    }
    function destroy() {
      isDestroyed = true;
      stopClock();
      element.textContent = "";
    }
    function setTime(timeString) {
      if (isDestroyed) return;
      if (!validateTimeString(timeString)) {
        throw new Error("Invalid time string format: must be HH:MM:SS or HH:MM:SS:CC with leading zeros");
      }
      time = parseTimeString(timeString);
      initialTimeMs = time.hours * 36e5 + time.minutes * 6e4 + time.seconds * 1e3 + time.centiseconds * 10;
      customClockElapsedMs = 0;
      customClockStartTimeMs = Date.now();
      if (finalizeZeroCountdown(true)) {
        return;
      }
      updateDisplay();
    }
    function reset() {
      if (isDestroyed) return;
      if (isStopwatch) {
        time = { hours: 0, minutes: 0, seconds: 0, centiseconds: 0 };
        initialTimeMs = 0;
        customClockElapsedMs = 0;
        customClockStartTimeMs = Date.now();
        lapRecords = [];
        lastLapPerfTime = performance.now();
      } else if (initialTime) {
        time = parseTimeString(initialTime);
        initialTimeMs = time.hours * 36e5 + time.minutes * 6e4 + time.seconds * 1e3 + time.centiseconds * 10;
        customClockElapsedMs = 0;
        customClockStartTimeMs = Date.now();
      } else {
        syncWithSystemTime();
      }
      if (finalizeZeroCountdown(true)) {
        return;
      }
      isStopped = false;
      updateDisplay();
      addClock(internalInstance);
    }
    function lap() {
      if (isDestroyed) return "";
      assertLapModeEnabled();
      const now = performance.now();
      const preciseElapsedMs = now - lastLapPerfTime;
      lastLapPerfTime = now;
      const splitTime = formatTimeString(time, showCenti, showHour, showMinute, use12Hour);
      const lapNumber = lapRecords.length + 1;
      const totalCs = Math.round(preciseElapsedMs / 10);
      const lapDiff = {
        hours: Math.floor(totalCs / 36e4),
        minutes: Math.floor(totalCs % 36e4 / 6e3),
        seconds: Math.floor(totalCs % 6e3 / 100),
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
      if (lapMode === "splits") {
        return lapWord ? `${lapWord} ${lapNumber}: ${splitTime}` : `${lapNumber}: ${splitTime}`;
      } else if (lapMode === "laps") {
        return lapWord ? `${lapWord} ${lapNumber}: ${lapTime}` : `${lapNumber}: ${lapTime}`;
      } else {
        return lapWord ? `${lapWord} ${lapNumber}: ${lapTime} (${splitTime})` : `${lapNumber}: ${lapTime} (${splitTime})`;
      }
    }
    function getLaps() {
      if (isDestroyed) return [];
      assertLapModeEnabled();
      return lapRecords.map((record) => {
        if (lapMode === "splits") {
          return lapWord ? `${lapWord} ${record.lapNumber}: ${record.splitTime}` : `${record.lapNumber}: ${record.splitTime}`;
        } else if (lapMode === "laps") {
          return lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime}` : `${record.lapNumber}: ${record.lapTime}`;
        } else {
          return lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime} (${record.splitTime})` : `${record.lapNumber}: ${record.lapTime} (${record.splitTime})`;
        }
      });
    }
    function getSplitTimes() {
      if (isDestroyed) return [];
      assertLapModeEnabled();
      if (lapMode === "laps") {
        throw new Error('Split times are only available when lapMode is "splits" or "both"');
      }
      return lapRecords.map(
        (record) => lapWord ? `${lapWord} ${record.lapNumber}: ${record.splitTime}` : `${record.lapNumber}: ${record.splitTime}`
      );
    }
    function getLapTimes() {
      if (isDestroyed) return [];
      assertLapModeEnabled();
      if (lapMode === "splits") {
        throw new Error('Lap times are only available when lapMode is "laps" or "both"');
      }
      return lapRecords.map(
        (record) => lapWord ? `${lapWord} ${record.lapNumber}: ${record.lapTime}` : `${record.lapNumber}: ${record.lapTime}`
      );
    }
    function getLapRecords() {
      if (isDestroyed) return [];
      assertLapModeEnabled();
      return [...lapRecords];
    }
    function bestLap() {
      if (isDestroyed) return null;
      assertLapModeEnabled();
      if (lapMode === "splits") {
        throw new Error('bestLap() is only available when lapMode is "laps" or "both"');
      }
      if (lapRecords.length === 0) return null;
      return lapRecords.reduce(
        (best, record) => record.preciseElapsedMs < best.preciseElapsedMs ? record : best
      );
    }
    function worstLap() {
      if (isDestroyed) return null;
      assertLapModeEnabled();
      if (lapMode === "splits") {
        throw new Error('worstLap() is only available when lapMode is "laps" or "both"');
      }
      if (lapRecords.length === 0) return null;
      return lapRecords.reduce(
        (worst, record) => record.preciseElapsedMs > worst.preciseElapsedMs ? record : worst
      );
    }
    function clearLaps() {
      if (isDestroyed) return;
      assertLapModeEnabled();
      lapRecords = [];
      lastLapPerfTime = performance.now();
    }
    function assertLapModeEnabled() {
      if (!useLap) {
        throw new Error("Lap mode is not enabled");
      }
    }
    if (finalizeZeroCountdown(true)) {
    } else if (isStopwatch) {
      startCustomClock();
    } else if (initialTime) {
      startCustomClock();
    } else {
      startSystemClock();
    }
    return internalInstance;
  }
  var index_default = createClock;
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=new-js-clock.js.map
