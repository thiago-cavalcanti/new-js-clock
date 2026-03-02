# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-01

First public release of New JS Clock – a complete modern rewrite of the original JS Clock jQuery plugin (v0.8).

### Added
- Vanilla JavaScript / TypeScript implementation – no jQuery dependency
- Full TypeScript declarations and type-safe API (`ClockInstance`, `ClockOptions`)
- Proper instance-based control: each clock returned by `createClock()` is fully independent
- New high-precision mode with centiseconds (`showCenti: true`) updating every ~10ms
- DST-aware timezone support via IANA names (`timezone: "America/New_York"`, etc.)
- Static timezone offset support (`timezoneOffset: -3`) for fixed-offset use cases
- 12-hour format with AM/PM indicator (`use12Hour: true`)
- Flexible display toggles: `showHour`, `showMinute` (useful for minute-only timers)
- `getTime()`, `startClock()`, `stopClock()`, `toggleClock()`, `isRunning()`, `destroy()` methods per instance
- Comprehensive input validation with clear `TypeError`/`RangeError` messages
- Countdown mode with optional `callback` fired exactly at zero
- Multiple independent clocks on the same page without conflicts
- Error handling documentation and recommended try-catch pattern
- Modern ES module export (`import { createClock } from 'new-js-clock'`)
- Detailed API reference, migration guide, and many practical examples (Pomodoro, stopwatch, kitchen timer, multi-timezone dashboard, etc.)
- Browser support: all modern browsers (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- Comprehensive deterministic Jest suite with 162 passing tests, 99.74% lines/99.02% statements/100% functions coverage, and 98.32% branch coverage
- Dockerized Selenium Grid E2E browser suite using `selenium/standalone-all-browsers` on port `4444`, running headless Chrome/Firefox/Edge for end-to-end runtime behavior (including extended background-tab visibility scenarios) locally and in CI
- ESLint integration with TypeScript support (`pnpm lint`, `pnpm run lint:fix`)
- TypeScript type checking as part of build process (`pnpm run build`)
- **High-resolution lap timing**: Lap deltas now measured via `performance.now()` for sub-millisecond precision. New `preciseElapsedMs` field on `LapRecord` gives the exact elapsed time in milliseconds. `bestLap()` and `worstLap()` use this for more accurate comparison.
- `setTime(timeString)` method: Change the time of a clock instance without destroying it
- `reset()` method: Reset a clock to its initial time and restart it (perfect for countdown timers!)
- IIFE bundle (`dist/new-js-clock.min.js`) for direct browser script tag usage via CDN
- CDN-ready with `unpkg` and `jsdelivr` fields in package.json
- **Stopwatch mode** (`stopwatch: true`): Counts up from 00:00:00 indefinitely
- **Lap mode** (`lap: true`): Record lap times during stopwatch runs
- **`lap()` method**: Record a lap time and get it as a formatted string
- **`getLaps()` method**: Get all recorded lap times as an array
- **`clearLaps()` method**: Clear all recorded lap times
- **`lapWord` option**: Customize the word before lap numbers (default: "Split" when `lapMode: "splits"`, otherwise "Lap"; set to "" for no word)
- **`lapMode` option**: Choose between "splits" (cumulative), "laps" (delta), or "both"
- **`getSplitTimes()` method**: Get all split times (cumulative from start)
- **`getLapTimes()` method**: Get all lap times (time between laps)
- **`getLapRecords()` method**: Get full lap records with LapRecord interface
- **`bestLap()` method**: Get the fastest lap record
- **`worstLap()` method**: Get the slowest lap record
- **`LapRecord` interface**: Full lap record with lapNumber, lapTime, splitTime, preciseElapsedMs, timestamp
- **`useAnimationFrame` option**: Use requestAnimationFrame for smoother updates, with automatic fallback to setTimeout when page is hidden (hybrid mode)
- **ESLint integration**: TypeScript-aware linting with `pnpm lint` and `pnpm run lint:fix`
- **CommonJS build output**: Added `dist/index.cjs` and package export mapping (`exports.require`) for CommonJS consumers while keeping ESM-first imports.

### Changed
- API completely redesigned: function-based (`createClock(element, initialTime?, options?)`) instead of jQuery method chaining
- Custom start time / countdown now uses clean internal logic instead of the old "clockwork algorithm"
- Time format validation is stricter and more helpful (leading zeros required, clear error messages)
- Countdown no longer wraps to 23:59:59 when reaching zero without callback – it stops cleanly
- **System/timezone clock updates**: In system/timezone modes (no custom `initialTime`), display time is now derived from `Date`/`Intl` on every tick for wall-clock accuracy. Increment/decrement ticking remains for countdown and stopwatch/custom-time modes.

### Removed
- All jQuery code and dependencies
- Global / shared state that caused control methods to only affect the last-created clock
- Old initialization syntax (`$('#clock').jsclock(...)`, `$.fn.jsclock.stopClock()` etc.)
- Automatic error messages written directly to the DOM element (now throws exceptions – caller handles display)

### Fixed
- **Critical bug** in v0.8: control methods (`stopClock`, `getTime`, etc.) only worked on the last initialized clock – now fully instance-specific
- Performance issues when initializing many clocks separately (new version encourages one call per clock anyway)
- Inaccurate handling of server-provided time (new version still requires network-delay compensation, but logic is cleaner)

[1.0.0]: https://github.com/thiago-cavalcanti/new-js-clock/releases/tag/1.0.0
