const { Builder, Browser, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const edge = require("selenium-webdriver/edge");
const assert = require("node:assert/strict");

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000/docs/index.html";
const REMOTE_SELENIUM_URL = process.env.SELENIUM_REMOTE_URL;
const REQUESTED_BROWSER = String(process.env.E2E_BROWSER || "chrome").toLowerCase();
const RUN_HEADLESS = process.env.E2E_HEADLESS !== "0";
const DAY_MS = 24 * 60 * 60 * 1000;

function resolveBrowserConfig() {
  switch (REQUESTED_BROWSER) {
    case "chrome":
    case "chromium":
      return {
        key: "chrome",
        browserName: Browser.CHROME
      };
    case "firefox":
      return {
        key: "firefox",
        browserName: Browser.FIREFOX
      };
    case "edge":
      return {
        key: "edge",
        browserName: Browser.EDGE
      };
    default:
      throw new Error(
        `Unsupported E2E_BROWSER value: "${REQUESTED_BROWSER}". Supported values: chrome, firefox, edge`
      );
  }
}

function createDriverBuilder() {
  const browserConfig = resolveBrowserConfig();
  const builder = new Builder().forBrowser(browserConfig.browserName);

  if (REMOTE_SELENIUM_URL) {
    builder.usingServer(REMOTE_SELENIUM_URL);
  }

  if (browserConfig.key === "chrome") {
    const options = new chrome.Options();
    options.addArguments("--window-size=1920,1080");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-sandbox");
    if (RUN_HEADLESS) {
      options.addArguments("--headless=new");
      options.addArguments("--disable-gpu");
    }
    builder.setChromeOptions(options);
  } else if (browserConfig.key === "firefox") {
    const options = new firefox.Options();
    options.addArguments("--width=1920");
    options.addArguments("--height=1080");
    if (RUN_HEADLESS) {
      options.addArguments("-headless");
    }
    builder.setFirefoxOptions(options);
  } else {
    const options = new edge.Options();
    options.addArguments("--window-size=1920,1080");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-sandbox");
    if (RUN_HEADLESS) {
      options.addArguments("--headless=new");
      options.addArguments("--disable-gpu");
    }
    builder.setEdgeOptions(options);
  }

  return builder;
}

function parseClockTextToMs(text) {
  const value = String(text).trim();

  let match = value.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, hh, mm, ss, cc] = match;
    return (
      (Number(hh) * 60 * 60 + Number(mm) * 60 + Number(ss)) * 1000 +
      Number(cc) * 10
    );
  }

  match = value.match(/^(\d{2}):(\d{2}):(\d{2})\s(AM|PM)$/);
  if (match) {
    const [, hhRaw, mm, ss, period] = match;
    let hh = Number(hhRaw) % 12;
    if (period === "PM") {
      hh += 12;
    }
    return (hh * 60 * 60 + Number(mm) * 60 + Number(ss)) * 1000;
  }

  match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, hh, mm, ss] = match;
    return (Number(hh) * 60 * 60 + Number(mm) * 60 + Number(ss)) * 1000;
  }

  match = value.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    const [, mm, ss] = match;
    return (Number(mm) * 60 + Number(ss)) * 1000;
  }

  match = value.match(/^(\d{2})$/);
  if (match) {
    const [, ss] = match;
    return Number(ss) * 1000;
  }

  throw new Error(`Unrecognized clock format: "${value}"`);
}

function extractAllClockTokens(input) {
  return [...String(input).matchAll(/\d{2}:\d{2}:\d{2}(?::\d{2})?/g)].map(
    (match) => match[0]
  );
}

function forwardDeltaMs(beforeMs, afterMs) {
  const delta = afterMs - beforeMs;
  return delta >= 0 ? delta : DAY_MS + delta;
}

function assertApproxSeconds(actualMs, expectedMs, toleranceSeconds, message) {
  const actualSeconds = actualMs / 1000;
  const expectedSeconds = expectedMs / 1000;
  assert.ok(
    actualSeconds >= expectedSeconds - toleranceSeconds &&
      actualSeconds <= expectedSeconds + toleranceSeconds,
    `${message}. Expected ~${expectedSeconds.toFixed(2)}s (+/-${toleranceSeconds}s), got ${actualSeconds.toFixed(2)}s`
  );
}

