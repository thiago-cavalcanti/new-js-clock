import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  addClock,
  removeClock,
  resetGlobalStateForTesting,
  type TickerClock
} from '../../src/internal/globalTicker.js';

jest.useFakeTimers();

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    writable: true,
    configurable: true
  });
}

describe('Global Ticker Internal Scheduler', () => {
  beforeEach(() => {
    resetGlobalStateForTesting();
    setDocumentHidden(false);
  });

  afterEach(() => {
    resetGlobalStateForTesting();
    setDocumentHidden(false);
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  test('should schedule timeout on visibility restore when no active clock requests rAF', () => {
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
    const cancelRafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    let requestsRaf = true;
    const clock: TickerClock = {
      _tick: jest.fn(),
      _requestsAnimationFrame: () => requestsRaf,
      _isSystemDriven: () => false,
      _getTimeoutDelay: () => 250
    };

    addClock(clock);
    expect(rafSpy).toHaveBeenCalled();

    const baselineTimeoutCalls = setTimeoutSpy.mock.calls.length;
    requestsRaf = false;

    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancelRafSpy).toHaveBeenCalled();
    expect(setTimeoutSpy.mock.calls.length).toBe(baselineTimeoutCalls + 1);

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setTimeoutSpy.mock.calls.length).toBe(baselineTimeoutCalls + 2);

    const lastDelay = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1]?.[1] as number;
    expect(lastDelay).toBe(250);

    removeClock(clock);
  });

  test('should use the minimum timeout delay among active timeout-driven clocks', () => {
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');

    const slowClock: TickerClock = {
      _tick: jest.fn(),
      _requestsAnimationFrame: () => false,
      _isSystemDriven: () => false,
      _getTimeoutDelay: () => 800
    };

    const fastClock: TickerClock = {
      _tick: jest.fn(),
      _requestsAnimationFrame: () => false,
      _isSystemDriven: () => false,
      _getTimeoutDelay: () => 120
    };

    addClock(slowClock);
    addClock(fastClock);

    jest.advanceTimersByTime(800);

    const scheduledDelays = setTimeoutSpy.mock.calls.map(([, delay]) => delay as number);
    expect(scheduledDelays).toContain(120);
    expect(slowClock._tick).toHaveBeenCalled();
    expect(fastClock._tick).toHaveBeenCalled();

    removeClock(slowClock);
    removeClock(fastClock);
  });
});
