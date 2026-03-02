#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_PATH_PATTERN = /^package\/dist\/testing(\.|\/)/;
const TEMP_DIR = `/tmp/new-js-clock-pack-check-${process.pid}-${Date.now()}`;
const PACK_COMMAND = `npm pack --pack-destination "${TEMP_DIR}" --cache /tmp/npm-cache-new-js-clock`;

function fail(message) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  execSync(PACK_COMMAND, { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
  const reason = error && error.stderr ? error.stderr.toString() : String(error);
  fail(`Failed to run "${PACK_COMMAND}".\n${reason}`);
}

const tarballs = fs.readdirSync(TEMP_DIR).filter((file) => file.endsWith('.tgz'));
if (tarballs.length !== 1) {
  fail(`Expected exactly one tarball in ${TEMP_DIR}, found ${tarballs.length}.`);
}

const tarballPath = path.join(TEMP_DIR, tarballs[0]);
let tarListOutput = '';

try {
  tarListOutput = execSync(`tar -tf "${tarballPath}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  const reason = error && error.stderr ? error.stderr.toString() : String(error);
  fail(`Failed to inspect tarball "${tarballPath}".\n${reason}`);
}

const packageFiles = tarListOutput
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const forbiddenPaths = packageFiles.filter((filePath) => FORBIDDEN_PATH_PATTERN.test(filePath));

fs.rmSync(TEMP_DIR, { recursive: true, force: true });

if (forbiddenPaths.length > 0) {
  fail(
    [
      'Publish artifact guard failed: dist/testing.* must not be included in the npm tarball.',
      'Forbidden paths:',
      ...forbiddenPaths.map((path) => `- ${path}`)
    ].join('\n')
  );
}

console.log('Publish artifact guard passed: no dist/testing.* files detected in npm pack output.');
