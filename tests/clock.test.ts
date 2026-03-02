/**
 * Jest tests for New JS Clock
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClock } from '../src/index';
import { _resetGlobalStateForTesting } from '../src/testing';

// Mock timers for predictable testing
jest.useFakeTimers();

const DEFAULT_SYSTEM_TIME = new Date('2026-01-01T12:34:56.780Z');

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatLocalTime(date: Date, showCenti = false): string {
  const timeString = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  if (!showCenti) {
    return timeString;
  }
  return `${timeString}:${pad2(Math.floor(date.getMilliseconds() / 10))}`;
}

function formatOffsetTime(date: Date, timezoneOffset: number, showCenti = false): string {
  const adjustedTime = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  const timeString = `${pad2(adjustedTime.getUTCHours())}:${pad2(adjustedTime.getUTCMinutes())}:${pad2(adjustedTime.getUTCSeconds())}`;
  if (!showCenti) {
    return timeString;
  }
  return `${timeString}:${pad2(Math.floor(adjustedTime.getUTCMilliseconds() / 10))}`;
}

function to12HourTime(hours24: number, minutes: number, seconds: number): string {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${pad2(hours12)}:${pad2(minutes)}:${pad2(seconds)} ${period}`;
}

function formatIanaTime(
  date: Date,
  timezone: string,
  options: { use12Hour?: boolean; showCenti?: boolean } = {}
): string {
  const { use12Hour = false, showCenti = false } = options;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: use12Hour
  });
  const parts = formatter.formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const second = parts.find((part) => part.type === 'second')?.value ?? '00';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value;

  const normalizedHour = use12Hour ? hour : pad2(parseInt(hour, 10) % 24);
  let output = `${normalizedHour}:${minute}:${second}`;

  if (showCenti) {
    output += `:${pad2(Math.floor(date.getMilliseconds() / 10))}`;
  }

  if (use12Hour && dayPeriod) {
    output += ` ${dayPeriod}`;
  }

  return output;
}

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    writable: true,
    configurable: true
  });
}

describe('New JS Clock', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    jest.setSystemTime(DEFAULT_SYSTEM_TIME);
    setDocumentHidden(false);
    container = document.createElement('div');
    container.id = 'test-clock';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    jest.restoreAllMocks();
    setDocumentHidden(false);
    jest.setSystemTime(DEFAULT_SYSTEM_TIME);
    _resetGlobalStateForTesting();
    document.body.removeChild(container);
    jest.clearAllTimers();
  });

  describe('Clock Creation', () => {
    test('should create a clock with default options', () => {
      const clock = createClock(container);
      
      expect(clock).toBeDefined();
      expect(typeof clock.getTime).toBe('function');
      expect(typeof clock.startClock).toBe('function');
      expect(typeof clock.stopClock).toBe('function');
      expect(typeof clock.toggleClock).toBe('function');
      expect(typeof clock.destroy).toBe('function');
      expect(typeof clock.isRunning).toBe('function');
      
      clock.destroy();
    });

    test('should display system time by default', () => {
      const clock = createClock(container);
      const expectedTime = formatLocalTime(new Date());

      expect(container.textContent).toBe(expectedTime);
      expect(clock.getTime()).toBe(expectedTime);
      
      clock.destroy();
    });

    test('should accept custom start time', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(container.textContent).toBe('10:30:45');
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.destroy();
    });

    test('should accept custom start time with centiseconds', () => {
      const clock = createClock(container, '10:30:45:50', { showCenti: true });
      
      expect(container.textContent).toBe('10:30:45:50');
      expect(clock.getTime()).toBe('10:30:45:50');
      
      clock.destroy();
    });
  });

  describe('Options Validation', () => {
    test('should throw error for invalid element input', () => {
      expect(() => {
        createClock(null as any);
      }).toThrow('Invalid element: must be an HTMLElement');
    });

    test('should throw error for invalid options input', () => {
      expect(() => {
        createClock(container, undefined, null as any);
      }).toThrow('Invalid options: must be an object');

      expect(() => {
        createClock(container, undefined, [] as any);
      }).toThrow('Invalid options: must be an object');
    });

    test('should throw error for invalid countdown option type', () => {
      expect(() => {
        createClock(container, undefined, { countdown: 'yes' as any });
      }).toThrow('Invalid countdown option: must be a boolean');
    });

    test('should throw error for invalid showCenti option type', () => {
      expect(() => {
        createClock(container, undefined, { showCenti: 1 as any });
      }).toThrow('Invalid showCenti option: must be a boolean');
    });

    test('should throw error for invalid showHour option type', () => {
      expect(() => {
        createClock(container, undefined, { showHour: 'yes' as any });
      }).toThrow('Invalid showHour option: must be a boolean');
    });

    test('should throw error for invalid showMinute option type', () => {
      expect(() => {
        createClock(container, undefined, { showMinute: 1 as any });
      }).toThrow('Invalid showMinute option: must be a boolean');
    });

    test('should throw error for invalid callback type', () => {
      expect(() => {
        createClock(container, undefined, { callback: 'not a function' as any });
      }).toThrow('Invalid callback: must be a function');
    });

    test('should throw error for countdown without initial time', () => {
      expect(() => {
        createClock(container, undefined, { countdown: true });
      }).toThrow('Initial time required for countdown mode');
    });

    test('should throw error for invalid time string format', () => {
      expect(() => {
        createClock(container, '25:00:00'); // Invalid hour
      }).toThrow('Invalid time string format');

      expect(() => {
        createClock(container, '10:70:00'); // Invalid minute
      }).toThrow('Invalid time string format');

      expect(() => {
        createClock(container, '10:30'); // Missing seconds
      }).toThrow('Invalid time string format');
    });
  });

  describe('Clock Control Methods', () => {
    test('should stop the clock', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.isRunning()).toBe(true);
      
      clock.stopClock();
      
      expect(clock.isRunning()).toBe(false);
      
      // Store current time
      const stoppedTime = clock.getTime();
      
      // Advance timers
      jest.advanceTimersByTime(2000);
      
      // Time should not have changed
      expect(clock.getTime()).toBe(stoppedTime);
      
      clock.destroy();
    });

    test('should start a stopped clock', () => {
      const clock = createClock(container, '10:30:45');
      
      clock.stopClock();
      expect(clock.isRunning()).toBe(false);
      
      clock.startClock();
      expect(clock.isRunning()).toBe(true);
      
      // Advance time and verify it's ticking
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('10:30:46');
      
      clock.destroy();
    });

    test('should start a stopped centisecond clock with centisecond cadence', () => {
      const clock = createClock(container, '10:30:45:00', { showCenti: true });

      clock.stopClock();
      expect(clock.isRunning()).toBe(false);

      clock.startClock();
      expect(clock.isRunning()).toBe(true);

      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('10:30:45:01');

      clock.destroy();
    });

    test('should start a stopped system clock and resync', () => {
      const clock = createClock(container);
      
      expect(clock.isRunning()).toBe(true);
      
      clock.stopClock();
      expect(clock.isRunning()).toBe(false);
      
      // Wait some time while stopped
      jest.advanceTimersByTime(5000);
      
      // Start again - should resync with system time
      clock.startClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should toggle clock on and off', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.isRunning()).toBe(true);
      
      // Toggle off
      clock.toggleClock();
      expect(clock.isRunning()).toBe(false);
      
      // Toggle on
      clock.toggleClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should get current time', () => {
      const clock = createClock(container, '12:34:56');
      
      expect(clock.getTime()).toBe('12:34:56');
      
      // Advance and check again
      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('12:35:01');
      
      clock.destroy();
    });
  });

  describe('Time Progression', () => {
    test('should increment seconds correctly', () => {
      const clock = createClock(container, '10:30:45');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('10:30:46');
      
      jest.advanceTimersByTime(4000);
      expect(clock.getTime()).toBe('10:30:50');
      
      clock.destroy();
    });

    test('should roll over seconds to minutes', () => {
      const clock = createClock(container, '10:30:58');
      
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe('10:31:00');
      
      clock.destroy();
    });

    test('should roll over minutes to hours', () => {
      const clock = createClock(container, '10:59:58');
      
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe('11:00:00');
      
      clock.destroy();
    });

    test('should roll over hours at midnight', () => {
      const clock = createClock(container, '23:59:58');
      
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe('00:00:00');
      
      clock.destroy();
    });
  });

  describe('Countdown Mode', () => {
    test('should complete immediately when countdown starts at zero', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:00', {
        countdown: true,
        callback
      });

      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('00:00:00');
      expect(callback).toHaveBeenCalledTimes(1);

      clock.destroy();
    });

    test('should countdown correctly', () => {
      const clock = createClock(container, '00:00:10', { countdown: true });
      
      expect(clock.getTime()).toBe('00:00:10');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:00:09');
      
      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('00:00:04');
      
      clock.destroy();
    });

    test('should stop when countdown reaches zero', () => {
      const clock = createClock(container, '00:00:02', { countdown: true });
      
      // 1000ms: 2->1, 2000ms: reach 0 and stop (3000ms remains safe for assertion)
      jest.advanceTimersByTime(3000);
      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      
      clock.destroy();
    });

    test('should call callback when countdown finishes', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:02', { 
        countdown: true,
        callback 
      });
      
      expect(callback).not.toHaveBeenCalled();
      
      // 1000ms: 2->1, 2000ms: reach 0 and invoke callback (3000ms remains safe for assertion)
      jest.advanceTimersByTime(3000);
      
      expect(callback).toHaveBeenCalledTimes(1);
      
      clock.destroy();
    });

    test('should complete immediately when setTime sets countdown to zero', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:05', {
        countdown: true,
        callback
      });

      expect(clock.isRunning()).toBe(true);
      clock.setTime('00:00:00');

      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);

      clock.destroy();
    });

    test('should schedule a sub-second final tick for non-centisecond countdown callback precision', () => {
      const callback = jest.fn();
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      const baselineCalls = setTimeoutSpy.mock.calls.length;
      const clock = createClock(container, '00:00:01:50', {
        countdown: true,
        callback
      });

      const initialDelays = setTimeoutSpy.mock.calls
        .slice(baselineCalls)
        .map(([, delay]) => delay as number);
      expect(initialDelays).toContain(1000);

      jest.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
      expect(clock.getTime()).toBe('00:00:00');

      const scheduledDelays = setTimeoutSpy.mock.calls
        .slice(baselineCalls)
        .map(([, delay]) => delay as number);
      expect(scheduledDelays).toContain(500);

      jest.advanceTimersByTime(499);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(clock.isRunning()).toBe(false);

      clock.destroy();
    });

    test('should handle countdown rolling under seconds', () => {
      const clock = createClock(container, '00:01:00', { countdown: true });
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:00:59');
      
      clock.destroy();
    });

    test('should handle countdown rolling under minutes', () => {
      const clock = createClock(container, '01:00:00', { countdown: true });
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:59:59');
      
      clock.destroy();
    });

    test('should handle countdown rolling under from 00:00:01 to 00:00:00', () => {
      const clock = createClock(container, '00:00:01', { countdown: true });
      
      expect(clock.getTime()).toBe('00:00:01');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:00:00');
      
      // Additional time should keep it stopped at zero
      jest.advanceTimersByTime(1000);
      expect(clock.isRunning()).toBe(false);
      
      clock.destroy();
    });
  });

  describe('Centisecond Mode', () => {
    test('should display centiseconds when enabled', () => {
      const clock = createClock(container, '10:30:45:00', { showCenti: true });
      
      expect(container.textContent).toBe('10:30:45:00');
      
      clock.destroy();
    });

    test('should increment centiseconds', () => {
      const clock = createClock(container, '10:30:45:50', { showCenti: true });
      
      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('10:30:45:51');
      
      jest.advanceTimersByTime(490);
      expect(clock.getTime()).toBe('10:30:46:00');
      
      clock.destroy();
    });

    test('should roll over centiseconds to seconds', () => {
      const clock = createClock(container, '10:30:45:99', { showCenti: true });
      
      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('10:30:46:00');
      
      clock.destroy();
    });

    test('should countdown with centiseconds', () => {
      const clock = createClock(container, '00:00:00:05', { 
        countdown: true,
        showCenti: true 
      });
      
      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('00:00:00:04');
      
      // 50ms: 5->0, 60ms: detect 0 and stop
      jest.advanceTimersByTime(50);
      expect(clock.getTime()).toBe('00:00:00:00');
      
      jest.advanceTimersByTime(10);
      expect(clock.isRunning()).toBe(false);
      
      clock.destroy();
    });
  });

  describe('Multi-Instance Support', () => {
    test('should support multiple independent clock instances', () => {
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');
      document.body.appendChild(container1);
      document.body.appendChild(container2);

      const clock1 = createClock(container1, '10:00:00');
      const clock2 = createClock(container2, '20:00:00');

      // Both should have different times
      expect(clock1.getTime()).toBe('10:00:00');
      expect(clock2.getTime()).toBe('20:00:00');

      // Stop clock1
      clock1.stopClock();
      expect(clock1.isRunning()).toBe(false);
      expect(clock2.isRunning()).toBe(true);

      // Advance time
      jest.advanceTimersByTime(5000);

      // clock1 should be stopped, clock2 should have advanced
      expect(clock1.getTime()).toBe('10:00:00');
      expect(clock2.getTime()).toBe('20:00:05');

      // Start clock1
      clock1.startClock();
      expect(clock1.isRunning()).toBe(true);

      // Advance again
      jest.advanceTimersByTime(3000);

      // Both should have advanced now
      expect(clock1.getTime()).toBe('10:00:03');
      expect(clock2.getTime()).toBe('20:00:08');

      clock1.destroy();
      clock2.destroy();
      document.body.removeChild(container1);
      document.body.removeChild(container2);
    });

    test('should handle multiple countdowns independently', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');
      document.body.appendChild(container1);
      document.body.appendChild(container2);

      const clock1 = createClock(container1, '00:00:02', { 
        countdown: true,
        callback: callback1 
      });
      
      const clock2 = createClock(container2, '00:00:05', { 
        countdown: true,
        callback: callback2 
      });

      // 3000ms: clock1 finishes (2->1->0->stop)
      jest.advanceTimersByTime(3000);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
      expect(clock1.isRunning()).toBe(false);
      expect(clock2.isRunning()).toBe(true);

      // Advance 3 more seconds - clock2 should finish
      jest.advanceTimersByTime(3000);
      
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(clock2.isRunning()).toBe(false);

      clock1.destroy();
      clock2.destroy();
      document.body.removeChild(container1);
      document.body.removeChild(container2);
    });
  });

  describe('Destroy Method', () => {
    test('should clean up timer on destroy', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
      
      expect(clock.isRunning()).toBe(false);
      expect(container.textContent).toBe('');
    });

    test('should not allow operations after destroy', () => {
      const clock = createClock(container, '10:30:45');
      
      clock.destroy();
      
      // These should not throw but should have no effect
      clock.stopClock();
      clock.startClock();
      
      expect(container.textContent).toBe('');
    });
  });

  describe('showHour Option', () => {
    test('should hide hours when showHour is false', () => {
      const clock = createClock(container, '10:30:45', { showHour: false });
      
      expect(container.textContent).toBe('30:45');
      expect(clock.getTime()).toBe('30:45');
      
      clock.destroy();
    });

    test('should show hours when showHour is true', () => {
      const clock = createClock(container, '10:30:45', { showHour: true });
      
      expect(container.textContent).toBe('10:30:45');
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.destroy();
    });

    test('should hide hours with centiseconds', () => {
      const clock = createClock(container, '10:30:45:50', { 
        showHour: false,
        showCenti: true 
      });
      
      expect(container.textContent).toBe('30:45:50');
      expect(clock.getTime()).toBe('30:45:50');
      
      clock.destroy();
    });

    test('should hide hours with 12-hour format', () => {
      const clock = createClock(container, '10:30:45', { 
        showHour: false,
        use12Hour: true 
      });
      
      expect(container.textContent).toBe('30:45');
      expect(clock.getTime()).toBe('30:45');
      
      clock.destroy();
    });
  });

  describe('showMinute Option', () => {
    test('should hide minutes when showMinute is false', () => {
      const clock = createClock(container, '10:30:45', { showMinute: false });
      
      expect(container.textContent).toBe('10:45');
      expect(clock.getTime()).toBe('10:45');
      
      clock.destroy();
    });

    test('should show minutes when showMinute is true', () => {
      const clock = createClock(container, '10:30:45', { showMinute: true });
      
      expect(container.textContent).toBe('10:30:45');
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.destroy();
    });

    test('should hide minutes with centiseconds', () => {
      const clock = createClock(container, '10:30:45:50', { 
        showMinute: false,
        showCenti: true 
      });
      
      expect(container.textContent).toBe('10:45:50');
      expect(clock.getTime()).toBe('10:45:50');
      
      clock.destroy();
    });

    test('should hide minutes with 12-hour format', () => {
      const clock = createClock(container, '10:30:45', { 
        showMinute: false,
        use12Hour: true 
      });
      
      expect(container.textContent).toBe('10:45 AM');
      expect(clock.getTime()).toBe('10:45 AM');
      
      clock.destroy();
    });

    test('should hide both hours and minutes (seconds only)', () => {
      const clock = createClock(container, '10:30:45', { 
        showHour: false,
        showMinute: false 
      });
      
      expect(container.textContent).toBe('45');
      expect(clock.getTime()).toBe('45');
      
      clock.destroy();
    });
  });

  describe('Edge Cases', () => {

    test('should handle rapid start/stop cycles', () => {
      const clock = createClock(container, '10:30:45');
      
      // Rapid toggles should not cause issues
      clock.stopClock();
      clock.startClock();
      clock.stopClock();
      clock.startClock();
      clock.stopClock();
      
      expect(clock.isRunning()).toBe(false);
      
      clock.startClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should not allow multiple start calls when already running', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.isRunning()).toBe(true);
      
      // Starting again should not cause issues
      clock.startClock();
      
      expect(clock.isRunning()).toBe(true);
      
      // Time should still progress correctly
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('10:30:46');
      
      clock.destroy();
    });
  });

  describe('12-Hour Format (AM/PM)', () => {
    test('should display AM for morning hours', () => {
      const clock = createClock(container, '08:30:45', { use12Hour: true });
      
      expect(container.textContent).toBe('08:30:45 AM');
      expect(clock.getTime()).toBe('08:30:45 AM');
      
      clock.destroy();
    });

    test('should display PM for afternoon hours', () => {
      const clock = createClock(container, '14:30:45', { use12Hour: true });
      
      expect(container.textContent).toBe('02:30:45 PM');
      expect(clock.getTime()).toBe('02:30:45 PM');
      
      clock.destroy();
    });

    test('should display 12:00 AM for midnight (00:00)', () => {
      const clock = createClock(container, '00:00:00', { use12Hour: true });
      
      expect(container.textContent).toBe('12:00:00 AM');
      expect(clock.getTime()).toBe('12:00:00 AM');
      
      clock.destroy();
    });

    test('should display 12:00 PM for noon (12:00)', () => {
      const clock = createClock(container, '12:00:00', { use12Hour: true });
      
      expect(container.textContent).toBe('12:00:00 PM');
      expect(clock.getTime()).toBe('12:00:00 PM');
      
      clock.destroy();
    });

    test('should work with centiseconds', () => {
      const clock = createClock(container, '15:45:30:50', { 
        use12Hour: true,
        showCenti: true 
      });
      
      expect(container.textContent).toBe('03:45:30:50 PM');
      expect(clock.getTime()).toBe('03:45:30:50 PM');
      
      clock.destroy();
    });

    test('should convert time correctly when counting up', () => {
      const clock = createClock(container, '11:59:58', { use12Hour: true });
      
      expect(clock.getTime()).toBe('11:59:58 AM');
      
      // Advance 2 seconds to cross noon
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe('12:00:00 PM');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('12:00:01 PM');
      
      clock.destroy();
    });

    test('should convert time correctly when crossing midnight', () => {
      const clock = createClock(container, '23:59:58', { use12Hour: true });
      
      expect(clock.getTime()).toBe('11:59:58 PM');
      
      // Advance 2 seconds to cross midnight
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe('12:00:00 AM');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('12:00:01 AM');
      
      clock.destroy();
    });

    test('should work with countdown timer', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:05', { 
        use12Hour: true,
        countdown: true,
        callback
      });
      
      // 00:00:05 should display as 12:00:05 AM
      expect(clock.getTime()).toBe('12:00:05 AM');
      
      // 5000ms: countdown, 6000ms: stop
      jest.advanceTimersByTime(6000);
      expect(clock.getTime()).toBe('12:00:00 AM');
      expect(callback).toHaveBeenCalled();
      
      clock.destroy();
    });

    test('should throw error for invalid use12Hour option type', () => {
      expect(() => {
        createClock(container, '10:30:45', { use12Hour: 'yes' as any });
      }).toThrow('Invalid use12Hour option: must be a boolean');
    });
  });

  describe('Timezone Offset Support', () => {
    test('should accept timezoneOffset option', () => {
      const now = new Date();
      const expectedTime = formatOffsetTime(now, -5);
      const clock = createClock(container, undefined, { timezoneOffset: -5 });

      expect(clock.getTime()).toBe(expectedTime);
      clock.destroy();
    });

    test('should throw error for invalid timezoneOffset type', () => {
      expect(() => {
        createClock(container, undefined, { timezoneOffset: 'EST' as any });
      }).toThrow('Invalid timezoneOffset option: must be a number');
    });

    test('should throw error for timezoneOffset out of range', () => {
      expect(() => {
        createClock(container, undefined, { timezoneOffset: -13 });
      }).toThrow('Invalid timezoneOffset: must be between -12 and +14');

      expect(() => {
        createClock(container, undefined, { timezoneOffset: 15 });
      }).toThrow('Invalid timezoneOffset: must be between -12 and +14');

      expect(() => {
        createClock(container, undefined, { timezoneOffset: Number.NaN });
      }).toThrow('Invalid timezoneOffset: must be between -12 and +14');
    });

    test('should work with positive timezone offset', () => {
      jest.setSystemTime(new Date('2026-01-01T10:15:30.250Z'));

      const clock = createClock(container, undefined, { timezoneOffset: 5.5 });

      expect(clock.getTime()).toBe('15:45:30');

      clock.destroy();
    });

    test('should work with negative timezone offset', () => {
      jest.setSystemTime(new Date('2026-01-01T10:15:30.250Z'));

      const clock = createClock(container, undefined, { timezoneOffset: -8 });

      expect(clock.getTime()).toBe('02:15:30');

      clock.destroy();
    });

    test('should work with timezoneOffset and 12-hour format', () => {
      jest.setSystemTime(new Date('2026-01-01T13:45:20.000Z'));

      const clock = createClock(container, undefined, { 
        timezoneOffset: 1,
        use12Hour: true 
      });

      const adjustedTime = new Date(new Date().getTime() + 1 * 60 * 60 * 1000);
      const expectedTime = to12HourTime(
        adjustedTime.getUTCHours(),
        adjustedTime.getUTCMinutes(),
        adjustedTime.getUTCSeconds()
      );
      expect(clock.getTime()).toBe(expectedTime);

      clock.destroy();
    });

    test('should work with timezoneOffset and centiseconds', () => {
      jest.setSystemTime(new Date('2026-01-01T10:15:30.250Z'));

      const clock = createClock(container, undefined, { 
        timezoneOffset: -3,
        showCenti: true 
      });

      expect(clock.getTime()).toBe('07:15:30:25');

      clock.destroy();
    });

    test('should derive timezoneOffset clocks from real system time on each tick', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const clock = createClock(container, undefined, { timezoneOffset: 5.5 });
      expect(clock.getTime()).toBe('05:30:00');

      jest.setSystemTime(new Date('2026-01-01T02:00:00.000Z'));
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('07:30:01');

      clock.destroy();
    });
  });

  describe('IANA Timezone Support (DST-Aware)', () => {
    test('should accept valid IANA timezone', () => {
      const now = new Date();
      const expectedTime = formatIanaTime(now, 'America/New_York');
      const clock = createClock(container, undefined, { timezone: 'America/New_York' });

      expect(clock.getTime()).toBe(expectedTime);

      clock.destroy();
    });

    test('should accept various IANA timezones', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'Pacific/Auckland',
        'Africa/Cairo'
      ];
      
      timezones.forEach(tz => {
        const clock = createClock(container, undefined, { timezone: tz });

        const expectedTime = formatIanaTime(new Date(), tz);
        expect(clock.getTime()).toBe(expectedTime);

        clock.destroy();
      });
    });

    test('should throw error for invalid timezone type', () => {
      expect(() => {
        createClock(container, undefined, { timezone: 123 as any });
      }).toThrow('Invalid timezone option: must be a string');
    });

    test('should throw error for invalid IANA timezone name', () => {
      expect(() => {
        createClock(container, undefined, { timezone: 'Invalid/Timezone' });
      }).toThrow('Invalid timezone: "Invalid/Timezone" is not a valid IANA timezone name');
    });

    test('should throw error when both timezone and timezoneOffset are provided', () => {
      expect(() => {
        createClock(container, undefined, { 
          timezone: 'America/New_York',
          timezoneOffset: -5 
        });
      }).toThrow('Cannot use both timezone and timezoneOffset options; choose one');
    });

    test('should work with timezone and 12-hour format', () => {
      jest.setSystemTime(new Date('2026-01-01T15:45:30.120Z'));

      const clock = createClock(container, undefined, { 
        timezone: 'America/New_York',
        use12Hour: true 
      });

      const expectedTime = formatIanaTime(new Date(), 'America/New_York', { use12Hour: true });
      expect(clock.getTime()).toBe(expectedTime);

      clock.destroy();
    });

    test('should work with timezone and centiseconds', () => {
      jest.setSystemTime(new Date('2026-01-01T15:45:30.120Z'));

      const clock = createClock(container, undefined, { 
        timezone: 'Europe/London',
        showCenti: true 
      });

      const expectedTime = formatIanaTime(new Date(), 'Europe/London', { showCenti: true });
      expect(clock.getTime()).toBe(expectedTime);

      clock.destroy();
    });

    test('should display correct time format for timezone', () => {
      const clock = createClock(container, undefined, { timezone: 'Asia/Tokyo' });
      
      // Should display time in HH:MM:SS format
      expect(container.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      
      clock.destroy();
    });

    test('should derive IANA timezone clocks from real system time on each tick', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const clock = createClock(container, undefined, { timezone: 'UTC' });
      expect(clock.getTime()).toBe('00:00:00');

      jest.setSystemTime(new Date('2026-01-01T00:00:05.000Z'));
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:00:06');

      clock.destroy();
    });

    test('should handle missing time parts gracefully', () => {
      const dateTimeFormatSpy = jest.spyOn(Intl, 'DateTimeFormat');
      dateTimeFormatSpy.mockImplementation((() => {
        return {
          formatToParts: () => [
            { type: 'hour', value: '10' } as Intl.DateTimeFormatPart,
            { type: 'second', value: '30' } as Intl.DateTimeFormatPart
          ]
        } as Intl.DateTimeFormat;
      }) as typeof Intl.DateTimeFormat);

      const clock = createClock(container, undefined, { timezone: 'UTC' });

      expect(clock.getTime()).toBe('10:00:30');

      clock.destroy();
    });
  });

  describe('setTime Method', () => {
    test('should change the time to a new value', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.setTime('15:45:30');
      expect(clock.getTime()).toBe('15:45:30');
      
      clock.destroy();
    });

    test('should work with centiseconds', () => {
      const clock = createClock(container, '10:30:45:00', { showCenti: true });
      
      expect(clock.getTime()).toBe('10:30:45:00');
      
      clock.setTime('15:45:30:50');
      expect(clock.getTime()).toBe('15:45:30:50');
      
      clock.destroy();
    });

    test('should throw error for invalid time format', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(() => {
        clock.setTime('25:00:00');
      }).toThrow('Invalid time string format');
      
      expect(() => {
        clock.setTime('10:70:00');
      }).toThrow('Invalid time string format');
      
      expect(() => {
        clock.setTime('10:30');
      }).toThrow('Invalid time string format');
      
      // Original time should be unchanged
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.destroy();
    });

    test('should not change time if clock is destroyed', () => {
      const clock = createClock(container, '10:30:45');
      clock.destroy();
      
      // Should not throw, just return silently
      clock.setTime('15:45:30');
      
      expect(container.textContent).toBe('');
    });

    test('should update display immediately', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(container.textContent).toBe('10:30:45');
      
      clock.setTime('20:00:00');
      expect(container.textContent).toBe('20:00:00');
      
      clock.destroy();
    });

    test('should work with 12-hour format', () => {
      const clock = createClock(container, '10:30:45', { use12Hour: true });
      
      expect(clock.getTime()).toBe('10:30:45 AM');
      
      clock.setTime('14:30:45');
      expect(clock.getTime()).toBe('02:30:45 PM');
      
      clock.destroy();
    });

    test('should work on running clock', () => {
      const clock = createClock(container, '10:30:45');
      
      expect(clock.isRunning()).toBe(true);
      clock.setTime('20:00:00');
      expect(clock.getTime()).toBe('20:00:00');
      expect(clock.isRunning()).toBe(true);
      
      // Clock should continue running
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('20:00:01');
      
      clock.destroy();
    });

    test('should work on stopped clock', () => {
      const clock = createClock(container, '10:30:45');
      
      clock.stopClock();
      expect(clock.isRunning()).toBe(false);
      
      clock.setTime('20:00:00');
      expect(clock.getTime()).toBe('20:00:00');
      expect(clock.isRunning()).toBe(false);
      
      // Clock should remain stopped
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('20:00:00');
      
      clock.destroy();
    });
  });

  describe('reset Method', () => {
    test('should reset countdown timer to initial time', () => {
      const clock = createClock(container, '00:05:00', { countdown: true });
      
      // Let it count down a bit
      jest.advanceTimersByTime(3000);
      expect(clock.getTime()).toBe('00:04:57');
      
      // Reset
      clock.reset();
      expect(clock.getTime()).toBe('00:05:00');
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should reset custom time clock to initial time', () => {
      const clock = createClock(container, '10:30:45');
      
      // Let it count up
      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('10:30:50');
      
      // Reset
      clock.reset();
      expect(clock.getTime()).toBe('10:30:45');
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should reset and start running', () => {
      const clock = createClock(container, '00:00:02', { countdown: true });
      
      // Let it finish
      jest.advanceTimersByTime(3000);
      expect(clock.isRunning()).toBe(false);
      
      // Reset should restart
      clock.reset();
      expect(clock.getTime()).toBe('00:00:02');
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should sync with system time for system clock', () => {
      jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
      const clock = createClock(container);

      expect(clock.getTime()).toBe(formatLocalTime(new Date('2026-01-01T10:00:00.000Z')));

      jest.setSystemTime(new Date('2026-01-01T10:00:42.000Z'));
      clock.reset();

      expect(clock.getTime()).toBe(formatLocalTime(new Date('2026-01-01T10:00:42.000Z')));
      expect(clock.isRunning()).toBe(true);

      clock.destroy();
    });

    test('should work with centiseconds', () => {
      const clock = createClock(container, '00:00:10:00', { 
        countdown: true, 
        showCenti: true 
      });
      
      // Let it count down
      jest.advanceTimersByTime(550);
      expect(clock.getTime()).toBe('00:00:09:45');
      
      // Reset
      clock.reset();
      expect(clock.getTime()).toBe('00:00:10:00');
      
      clock.destroy();
    });

    test('should not do anything if clock is destroyed', () => {
      const clock = createClock(container, '00:05:00', { countdown: true });
      clock.destroy();
      
      // Should not throw
      clock.reset();
      
      expect(container.textContent).toBe('');
    });

    test('should clear existing timer and restart', () => {
      const clock = createClock(container, '00:02:00', { countdown: true });
      
      // Let it run for a bit
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:01:59');
      
      // Reset
      clock.reset();
      expect(clock.getTime()).toBe('00:02:00');
      
      // Should continue counting down
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:01:59');
      
      clock.destroy();
    });

    test('should work with callback after reset', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:02', { 
        countdown: true,
        callback 
      });
      
      // Let it finish
      jest.advanceTimersByTime(3000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Reset
      clock.reset();
      expect(clock.getTime()).toBe('00:00:02');
      
      // Let it finish again
      jest.advanceTimersByTime(3000);
      expect(callback).toHaveBeenCalledTimes(2);
      
      clock.destroy();
    });

    test('should remain stopped at zero and invoke callback when resetting zero countdown', () => {
      const callback = jest.fn();
      const clock = createClock(container, '00:00:00', {
        countdown: true,
        callback
      });

      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);

      clock.reset();

      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      expect(callback).toHaveBeenCalledTimes(2);

      clock.destroy();
    });
  });

  describe('Stopwatch Mode', () => {
    test('should create a stopwatch starting at 00:00:00', () => {
      const clock = createClock(container, undefined, { stopwatch: true });
      
      expect(container.textContent).toBe('00:00:00');
      expect(clock.getTime()).toBe('00:00:00');
      
      clock.destroy();
    });

    test('should create a stopwatch with custom initial time', () => {
      const clock = createClock(container, '00:00:10', { stopwatch: true });
      
      expect(container.textContent).toBe('00:00:10');
      expect(clock.getTime()).toBe('00:00:10');
      
      clock.destroy();
    });

    test('should count up in stopwatch mode', () => {
      const clock = createClock(container, undefined, { stopwatch: true });
      
      expect(clock.getTime()).toBe('00:00:00');
      
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('00:00:01');
      
      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('00:00:06');
      
      clock.destroy();
    });

    test('should count up with centiseconds', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        showCenti: true 
      });
      
      expect(clock.getTime()).toBe('00:00:00:00');
      
      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('00:00:00:01');
      
      jest.advanceTimersByTime(500);
      expect(clock.getTime()).toBe('00:00:00:51');
      
      clock.destroy();
    });

    test('should stop and start stopwatch', () => {
      const clock = createClock(container, undefined, { stopwatch: true });
      
      expect(clock.isRunning()).toBe(true);
      
      clock.stopClock();
      expect(clock.isRunning()).toBe(false);
      
      const stoppedTime = clock.getTime();
      jest.advanceTimersByTime(2000);
      expect(clock.getTime()).toBe(stoppedTime);
      
      clock.startClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should reset stopwatch to 00:00:00', () => {
      const clock = createClock(container, undefined, { stopwatch: true });
      
      jest.advanceTimersByTime(5000);
      expect(clock.getTime()).toBe('00:00:05');
      
      clock.reset();
      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should throw error when combining stopwatch with timezone', () => {
      expect(() => {
        createClock(container, undefined, { 
          stopwatch: true,
          timezone: 'America/New_York'
        });
      }).toThrow('Stopwatch mode cannot be combined with timezone options');
    });

    test('should throw error when combining stopwatch with timezoneOffset', () => {
      expect(() => {
        createClock(container, undefined, { 
          stopwatch: true,
          timezoneOffset: -5
        });
      }).toThrow('Stopwatch mode cannot be combined with timezone options');
    });

    test('should throw error for invalid stopwatch option type', () => {
      expect(() => {
        createClock(container, undefined, { stopwatch: 'yes' as any });
      }).toThrow('Invalid stopwatch option: must be a boolean');
    });

    test('should use 1000ms timeout cadence for non-centisecond stopwatch', () => {
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      const baselineCalls = setTimeoutSpy.mock.calls.length;
      const clock = createClock(container, undefined, { stopwatch: true });

      const delays = setTimeoutSpy.mock.calls
        .slice(baselineCalls)
        .map(([, delay]) => delay as number);

      expect(delays).toContain(1000);
      expect(delays).not.toContain(10);

      clock.destroy();
    });
  });

  describe('Lap Mode', () => {
    test('should throw error when lap is enabled without stopwatch', () => {
      expect(() => {
        createClock(container, undefined, { lap: true });
      }).toThrow('Lap mode requires stopwatch mode to be enabled');
    });

    test('should create a stopwatch with lap mode', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true
      });
      
      expect(clock).toBeDefined();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should record lap times', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps'
      });
      
      jest.advanceTimersByTime(1000);
      const lap1 = clock.lap();
      expect(lap1).toBe('Lap 1: 00:00:01');
      
      jest.advanceTimersByTime(2000);
      const lap2 = clock.lap();
      // Lap 2 is the time since lap 1 (2 seconds), not cumulative
      expect(lap2).toBe('Lap 2: 00:00:02');
      
      const laps = clock.getLaps();
      expect(laps).toHaveLength(2);
      expect(laps[0]).toBe('Lap 1: 00:00:01');
      expect(laps[1]).toBe('Lap 2: 00:00:02');
      
      clock.destroy();
    });

    test('should use custom lap word', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps',
        lapWord: 'Split'
      });
      
      jest.advanceTimersByTime(1000);
      const lap1 = clock.lap();
      expect(lap1).toBe('Split 1: 00:00:01');
      
      clock.destroy();
    });

    test('should use empty lap word', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps',
        lapWord: ''
      });
      
      jest.advanceTimersByTime(1000);
      const lap1 = clock.lap();
      expect(lap1).toBe('1: 00:00:01');
      
      clock.destroy();
    });

    test('should throw error for invalid lapMode option type', () => {
      expect(() => {
        createClock(container, undefined, { lapMode: 'invalid' as any });
      }).toThrow('Invalid lapMode option: must be "splits", "laps", or "both"');
    });

    test('should throw error when lapMode is set without lap option', () => {
      expect(() => {
        createClock(container, undefined, { lapMode: 'splits' });
      }).toThrow('lapMode requires lap mode to be enabled');
    });

    test('should record split times in splits mode', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'splits'
      });
      
      jest.advanceTimersByTime(1000);
      const split1 = clock.lap();
      expect(split1).toBe('Split 1: 00:00:01');
      
      jest.advanceTimersByTime(2000);
      const split2 = clock.lap();
      expect(split2).toBe('Split 2: 00:00:03');
      
      const splits = clock.getSplitTimes();
      expect(splits).toHaveLength(2);
      expect(splits[0]).toBe('Split 1: 00:00:01');
      expect(splits[1]).toBe('Split 2: 00:00:03');

      clock.destroy();
    });

    test('should return split times via getLaps in splits mode', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'splits'
      });

      jest.advanceTimersByTime(1000);
      clock.lap();

      jest.advanceTimersByTime(2000);
      clock.lap();

      const laps = clock.getLaps();
      expect(laps).toHaveLength(2);
      expect(laps[0]).toBe('Split 1: 00:00:01');
      expect(laps[1]).toBe('Split 2: 00:00:03');

      clock.destroy();
    });

    test('should return split times via getLaps with empty lapWord', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'splits',
        lapWord: ''
      });

      jest.advanceTimersByTime(1000);
      clock.lap();

      const laps = clock.getLaps();
      expect(laps).toHaveLength(1);
      expect(laps[0]).toBe('1: 00:00:01');
      expect(clock.getSplitTimes()).toEqual(['1: 00:00:01']);

      clock.destroy();
    });

    test('should return lap times via getLaps and getLapTimes with empty lapWord in laps mode', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'laps',
        lapWord: ''
      });

      jest.advanceTimersByTime(1000);
      expect(clock.lap()).toBe('1: 00:00:01');

      expect(clock.getLaps()).toEqual(['1: 00:00:01']);
      expect(clock.getLapTimes()).toEqual(['1: 00:00:01']);

      clock.destroy();
    });

    test('should record both lap and split times in both mode', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'both'
      });
      
      jest.advanceTimersByTime(1000);
      const lap1 = clock.lap();
      expect(lap1).toBe('Lap 1: 00:00:01 (00:00:01)');
      
      jest.advanceTimersByTime(2000);
      const lap2 = clock.lap();
      expect(lap2).toBe('Lap 2: 00:00:02 (00:00:03)');
      
      clock.destroy();
    });

    test('should get lap records with full details', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'both'
      });

      jest.advanceTimersByTime(1000);
      clock.lap();

      jest.advanceTimersByTime(2000);
      clock.lap();

      const records = clock.getLapRecords();
      expect(records).toHaveLength(2);

      expect(records[0].lapNumber).toBe(1);
      expect(records[0].lapTime).toBe('00:00:01');
      expect(records[0].splitTime).toBe('00:00:01');
      expect(records[0].preciseElapsedMs).toBeGreaterThan(0);
      expect(records[0].timestamp).toBeDefined();

      expect(records[1].lapNumber).toBe(2);
      expect(records[1].lapTime).toBe('00:00:02');
      expect(records[1].splitTime).toBe('00:00:03');
      expect(records[1].preciseElapsedMs).toBeGreaterThan(0);

      clock.destroy();
    });

    test('should get best lap', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps'
      });
      
      jest.advanceTimersByTime(2000);
      clock.lap(); // 2 seconds
      
      jest.advanceTimersByTime(3000);
      clock.lap(); // 3 seconds
      
      jest.advanceTimersByTime(1000);
      clock.lap(); // 1 second - best
      
      const best = clock.bestLap();
      expect(best).not.toBeNull();
      expect(best?.lapNumber).toBe(3);
      expect(best?.lapTime).toBe('00:00:01');
      
      clock.destroy();
    });

    test('should get worst lap', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps'
      });
      
      jest.advanceTimersByTime(2000);
      clock.lap(); // 2 seconds
      
      jest.advanceTimersByTime(3000);
      clock.lap(); // 3 seconds - worst
      
      jest.advanceTimersByTime(1000);
      clock.lap(); // 1 second
      
      const worst = clock.worstLap();
      expect(worst).not.toBeNull();
      expect(worst?.lapNumber).toBe(2);
      expect(worst?.lapTime).toBe('00:00:03');
      
      clock.destroy();
    });

    test('should return null for bestLap when no laps', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps'
      });
      
      expect(clock.bestLap()).toBeNull();
      expect(clock.worstLap()).toBeNull();
      
      clock.destroy();
    });

    test('should use different lap words for splits and laps', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'both',
        lapWord: 'Split'
      });
      
      jest.advanceTimersByTime(1000);
      const result = clock.lap();
      // Default for splits is 'Split', but since mode is 'both', it should use lap format
      expect(result).toContain('Split');
      
      clock.destroy();
    });

    test('should use both-mode format without label when lapWord is empty', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'both',
        lapWord: ''
      });

      jest.advanceTimersByTime(1000);
      expect(clock.lap()).toBe('1: 00:00:01 (00:00:01)');
      expect(clock.getLaps()).toEqual(['1: 00:00:01 (00:00:01)']);

      clock.destroy();
    });

    test('should get split times separately', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'both'
      });
      
      jest.advanceTimersByTime(1000);
      clock.lap();
      
      jest.advanceTimersByTime(2000);
      clock.lap();
      
      const splits = clock.getSplitTimes();
      const laps = clock.getLapTimes();
      
      expect(splits).toHaveLength(2);
      expect(laps).toHaveLength(2);
      
      // Splits are cumulative
      expect(splits[0]).toContain('00:00:01');
      expect(splits[1]).toContain('00:00:03');
      
      // Laps are delta
      expect(laps[0]).toContain('00:00:01');
      expect(laps[1]).toContain('00:00:02');
      
      clock.destroy();
    });

    test('should throw error for invalid lap option type', () => {
      expect(() => {
        createClock(container, undefined, { lap: 'yes' as any });
      }).toThrow('Invalid lap option: must be a boolean');
    });

    test('should throw error for invalid lapWord option type', () => {
      expect(() => {
        createClock(container, undefined, { lapWord: 123 as any });
      }).toThrow('Invalid lapWord option: must be a string');
    });

    test('should throw error when calling lap without lap mode', () => {
      const clock = createClock(container, undefined, { stopwatch: true });
      
      expect(() => {
        clock.lap();
      }).toThrow('Lap mode is not enabled');
      
      clock.destroy();
    });

    test('should throw error when calling lap helpers without lap mode', () => {
      const clock = createClock(container, undefined, { stopwatch: true });

      expect(() => {
        clock.getLaps();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.getSplitTimes();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.getLapTimes();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.getLapRecords();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.clearLaps();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.bestLap();
      }).toThrow('Lap mode is not enabled');
      expect(() => {
        clock.worstLap();
      }).toThrow('Lap mode is not enabled');

      clock.destroy();
    });

    test('should throw error when calling split-only methods in laps mode', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'laps'
      });

      expect(() => {
        clock.getSplitTimes();
      }).toThrow('Split times are only available when lapMode is "splits" or "both"');

      clock.destroy();
    });

    test('should throw error when calling lap-only methods in splits mode', () => {
      const clock = createClock(container, undefined, {
        stopwatch: true,
        lap: true,
        lapMode: 'splits'
      });

      expect(() => {
        clock.getLapTimes();
      }).toThrow('Lap times are only available when lapMode is "laps" or "both"');
      expect(() => {
        clock.bestLap();
      }).toThrow('bestLap() is only available when lapMode is "laps" or "both"');
      expect(() => {
        clock.worstLap();
      }).toThrow('worstLap() is only available when lapMode is "laps" or "both"');

      clock.destroy();
    });

    test('should clear lap times', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true
      });
      
      jest.advanceTimersByTime(1000);
      clock.lap();
      jest.advanceTimersByTime(1000);
      clock.lap();
      
      expect(clock.getLaps()).toHaveLength(2);
      
      clock.clearLaps();
      expect(clock.getLaps()).toHaveLength(0);
      
      clock.destroy();
    });

    test('should reset clear lap times', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true
      });
      
      jest.advanceTimersByTime(1000);
      clock.lap();
      
      expect(clock.getLaps()).toHaveLength(1);
      
      clock.reset();
      expect(clock.getLaps()).toHaveLength(0);
      
      clock.destroy();
    });

    test('should work with centiseconds in lap mode', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        lapMode: 'laps',
        showCenti: true
      });
      
      jest.advanceTimersByTime(150);
      const lap1 = clock.lap();
      expect(lap1).toBe('Lap 1: 00:00:00:15');
      
      clock.destroy();
    });

    test('should return empty lap-related results and no-op clear when destroyed', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true
      });
      
      clock.destroy();
      
      expect(clock.lap()).toBe('');
      expect(clock.getLaps()).toEqual([]);
      expect(clock.getSplitTimes()).toEqual([]);
      expect(clock.getLapTimes()).toEqual([]);
      expect(clock.getLapRecords()).toEqual([]);
      expect(() => clock.clearLaps()).not.toThrow();
    });
  });

  describe('useAnimationFrame Option', () => {
    test('should accept useAnimationFrame option', () => {
      const clock = createClock(container, undefined, { useAnimationFrame: true });
      expect(clock).toBeDefined();
      expect(clock.isRunning()).toBe(true);
      clock.destroy();
    });

    test('should throw error for invalid useAnimationFrame option type', () => {
      expect(() => {
        createClock(container, undefined, { useAnimationFrame: 'yes' as any });
      }).toThrow('Invalid useAnimationFrame option: must be a boolean');
    });

    test('should work with useAnimationFrame and stopwatch', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      expect(clock.getTime()).toBe('00:00:00');
      
      clock.destroy();
    });

    test('should work with useAnimationFrame and centiseconds', () => {
      const clock = createClock(container, undefined, { 
        showCenti: true,
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      expect(clock.getTime()).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
      
      clock.destroy();
    });

    test('should countdown correctly with useAnimationFrame', () => {
      const callback = jest.fn();
      let rafCallback: FrameRequestCallback | undefined;
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 999;
      });

      const clock = createClock(container, '00:00:05', { 
        countdown: true,
        useAnimationFrame: true,
        callback
      });
      
      expect(clock.isRunning()).toBe(true);
      expect(clock.getTime()).toBe('00:00:05');

      if (!rafCallback) {
        throw new Error('rAF callback not captured');
      }

      rafCallback(1000);
      jest.advanceTimersByTime(1000);
      rafCallback(2000);
      expect(clock.getTime()).toBe('00:00:04');

      jest.advanceTimersByTime(1000);
      rafCallback(3000);
      jest.advanceTimersByTime(1000);
      rafCallback(4000);
      jest.advanceTimersByTime(1000);
      rafCallback(5000);
      jest.advanceTimersByTime(1000);
      rafCallback(6000);
      jest.advanceTimersByTime(1000);
      rafCallback(7000);
      jest.advanceTimersByTime(1000);
      rafCallback(8000);
      expect(clock.getTime()).toBe('00:00:00');
      expect(clock.isRunning()).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);

      clock.destroy();
    });

    test('should work with useAnimationFrame and 12-hour format', () => {
      const clock = createClock(container, undefined, { 
        useAnimationFrame: true,
        use12Hour: true
      });
      
      expect(clock.isRunning()).toBe(true);
      expect(clock.getTime()).toMatch(/AM|PM$/);
      
      clock.destroy();
    });

    test('should start and stop with useAnimationFrame', () => {
      const clock = createClock(container, '10:30:45', { 
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      
      clock.stopClock();
      expect(clock.isRunning()).toBe(false);
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.startClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should reset with useAnimationFrame', () => {
      const clock = createClock(container, '00:00:05', { 
        countdown: true,
        useAnimationFrame: true
      });
      
      clock.stopClock();
      expect(clock.getTime()).toBe('00:00:05');
      
      clock.reset();
      expect(clock.getTime()).toBe('00:00:05');
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should toggle with useAnimationFrame', () => {
      const clock = createClock(container, '10:30:45', { 
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      
      clock.toggleClock();
      expect(clock.isRunning()).toBe(false);
      
      clock.toggleClock();
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
    });

    test('should not combine useAnimationFrame with timezone options', () => {
      // This should work - timezone doesn't depend on useAnimationFrame
      const clock = createClock(container, undefined, { 
        timezone: 'America/New_York',
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      clock.destroy();
    });

    test('should handle setTime with useAnimationFrame', () => {
      const clock = createClock(container, '10:30:45', { 
        useAnimationFrame: true
      });
      
      expect(clock.getTime()).toBe('10:30:45');
      
      clock.setTime('15:45:30');
      expect(clock.getTime()).toBe('15:45:30');
      
      clock.destroy();
    });

    test('should handle destroy with useAnimationFrame', () => {
      const clock = createClock(container, '10:30:45', { 
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
      
      expect(clock.isRunning()).toBe(false);
      expect(container.textContent).toBe('');
    });

    test('should work with lap mode and useAnimationFrame', () => {
      const clock = createClock(container, undefined, { 
        stopwatch: true,
        lap: true,
        useAnimationFrame: true
      });
      
      expect(clock.isRunning()).toBe(true);
      
      const lap1 = clock.lap();
      expect(lap1).toContain('Lap 1:');
      
      clock.destroy();
    });

    test('should default to false for useAnimationFrame', () => {
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
      const clock = createClock(container);

      expect(rafSpy).not.toHaveBeenCalled();
      expect(clock.isRunning()).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe(formatLocalTime(new Date('2026-01-01T12:34:57.780Z')));

      clock.destroy();
    });

    test('should advance time via rAF tick path', () => {
      const raf: { cb: ((timestamp: number) => void) | null } = { cb: null };
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        raf.cb = cb as (timestamp: number) => void;
        return 1;
      });

      const clock = createClock(container, '10:00:00', {
        useAnimationFrame: true
      });

      expect(clock.isRunning()).toBe(true);

      // Simulate rAF calls with advancing timestamps
      // First call sets lastTimestamp
      raf.cb!(1000);
      // Second call with 1000ms delta should advance by 1 second
      jest.advanceTimersByTime(1000);
      raf.cb!(2000);

      expect(clock.getTime()).toBe('10:00:01');

      // Another 1000ms
      jest.advanceTimersByTime(1000);
      raf.cb!(3000);
      expect(clock.getTime()).toBe('10:00:02');

      clock.destroy();
    });

    test('should advance centiseconds via rAF tick path', () => {
      const raf: { cb: ((timestamp: number) => void) | null } = { cb: null };
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        raf.cb = cb as (timestamp: number) => void;
        return 1;
      });

      const clock = createClock(container, '10:00:00:00', {
        useAnimationFrame: true,
        showCenti: true
      });

      // First call sets lastTimestamp, second advances by 50ms = 5 centiseconds
      raf.cb!(1000);
      jest.advanceTimersByTime(50);
      raf.cb!(1050);

      expect(clock.getTime()).toBe('10:00:00:05');

      clock.destroy();
    });

    test('should fall back to setTimeout when page is hidden', () => {
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        return 42;
      });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      const clock = createClock(container, '10:00:00', {
        useAnimationFrame: true
      });

      // Hide the page to force the scheduler onto the timeout fallback path.
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));

      // Should now use setTimeout fallback - advance via fake timers
      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).toBe('10:00:01');

      // Flip visible -> hidden to exercise both visibility transitions.
      setDocumentHidden(false);
      document.dispatchEvent(new Event('visibilitychange'));
      
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));
      
      clock.destroy();
      jest.advanceTimersByTime(1000);
    });

    test('should use 10ms setTimeout fallback when hidden with centiseconds', () => {
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        return 77;
      });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      const clock = createClock(container, '10:00:00:00', {
        useAnimationFrame: true,
        showCenti: true
      });

      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));

      jest.advanceTimersByTime(10);
      expect(clock.getTime()).toBe('10:00:00:01');

      clock.destroy();
      setDocumentHidden(false);
    });

    test('should resync system time clock when page becomes visible with rAF', () => {
      jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        return 1;
      });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      // System clock (no initialTime) with rAF enabled.
      const clock = createClock(container, undefined, {
        useAnimationFrame: true
      });
      expect(clock.getTime()).toBe(formatLocalTime(new Date('2026-01-01T10:00:00.000Z')));

      // Simulate hide then show
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));
      jest.setSystemTime(new Date('2026-01-01T10:00:25.000Z'));
      setDocumentHidden(false);
      document.dispatchEvent(new Event('visibilitychange'));

      // Should resync immediately when becoming visible
      expect(clock.isRunning()).toBe(true);
      expect(clock.getTime()).toBe(formatLocalTime(new Date('2026-01-01T10:00:25.000Z')));

      clock.destroy();
    });

    test('should ignore visibility events when useAnimationFrame is false', () => {
      const clock = createClock(container);

      const initialTime = clock.getTime();
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));
      setDocumentHidden(false);
      document.dispatchEvent(new Event('visibilitychange'));

      jest.advanceTimersByTime(1000);
      expect(clock.getTime()).not.toBe(initialTime);
      clock.destroy();
    });

    test('should not act on visibility change when destroyed or stopped', () => {
      const clock = createClock(container, '10:00:00', {
        useAnimationFrame: true
      });

      clock.stopClock();

      // Visibility changes should not cause errors when stopped
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));
      setDocumentHidden(false);
      document.dispatchEvent(new Event('visibilitychange'));

      expect(clock.isRunning()).toBe(false);

      clock.destroy();
    });

    test('should use requestAnimationFrame loop for system clock', () => {
      let rafCallback: FrameRequestCallback | undefined;
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 123;
      });
  
      // 1. Create system clock with useAnimationFrame: true
      const clock = createClock(container, undefined, { useAnimationFrame: true });
      
      // 2. Verify initial call to rAF
      expect(rafSpy).toHaveBeenCalled();
      
      // 3. Clear mock to verify subsequent calls
      rafSpy.mockClear();
      
      // 4. Trigger the callback with a timestamp
      if (rafCallback) {
        rafCallback(performance.now());
      } else {
        throw new Error('rafCallback not captured');
      }
      
      // 5. Verify rAF is called again (the loop)
      expect(rafSpy).toHaveBeenCalled();
      
      // 6. Verify clock is still running
      expect(clock.isRunning()).toBe(true);
      
      clock.destroy();
      rafSpy.mockRestore();
    });
  });

  describe('Global Ticker Edge Cases', () => {
    test('should handle detachGlobalVisibilityListener when document is undefined', () => {
      _resetGlobalStateForTesting();
      
      // @ts-ignore
      const realDocument = globalThis.document;
      try {
        // @ts-ignore
        delete globalThis.document;
        expect(() => _resetGlobalStateForTesting()).not.toThrow();
      } finally {
        // @ts-ignore
        globalThis.document = realDocument;
      }
    });

    test('should upgrade from timeout to rAF when new clock requests it', () => {
      _resetGlobalStateForTesting();

      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 101);

      // Start a timeout-driven clock first.
      const clock1 = createClock(container, '10:00:00');
      expect(setTimeoutSpy).toHaveBeenCalled();

      const baselineRafCalls = rafSpy.mock.calls.length;
      const baselineClearTimeoutCalls = clearTimeoutSpy.mock.calls.length;

      // Add an rAF clock and verify scheduler switches mode.
      const clock2 = createClock(container, '10:00:00', { useAnimationFrame: true });
      expect(rafSpy.mock.calls.length).toBeGreaterThan(baselineRafCalls);
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(baselineClearTimeoutCalls);
      expect(clock1.isRunning()).toBe(true);
      expect(clock2.isRunning()).toBe(true);
      
      clock1.destroy();
      clock2.destroy();
    });

    test('should downgrade from rAF to timeout when rAF clock is destroyed', () => {
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 202);

      // Start timeout-driven + rAF clocks together.
      const clock1 = createClock(container, '10:00:00');
      const clock2 = createClock(container, '10:00:00', { useAnimationFrame: true });

      const baselineTimeoutCalls = setTimeoutSpy.mock.calls.length;
      const baselineCancelCalls = cancelAnimationFrameSpy.mock.calls.length;

      // Removing the last rAF clock should switch scheduling back to setTimeout.
      clock2.destroy();
      expect(cancelAnimationFrameSpy.mock.calls.length).toBeGreaterThan(baselineCancelCalls);
      expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(baselineTimeoutCalls);

      const before = clock1.getTime();
      jest.advanceTimersByTime(1000);
      expect(clock1.getTime()).not.toBe(before);

      clock1.destroy();
    });

    test('should catch errors in isValidTimezone helper', () => {
      const dateTimeFormatSpy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        throw new Error('Mocked error');
      });

      try {
        expect(() => {
          createClock(container, undefined, { timezone: 'Fake/Timezone' });
        }).toThrow(/Invalid timezone/);
      } finally {
        dateTimeFormatSpy.mockRestore();
      }
    });
  });
});