function assertBetween(value, min, max, message) {
  assert.ok(value >= min && value <= max, `${message}. Expected [${min}, ${max}], got ${value}`);
}

async function prepareDemoPage(driver) {
  await driver.get(BASE_URL);
  await driver.wait(until.elementLocated(By.id("clock1")), 10000);
  await driver.wait(
    async () =>
      Boolean(
        await driver.executeScript(
          "return Boolean(window.clock1 && window.clockRaf && window.clock12h && window.stopwatch1 && window.stopwatch2 && window.stopwatch3);"
        )
      ),
    10000
  );

  await driver.executeScript(`
    window.alert = () => {};
    window.__e2eErrors = [];
    window.addEventListener("error", (event) => {
      window.__e2eErrors.push(String(event.message || event.error || "error"));
    });
    window.addEventListener("unhandledrejection", (event) => {
      window.__e2eErrors.push(String(event.reason));
    });

    window.__e2eVisibilityEvents = [];
    document.addEventListener("visibilitychange", () => {
      window.__e2eVisibilityEvents.push({ hidden: document.hidden, at: Date.now() });
    });
    window.__e2eVisibilityEvents.push({ hidden: document.hidden, at: Date.now() });
  `);
}

async function assertNoBrowserErrors(driver) {
  const errors = await driver.executeScript("return window.__e2eErrors || [];");
  assert.equal(
    errors.length,
    0,
    `Browser emitted unexpected error(s): ${errors.join(" | ")}`
  );
}

async function getClockTime(driver, name) {
  const value = await driver.executeScript("return window[arguments[0]].getTime();", name);
  return String(value).trim();
}

async function getElementText(driver, id) {
  const element = await driver.findElement(By.id(id));
  return String(await element.getText()).trim();
}

async function hasCountdownCallbackMessage(driver) {
  return Boolean(
    await driver.executeScript(`
      const description = document.getElementById("clock3-description");
      if (!description) return false;
      return Boolean(description.querySelector('[data-clock3-callback-message="true"]'));
    `)
  );
}

async function setClockTime(driver, name, timeText) {
  await driver.executeScript("window[arguments[0]].setTime(arguments[1]);", name, timeText);
}

async function startClock(driver, name) {
  await driver.executeScript("window[arguments[0]].startClock();", name);
}

async function stopClock(driver, name) {
  await driver.executeScript("window[arguments[0]].stopClock();", name);
}

async function resetClock(driver, name) {
  await driver.executeScript("window[arguments[0]].reset();", name);
}

async function isClockRunning(driver, name) {
  return Boolean(await driver.executeScript("return window[arguments[0]].isRunning();", name));
}

async function lapClock(driver, name) {
  const value = await driver.executeScript("return window[arguments[0]].lap();", name);
  return String(value).trim();
}

async function backgroundPageForMs(driver, milliseconds) {
  const originalHandle = await driver.getWindowHandle();
  const startedAt = Date.now();

  await driver.switchTo().newWindow("tab");
  await driver.get("about:blank");
  await driver.sleep(milliseconds);
  await driver.close();

  await driver.switchTo().window(originalHandle);
  await driver.sleep(300);

  return Date.now() - startedAt;
}

async function createInjectedOffsetClock(driver, offsetHours) {
  const result = await driver.executeAsyncScript(
    `
      const offset = arguments[0];
      const done = arguments[arguments.length - 1];
      (async () => {
        if (window.__e2eOffsetClock && typeof window.__e2eOffsetClock.destroy === "function") {
          window.__e2eOffsetClock.destroy();
        }

        const existing = document.getElementById("e2e-offset-clock");
        if (existing) existing.remove();

        const el = document.createElement("div");
        el.id = "e2e-offset-clock";
        el.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
        document.body.appendChild(el);

        const mod = await import("./dist/index.js");
        window.__e2eOffsetClock = mod.createClock(el, undefined, { timezoneOffset: offset });
        done({ ok: true });
      })().catch((error) => done({ ok: false, error: String(error && error.message ? error.message : error) }));
    `,
    offsetHours
  );

  assert.equal(result.ok, true, `Failed to create injected timezoneOffset clock: ${result.error || "unknown error"}`);
}

