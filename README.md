# New JS Clock

A modern TypeScript rewrite of the classic [JS-Clock](https://www.tcpweb.com.br/JS-Clock/) library, featuring full type safety, no dependencies, and proper multi-instance support.

![Test Coverage](https://img.shields.io/badge/coverage-99.74%25%20lines%20%7C%2098.32%25%20branches-brightgreen)

Check out this project's demo [here](https://www.tcpweb.com.br/new-js-clock/).

## 🚀 What's New in Version 1.0.0

- **🔒 TypeScript**: Full type safety with comprehensive interfaces
- **🌐 E2E + Unit Test Suite**: Deterministic Jest coverage plus Selenium E2E browser tests (including extended background-tab behavior validation)
- **📦 Zero Dependencies**: Pure vanilla JavaScript, no jQuery required
- **🐛 Bug Fixes**: Multi-instance support works correctly (main issue in v0.8)
- **⚡ Modern API**: Clean, intuitive API with proper instance methods
- **🧪 Fully Tested**: 162 deterministic Jest tests with 99.74% lines/99.02% statements/100% functions and 98.32% branch coverage
- **🐳 Dockerized E2E Grid**: Selenium Grid via `selenium/standalone-all-browsers` on port `4444`, running headless Chrome/Firefox/Edge locally and in CI (`pnpm run e2e:docker`)
- **📱 ES Modules**: ES Module imports with tree-shaking support
- **🌍 DST-Aware Timezones**: IANA timezone support with automatic daylight saving time handling
- **⏱️ Stopwatch Mode**: New stopwatch that counts up from 00:00:00
- **🏁 Lap & Split Times**: Record lap times (delta) and split times (cumulative)
- **📊 Best/Worst Lap**: Built-in helpers to find best and worst lap times
- **🎯 High-Resolution Timing**: Lap deltas measured via `performance.now()` for sub-millisecond precision

## 📦 Installation

```bash
# npm
npm install new-js-clock

# pnpm
pnpm add new-js-clock

# yarn
yarn add new-js-clock
```

### CDN (Script Tag)

For direct browser usage without a bundler:

```html
<!-- Minified (recommended for production) -->
<script src="https://unpkg.com/new-js-clock/dist/new-js-clock.min.js"></script>

<!-- Or via jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/new-js-clock/dist/new-js-clock.min.js"></script>

<!-- Unminified (for debugging) -->
<script src="https://unpkg.com/new-js-clock/dist/new-js-clock.js"></script>
```

After loading, the library is available as `NewJSClock`:

```javascript
var clock = NewJSClock.createClock(document.getElementById('clock'));
```

## 🛠️ Build & Development

```bash
# Build the project (includes TypeScript type checking)
pnpm run build

# Build ESM output and type declarations
pnpm run build:esm

# Build CommonJS bundle only
pnpm run build:cjs

# Build IIFE bundles only
pnpm run build:iife

# Watch mode for development
pnpm run dev
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run end to end tests using dockerized Selenium Grid for Chrome, Firefox and Edge testing
pnpm run e2e:docker
```

## 🔍 Linting

```bash
# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm run lint:fix
```

**Test Quality Snapshot:** 162 passing Jest tests with **99.74% line coverage**, **99.02% statement coverage**, **98.32% branch coverage**, and **100% function coverage**.
**E2E Snapshot:** Dockerized Selenium Grid using `selenium/standalone-all-browsers` on port `4444`, executing headless browser runs for Chrome, Firefox, and Edge via `pnpm run e2e:docker`.

## 📖 Usage

### Basic System Clock

```typescript
import { createClock } from 'new-js-clock';

const clock = createClock(document.getElementById('clock'));

// Control the clock
clock.stopClock();    // Pause
clock.startClock();   // Resume
clock.toggleClock();  // Toggle

// Get current time
const currentTime = clock.getTime(); // "14:30:25"

// Clean up
clock.destroy();
```

### CommonJS Usage

```javascript
const { createClock } = require('new-js-clock');

const clock = createClock(document.getElementById('clock'));
```

### Countdown Timer

```typescript
const countdown = createClock(
  document.getElementById('timer'),
  '00:05:00',  // 5 minutes
  {
    countdown: true,
    callback: () => alert('Time is up!')
  }
);
```

### High Precision (with Centiseconds)

```typescript
const precision = createClock(
  document.getElementById('precision'),
  undefined,  // Use system time
  { showCenti: true }  // Show centiseconds
);
```

### Custom Start Time

```typescript
const custom = createClock(
  document.getElementById('custom'),
  '10:30:45'  // Start at this time
);
```

### 12-Hour Format with AM/PM

```typescript
const clock12h = createClock(
  document.getElementById('clock12h'),
  undefined,  // Use system time
  { use12Hour: true }
);
// Display: "02:30:45 PM" for 14:30:45
```

### Multiple Timezones

**DST-Aware (Recommended):**

```typescript
// Using IANA timezone names - automatically handles DST!
const nyClock = createClock(
  document.getElementById('ny-time'),
  undefined,
  { timezone: 'America/New_York' }  // Adjusts for EST/EDT
);

const londonClock = createClock(
  document.getElementById('london-time'),
  undefined,
  { timezone: 'Europe/London' }  // Adjusts for GMT/BST
);

const tokyoClock = createClock(
  document.getElementById('tokyo-time'),
  undefined,
  { timezone: 'Asia/Tokyo' }
);
```

**Static Offset (No DST):**

```typescript
// Using static offset - does NOT handle DST
const nyClock = createClock(
  document.getElementById('ny-time'),
  undefined,
  { timezoneOffset: -5 }  // Always UTC-5
);

const mumbaiClock = createClock(
  document.getElementById('mumbai-time'),
  undefined,
  { timezoneOffset: 5.5 }  // Supports half-hour offsets
);
```

### Resetting a Countdown Timer

```typescript
const countdown = createClock(
  document.getElementById('timer'),
  '00:05:00',
  { countdown: true }
);

// Reset to initial time and restart - no need to destroy/recreate!
countdown.reset();
```

### Changing Time Dynamically

```typescript
const clock = createClock(
  document.getElementById('clock'),
  '10:00:00'
);

// Change the time without destroying the instance
clock.setTime('15:30:00');
```

### Stopwatch

```typescript
const stopwatch = createClock(
  document.getElementById('stopwatch'),
  undefined,
  { stopwatch: true }
);

// Control the stopwatch
stopwatch.stopClock();   // Pause
stopwatch.startClock();  // Resume
stopwatch.reset();       // Reset to 00:00:00
```

### Stopwatch with Lap Times

```typescript
const stopwatch = createClock(
  document.getElementById('stopwatch'),
  undefined,
  {
    stopwatch: true,
    lap: true,
    lapWord: 'Split'  // Optional: customize the lap word
  }
);

// Record a lap
const lap1 = stopwatch.lap();  // "Split 1: 00:00:15"
const lap2 = stopwatch.lap();  // "Split 2: 00:00:32"

// Get all laps
const laps = stopwatch.getLaps();

// Clear laps
stopwatch.clearLaps();
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showCenti` | `boolean` | `false` | Display centiseconds |
| `countdown` | `boolean` | `false` | Run as countdown timer |
| `callback` | `function` | `undefined` | Called when countdown reaches zero |
| `showHour` | `boolean` | `true` | Show hours in display |
| `showMinute` | `boolean` | `true` | Show minutes in display |
| `use12Hour` | `boolean` | `false` | Use 12-hour format with AM/PM |
| `timezone` | `string` | `undefined` | IANA timezone name for DST-aware support (e.g., "America/New_York") |
| `timezoneOffset` | `number` | `undefined` | Static timezone offset in hours from UTC (no DST handling) |
| `stopwatch` | `boolean` | `false` | Run as stopwatch (counts up from 00:00:00) |
| `lap` | `boolean` | `false` | Enable lap/split mode (requires stopwatch: true) |
| `lapMode` | `"splits" \| "laps" \| "both"` | `"both"` | Lap recording mode: "splits" (cumulative), "laps" (delta), or "both" |
| `lapWord` | `string` | `"Split"` in `lapMode: "splits"`, otherwise `"Lap"` | Custom word before lap number (set to "" for no word) |
| `useAnimationFrame` | `boolean` | `false` | Use requestAnimationFrame for smoother updates. Falls back to setTimeout when page is hidden. |

## 🎯 API Reference

### `createClock(element, initialTime?, options?): ClockInstance`

Creates a new clock instance.

**Parameters:**
- `element` (HTMLElement): DOM element to render the clock in
- `initialTime` (string, optional): Time in "HH:MM:SS" or "HH:MM:SS:CC" format
- `options` (ClockOptions, optional): Configuration options

**Returns:** `ClockInstance`

### ClockInstance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTime()` | `string` | Get current time as formatted string |
| `stopClock()` | `void` | Stop/pause the clock |
| `startClock()` | `void` | Start/resume the clock |
| `toggleClock()` | `void` | Toggle between running and stopped |
| `isRunning()` | `boolean` | Check if clock is currently running |
| `setTime(timeString)` | `void` | Set a new time without destroying the instance |
| `reset()` | `void` | Reset to initial time and restart (great for countdowns!) |
| `lap()` | `string` | Record a lap/split time (only in lap mode) |
| `getLaps()` | `string[]` | Get all recorded lap/split times (only in lap mode) |
| `getSplitTimes()` | `string[]` | Get all split times (cumulative; `lapMode: "splits"` or `"both"`) |
| `getLapTimes()` | `string[]` | Get all lap times (delta; `lapMode: "laps"` or `"both"`) |
| `getLapRecords()` | `LapRecord[]` | Get all lap records with full details (only in lap mode) |
| `clearLaps()` | `void` | Clear all recorded lap/split times (only in lap mode) |
| `bestLap()` | `LapRecord \| null` | Get the fastest lap record (`lapMode: "laps"` or `"both"`) |
| `worstLap()` | `LapRecord \| null` | Get the slowest lap record (`lapMode: "laps"` or `"both"`) |
| `destroy()` | `void` | Clean up and remove the clock |

## 🔧 Bundler Configuration

This library ships ESM and CommonJS builds. For TypeScript ESM projects, `moduleResolution: "node"` provides broad compatibility. If you're using a bundler, you may want to configure it:

### Vite
Works out of the box - no configuration needed.

### webpack
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.js', '.ts'],
    conditionNames: ['import', 'default']
  }
};
```

### esbuild
```javascript
// esbuild.config.js
esbuild.build({
  bundle: true,
  format: 'esm',
  mainFields: ['module', 'main']
});
```

### TypeScript
The library includes TypeScript declarations. For the best experience, ensure your `tsconfig.json` uses a compatible `moduleResolution`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node"  // or "node16", "nodenext", or "bundler"
  }
}
```

**Note:** If you use `moduleResolution: "bundler"` in your project, the library will still work correctly since it's compiled with `moduleResolution: "node"` for broad compatibility.

## 🐛 Bug Fixes from v0.8

### Multi-Instance Bug (FIXED ✅)

In the original jQuery version, calling `stopClock()`, `startClock()`, `toggleClock()`, or `getTime()` only worked on the **last** clock instance created. This was due to closure scope issues.

**New version:** Each clock instance has its own independent state and methods that work correctly.

```javascript
// This now works correctly!
const clock1 = createClock(el1, '10:00:00');
const clock2 = createClock(el2, '20:00:00');

clock1.stopClock();  // Only stops clock1
clock2.stopClock();  // Only stops clock2
```

### Variable Scope Bug (FIXED ✅)

Fixed inconsistent variable naming (`clockloop` vs `clockLoop`) that could cause timer issues.

## 📄 License

MIT License - Copyright (c) Thiago Cavalcanti Pimenta

## 🙏 Credits

This is a modern rewrite of the original JS-Clock jQuery plugin.
