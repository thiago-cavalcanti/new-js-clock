#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const DEFAULT_SELENIUM_PORT = 4444;
const DEFAULT_SELENIUM_IMAGE = "selenium/standalone-all-browsers";
const DEFAULT_WEB_IMAGE = "nginx:alpine";
const DEFAULT_TEST_FILES = ["tests/e2e/background-behavior.cjs"];

function runDockerCommand(args, options = {}) {
  const result = spawnSync("docker", args, {
    stdio: options.captureOutput ? "pipe" : "inherit",
    encoding: options.captureOutput ? "utf8" : undefined
  });

  if (result.status !== 0) {
    const stderr = options.captureOutput ? String(result.stderr || "") : "";
    throw new Error(
      `Docker command failed: docker ${args.join(" ")}${stderr ? `\n${stderr.trim()}` : ""}`
    );
  }

  if (!options.captureOutput) {
    return "";
  }

  return String(result.stdout || "").trim();
}

function safeDockerCleanup(args) {
  const result = spawnSync("docker", args, {
    stdio: "pipe",
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    if (stderr) {
      process.stderr.write(`${stderr}\n`);
    }
  }
}

function waitForSeleniumReady(port, timeoutMs) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(
        {
          hostname: "127.0.0.1",
          port,
          path: "/status",
          timeout: 2000
        },
        (res) => {
          let payload = "";
          res.on("data", (chunk) => {
            payload += chunk;
          });

          res.on("end", () => {
            try {
              const parsed = JSON.parse(payload);
              if (parsed && parsed.value && parsed.value.ready === true) {
                resolve();
                return;
              }
            } catch {
              // Keep polling until timeout.
            }

            if (Date.now() - start >= timeoutMs) {
              reject(new Error(`Timed out waiting for Selenium Grid readiness on port ${String(port)}`));
              return;
            }

            setTimeout(attempt, 1000);
          });
        }
      );

      req.on("error", () => {
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for Selenium Grid readiness on port ${String(port)}`));
          return;
        }
        setTimeout(attempt, 1000);
      });

      req.on("timeout", () => {
        req.destroy();
      });
    };

    attempt();
  });
}

async function main() {
  const seleniumPort = Number(process.env.E2E_SELENIUM_PORT || DEFAULT_SELENIUM_PORT);
  const seleniumImage = process.env.E2E_SELENIUM_IMAGE || DEFAULT_SELENIUM_IMAGE;
  const webImage = process.env.E2E_WEB_IMAGE || DEFAULT_WEB_IMAGE;
  const seleniumReadyTimeoutMs = Number(process.env.E2E_SELENIUM_READY_TIMEOUT_MS || 120000);
  const requestedTestFiles = process.argv.slice(2);
  const testFiles = requestedTestFiles.length > 0 ? requestedTestFiles : DEFAULT_TEST_FILES;

  if (!Number.isInteger(seleniumPort) || seleniumPort <= 0) {
    throw new Error(`Invalid E2E_SELENIUM_PORT: ${String(process.env.E2E_SELENIUM_PORT)}`);
  }

  const rootDir = process.cwd();
  const runId = Date.now();
  const networkName = `new-js-clock-e2e-net-${String(runId)}`;
  const webContainerName = `new-js-clock-web-${String(runId)}`;
  const seleniumContainerName = `new-js-clock-selenium-${String(runId)}`;
  const seleniumUrl = process.env.SELENIUM_REMOTE_URL || `http://127.0.0.1:${String(seleniumPort)}/wd/hub`;
  const baseUrl = process.env.E2E_BASE_URL || `http://${webContainerName}/docs/index.html`;
  const matrixScript = path.resolve(rootDir, "scripts/run-e2e-all-browsers.cjs");

  let networkCreated = false;
  let webStarted = false;
  let seleniumStarted = false;

  try {
    process.stdout.write(`Creating Docker network ${networkName}\n`);
    runDockerCommand(["network", "create", networkName], { captureOutput: true });
    networkCreated = true;

    process.stdout.write(`Starting web container ${webContainerName} (${webImage})\n`);
    runDockerCommand([
      "run",
      "--detach",
      "--rm",
      "--name",
      webContainerName,
      "--network",
      networkName,
      "--volume",
      `${rootDir}:/usr/share/nginx/html:ro`,
      webImage
    ]);
    webStarted = true;

    process.stdout.write(
      `Starting Selenium container ${seleniumContainerName} (${seleniumImage}) on port ${String(seleniumPort)}\n`
    );
    runDockerCommand([
      "run",
      "--detach",
      "--rm",
      "--name",
      seleniumContainerName,
      "--network",
      networkName,
      "--publish",
      `${String(seleniumPort)}:4444`,
      "--shm-size=2g",
      seleniumImage
    ]);
    seleniumStarted = true;

    process.stdout.write("Waiting for Selenium Grid readiness...\n");
    await waitForSeleniumReady(seleniumPort, seleniumReadyTimeoutMs);
    process.stdout.write(`Selenium Grid is ready. Base URL for browsers: ${baseUrl}\n`);

    const matrixResult = spawnSync(process.execPath, [matrixScript, ...testFiles], {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_BASE_URL: baseUrl,
        SELENIUM_REMOTE_URL: seleniumUrl,
        E2E_HEADLESS: process.env.E2E_HEADLESS ?? "1"
      }
    });

    if (matrixResult.status !== 0) {
      process.exit(matrixResult.status || 1);
    }
  } finally {
    if (seleniumStarted) {
      process.stdout.write(`Stopping Selenium container ${seleniumContainerName}\n`);
      safeDockerCleanup(["rm", "--force", seleniumContainerName]);
    }

    if (webStarted) {
      process.stdout.write(`Stopping web container ${webContainerName}\n`);
      safeDockerCleanup(["rm", "--force", webContainerName]);
    }

    if (networkCreated) {
      process.stdout.write(`Removing Docker network ${networkName}\n`);
      safeDockerCleanup(["network", "rm", networkName]);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