async function createAndDestroyInjectedRafClock(driver) {
  const result = await driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    (async () => {
      const existing = document.getElementById("e2e-raf-clock");
      if (existing) existing.remove();

      const el = document.createElement("div");
      el.id = "e2e-raf-clock";
      el.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
      document.body.appendChild(el);

      const mod = await import("./dist/index.js");
      const clock = mod.createClock(el, "10:00:00", { useAnimationFrame: true, showCenti: true });
      clock.destroy();
      done({ ok: true });
    })().catch((error) => done({ ok: false, error: String(error && error.message ? error.message : error) }));
  `);

  assert.equal(result.ok, true, `Failed to create/destroy injected rAF clock: ${result.error || "unknown error"}`);
}

const tests = [
  {
    name: "Demo boot smoke initializes clocks",
    run: async (driver) => {
      await driver.sleep(500);

      assert.match(await getElementText(driver, "clock1"), /^\d{2}:\d{2}:\d{2}$/);
      assert.match(await getElementText(driver, "clock2"), /^\d{2}:\d{2}:\d{2}:\d{2}$/);
      assert.match(await getElementText(driver, "clock-raf"), /^\d{2}:\d{2}:\d{2}:\d{2}$/);
      assert.match(await getElementText(driver, "clock12h"), /^\d{2}:\d{2}:\d{2}\s(?:AM|PM)$/);
      assert.match(await getElementText(driver, "stopwatch1"), /^\d{2}:\d{2}:\d{2}$/);
    }
  },
  {
    name: "Visibility toggles false -> true -> false on tab backgrounding",
    run: async (driver) => {
      assert.equal(await driver.executeScript("return document.hidden;"), false);
      await backgroundPageForMs(driver, 3000);

      const states = await driver.executeScript(
        "return (window.__e2eVisibilityEvents || []).map((entry) => entry.hidden);"
      );

      const firstHiddenIndex = states.indexOf(true);
      assert.ok(firstHiddenIndex >= 0, "Expected at least one visibilitychange event with hidden=true");
      assert.ok(
        states.slice(firstHiddenIndex + 1).includes(false),
        "Expected visibility to return to hidden=false after background period"
      );
      assert.equal(await driver.executeScript("return document.hidden;"), false);
    }
  },
  {
    name: "System clock catches up after 7s in background",
    run: async (driver) => {
      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clock1"));
      const elapsedMs = await backgroundPageForMs(driver, 7000);
      const afterMs = parseClockTextToMs(await getClockTime(driver, "clock1"));
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assertApproxSeconds(advancedMs, elapsedMs, 2, "clock1 did not track hidden elapsed time");
    }
  },
  {
    name: "rAF clock falls back in background and catches up",
    run: async (driver) => {
      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clockRaf"));
      const elapsedMs = await backgroundPageForMs(driver, 7000);
      const afterMs = parseClockTextToMs(await getClockTime(driver, "clockRaf"));
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assertApproxSeconds(advancedMs, elapsedMs, 2, "clockRaf did not track hidden elapsed time");
    }
  },
  {
    name: "IANA timezone clock advances correctly while hidden",
    run: async (driver) => {
      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clockTzNY"));
      const elapsedMs = await backgroundPageForMs(driver, 7000);
      const afterMs = parseClockTextToMs(await getClockTime(driver, "clockTzNY"));
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assertApproxSeconds(advancedMs, elapsedMs, 2, "clockTzNY did not track hidden elapsed time");
    }
  },
  {
    name: "timezoneOffset clock advances correctly while hidden",
    run: async (driver) => {
      await createInjectedOffsetClock(driver, -5);
      const beforeText = await driver.executeScript("return window.__e2eOffsetClock.getTime();");
      const beforeMs = parseClockTextToMs(beforeText);

      const elapsedMs = await backgroundPageForMs(driver, 7000);
      const afterText = await driver.executeScript("return window.__e2eOffsetClock.getTime();");
      const afterMs = parseClockTextToMs(afterText);
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assertApproxSeconds(advancedMs, elapsedMs, 2, "timezoneOffset clock did not track hidden elapsed time");
    }
  },
  {
    name: "Countdown continues during hidden period",
    run: async (driver) => {
      await setClockTime(driver, "clock5", "00:00:08:00");
      await startClock(driver, "clock5");

      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clock5"));
      const elapsedMs = await backgroundPageForMs(driver, 5000);
      const afterMs = parseClockTextToMs(await getClockTime(driver, "clock5"));

      assert.ok(afterMs > 0, "clock5 should still have remaining time after 5 seconds hidden from 8 seconds start");
      assert.equal(await isClockRunning(driver, "clock5"), true, "clock5 should still be running");

      const droppedSeconds = (beforeMs - afterMs) / 1000;
      const expectedSeconds = elapsedMs / 1000;
      assertBetween(
        droppedSeconds,
        Math.max(1, expectedSeconds - 2),
        expectedSeconds + 2,
        "clock5 did not decrease by expected hidden duration"
      );
    }
  },
  {
    name: "Countdown callback message is added on finish, removed on reset, and added again",
    run: async (driver) => {
      assert.equal(await hasCountdownCallbackMessage(driver), false, "Callback message should start hidden");

      await setClockTime(driver, "clock3", "00:00:04");
      await startClock(driver, "clock3");

      await backgroundPageForMs(driver, 6000);

      const current = await getClockTime(driver, "clock3");
      assert.equal(current, "00:00:00", "clock3 should end at 00:00:00");
      assert.equal(await isClockRunning(driver, "clock3"), false, "clock3 should be stopped at zero");

      const status = await getElementText(driver, "status3");
      assert.match(status, /finished!/i, "status3 should indicate countdown completion");

      assert.equal(
        await hasCountdownCallbackMessage(driver),
        true,
        "Callback message should be added after countdown completion"
      );

      await driver.executeScript(`
        const card = document.getElementById("clock3").closest(".demo-card");
        const resetButton = card.querySelector(".btn-danger");
        resetButton.click();
      `);

      assert.equal(
        await hasCountdownCallbackMessage(driver),
        false,
        "Reset button should remove callback message"
      );

      await setClockTime(driver, "clock3", "00:00:02");
      await startClock(driver, "clock3");
      await backgroundPageForMs(driver, 3000);

      assert.equal(
        await hasCountdownCallbackMessage(driver),
        true,
        "Callback message should be added again after next completion"
      );
    }
  },
  {
    name: "Centisecond countdown does not go negative while hidden",
    run: async (driver) => {
      await setClockTime(driver, "clock5", "00:00:02:50");
      await startClock(driver, "clock5");

      await backgroundPageForMs(driver, 3000);

      const current = await getClockTime(driver, "clock5");
      assert.equal(current, "00:00:00:00", "clock5 should clamp to zero");
      assert.equal(await isClockRunning(driver, "clock5"), false, "clock5 should stop at zero");
    }
  },
  {
    name: "Stopwatch accumulates hidden elapsed time",
    run: async (driver) => {
      await resetClock(driver, "stopwatch1");
      await startClock(driver, "stopwatch1");

      const beforeMs = parseClockTextToMs(await getClockTime(driver, "stopwatch1"));
      const elapsedMs = await backgroundPageForMs(driver, 6000);
      const afterMs = parseClockTextToMs(await getClockTime(driver, "stopwatch1"));
      const advancedMs = afterMs - beforeMs;

      assertApproxSeconds(advancedMs, elapsedMs, 2, "stopwatch1 did not track hidden elapsed time");
    }
  },
  {
    name: "Stopwatch lap delta includes hidden interval",
    run: async (driver) => {
      await resetClock(driver, "stopwatch3");
      await startClock(driver, "stopwatch3");

      await driver.sleep(1200);
      await lapClock(driver, "stopwatch3");

      await backgroundPageForMs(driver, 5000);
      const lapResult = await lapClock(driver, "stopwatch3");
      const tokens = extractAllClockTokens(lapResult);

      assert.ok(tokens.length >= 1, `Expected at least one time token in lap result: ${lapResult}`);
      const lapDeltaMs = parseClockTextToMs(tokens[0]);
      assert.ok(lapDeltaMs >= 4000, `Expected lap delta >= 4.0s after background, got ${lapDeltaMs / 1000}s`);
    }
  },
  {
    name: "Repeated hide/show cycles do not cause drift on rAF clock",
    run: async (driver) => {
      // clockRaf is system-driven, so avoid setTime() baselines that can race with wall-clock resync.
      await startClock(driver, "clockRaf");

      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clockRaf"));
      const startedAt = Date.now();

      for (let i = 0; i < 3; i += 1) {
        await backgroundPageForMs(driver, 4000);
      }

      const elapsedMs = Date.now() - startedAt;
      const afterMs = parseClockTextToMs(await getClockTime(driver, "clockRaf"));
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assertApproxSeconds(advancedMs, elapsedMs, 3, "clockRaf accumulated excessive drift after repeated hide/show");
      assert.equal(await isClockRunning(driver, "clockRaf"), true, "clockRaf should still be running");
    }
  },
  {
    name: "Multi-instance behavior remains isolated while hidden",
    run: async (driver) => {
      await setClockTime(driver, "clock6a", "10:00:00");
      await setClockTime(driver, "clock6b", "20:00:00");
      await startClock(driver, "clock6a");
      await startClock(driver, "clock6b");
      await stopClock(driver, "clock6a");

      const beforeA = parseClockTextToMs(await getClockTime(driver, "clock6a"));
      const beforeB = parseClockTextToMs(await getClockTime(driver, "clock6b"));
      const elapsedMs = await backgroundPageForMs(driver, 5000);
      const afterA = parseClockTextToMs(await getClockTime(driver, "clock6a"));
      const afterB = parseClockTextToMs(await getClockTime(driver, "clock6b"));

      assert.equal(afterA, beforeA, "Stopped clock6a should not advance while hidden");
      assertApproxSeconds(afterB - beforeB, elapsedMs, 2, "Running clock6b did not track hidden elapsed time");
    }
  },
  {
    name: "12-hour clock keeps format and advances while hidden",
    run: async (driver) => {
      // clock12h is system-driven, so baseline from current wall-clock rather than forcing setTime().
      await startClock(driver, "clock12h");

      const beforeMs = parseClockTextToMs(await getClockTime(driver, "clock12h"));
      const elapsedMs = await backgroundPageForMs(driver, 7000);
      const afterText = await getClockTime(driver, "clock12h");
      const afterMs = parseClockTextToMs(afterText);
      const advancedMs = forwardDeltaMs(beforeMs, afterMs);

      assert.match(afterText, /^\d{2}:\d{2}:\d{2}\s(?:AM|PM)$/);
      assertApproxSeconds(advancedMs, elapsedMs, 2, "clock12h did not track hidden elapsed time");
    }
  },
  {
    name: "Stopped/destroyed rAF clocks remain stable across visibility transitions",
    run: async (driver) => {
      await stopClock(driver, "clockRaf");
      const stoppedBefore = await getClockTime(driver, "clockRaf");

      await backgroundPageForMs(driver, 3000);

      const stoppedAfter = await getClockTime(driver, "clockRaf");
      assert.equal(stoppedAfter, stoppedBefore, "Stopped clockRaf should not resume on visibility changes");
      assert.equal(await isClockRunning(driver, "clockRaf"), false, "clockRaf should remain stopped");

      await createAndDestroyInjectedRafClock(driver);
      await backgroundPageForMs(driver, 2000);
    }
  }
];

async function main() {
  let driver;
  const failures = [];

  try {
    driver = await createDriverBuilder().build();
    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: 30000,
      script: 30000
    });

    console.log(
      `Running ${tests.length} background behavior E2E tests against ${BASE_URL} ` +
        `(browser=${REQUESTED_BROWSER}, selenium=${REMOTE_SELENIUM_URL || "local driver"})`
    );

    for (const testCase of tests) {
      const startedAt = Date.now();
      process.stdout.write(`\n[RUN] ${testCase.name}\n`);

      try {
        await prepareDemoPage(driver);
        await testCase.run(driver);
        await assertNoBrowserErrors(driver);
        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        process.stdout.write(`[PASS] ${testCase.name} (${elapsedSeconds}s)\n`);
      } catch (error) {
        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        const message = error instanceof Error ? error.stack || error.message : String(error);
        failures.push({ name: testCase.name, message });
        process.stdout.write(`[FAIL] ${testCase.name} (${elapsedSeconds}s)\n${message}\n`);
      }
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} test(s) failed:`);
    for (const failure of failures) {
      console.error(`- ${failure.name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${tests.length} background behavior tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
