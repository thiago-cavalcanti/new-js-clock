#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const DEFAULT_TEST_FILES = ['tests/e2e/background-behavior.cjs'];
const DEFAULT_BROWSERS = ['chrome', 'firefox', 'edge'];

function normalizeBrowsers(raw) {
  const tokens = String(raw || '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [...DEFAULT_BROWSERS];
  }

  const allowed = new Set(DEFAULT_BROWSERS);
  for (const browser of tokens) {
    if (!allowed.has(browser)) {
      throw new Error(
        `Unsupported browser "${browser}". Supported values: ${DEFAULT_BROWSERS.join(', ')}`
      );
    }
  }

  return [...new Set(tokens)];
}

function resolveTestFiles(argv) {
  const files = argv.length > 0 ? argv : DEFAULT_TEST_FILES;
  return files.map((file) => path.resolve(process.cwd(), file));
}

function runSingle({ browser, file }) {
  const relativeFile = path.relative(process.cwd(), file) || file;
  process.stdout.write(`\n[RUN] ${relativeFile} on ${browser}\n`);

  const result = spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_BROWSER: browser,
      E2E_HEADLESS: process.env.E2E_HEADLESS ?? '1'
    }
  });

  if (result.status !== 0) {
    process.stdout.write(`[FAIL] ${relativeFile} on ${browser}\n`);
    return {
      ok: false,
      browser,
      file: relativeFile,
      code: result.status
    };
  }

  process.stdout.write(`[PASS] ${relativeFile} on ${browser}\n`);
  return { ok: true };
}

function main() {
  const browsers = normalizeBrowsers(process.env.E2E_BROWSERS);
  const testFiles = resolveTestFiles(process.argv.slice(2));

  process.stdout.write(
    `Running E2E browser matrix for ${testFiles.length} file(s): ${browsers.join(', ')}\n`
  );

  const failures = [];
  for (const browser of browsers) {
    for (const file of testFiles) {
      const result = runSingle({ browser, file });
      if (!result.ok) {
        failures.push(result);
      }
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} browser run(s) failed:\n`);
    for (const failure of failures) {
      process.stderr.write(
        `- ${failure.file} on ${failure.browser} (exit code ${String(failure.code)})\n`
      );
    }
    process.exit(1);
  }

  process.stdout.write('\nAll browser matrix runs passed.\n');
}

main();
