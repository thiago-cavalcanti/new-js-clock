#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "dist");
const targetDir = path.join(rootDir, "docs", "dist");

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Cannot sync docs dist: source directory not found at ${sourceDir}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Synced ${sourceDir} -> ${targetDir}`);
