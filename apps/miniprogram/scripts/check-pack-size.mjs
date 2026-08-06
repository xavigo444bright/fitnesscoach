#!/usr/bin/env node
/**
 * VT-P5-007 / NFR-007：估算主包与训练分包体积（上传忽略目录已排除）。
 * 微信硬顶：主包 / 单个分包源码均 ≤2MB；全包合计 <20MB（NFR-007）。
 * 模型运行时下载，不计包内。
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const mpRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const IGNORE_DIR = new Set([
  "node_modules",
  "local_modules",
  "models",
  "vendor",
  "scripts",
  ".git",
]);

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === ".DS_Store") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (IGNORE_DIR.has(name)) continue;
      // 根目录遗留的 miniprogram_npm 不计入（已迁到 packageTrain）
      if (dir === mpRoot && name === "miniprogram_npm") continue;
      walk(p, acc);
    } else if (st.isFile()) {
      if (name.endsWith(".map")) continue;
      if (name === "package-lock.json") continue;
      acc.push({ path: relative(mpRoot, p), bytes: st.size });
    }
  }
}

function sum(files) {
  return files.reduce((s, f) => s + f.bytes, 0);
}

function mb(n) {
  return (n / 1024 / 1024).toFixed(2);
}

const all = [];
walk(mpRoot, all);

const mainFiles = all.filter((f) => !f.path.startsWith("packageTrain" + "/") && !f.path.startsWith("packageTrain\\"));
const trainFiles = all.filter((f) => f.path.startsWith("packageTrain" + "/") || f.path.startsWith("packageTrain\\"));

const mainBytes = sum(mainFiles);
const trainBytes = sum(trainFiles);

const MAIN_LIMIT = 2 * 1024 * 1024;
const SUB_LIMIT = 2 * 1024 * 1024; // 微信单分包源码硬顶（合计仍可至 20MB）

console.log("VT-P5-007 pack size estimate (ignored: node_modules/models/vendor/local_modules/scripts)");
console.log(`main package: ${mb(mainBytes)} MB (${mainBytes} bytes) — limit 2 MB`);
console.log(`packageTrain: ${mb(trainBytes)} MB (${trainBytes} bytes) — limit 2 MB (per subpackage)`);

const topMain = [...mainFiles].sort((a, b) => b.bytes - a.bytes).slice(0, 8);
console.log("top main files:");
for (const f of topMain) {
  console.log(`  ${mb(f.bytes)} MB  ${f.path}`);
}
const topTrain = [...trainFiles].sort((a, b) => b.bytes - a.bytes).slice(0, 8);
console.log("top train files:");
for (const f of topTrain) {
  console.log(`  ${mb(f.bytes)} MB  ${f.path}`);
}

let failed = false;
if (mainBytes > MAIN_LIMIT) {
  console.error(`FAIL: main package ${mb(mainBytes)} MB > 2 MB`);
  failed = true;
} else {
  console.log("OK: main package under 2 MB");
}
if (trainBytes > SUB_LIMIT) {
  console.error(`FAIL: packageTrain ${mb(trainBytes)} MB > 2 MB (WeChat subpackage cap)`);
  failed = true;
} else {
  console.log("OK: packageTrain under 2 MB (no CPU backend; MoveNet weights runtime-downloaded)");
}

if (failed) process.exit(1);
