#!/usr/bin/env node
/**
 * M5-T4：workspace 包打进「训练分包」packageTrain（NFR-007）。
 * 主包不再承载 TFJS / pose-mp。
 */
import * as esbuild from "esbuild";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mpRoot = join(__dirname, "..");
const repoRoot = join(mpRoot, "../..");
const trainRoot = join(mpRoot, "packageTrain");
const localRoot = join(mpRoot, "local_modules");

function writePkgJson(dir, name, version) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version,
        main: "index.js",
        miniprogram: ".",
      },
      null,
      2,
    ) + "\n",
  );
}

function mirrorToTrainNpm(localDir, scopeName) {
  const dest = join(trainRoot, "miniprogram_npm", scopeName);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(localDir, dest, { recursive: true });
  console.log(`mirrored → packageTrain/miniprogram_npm/${scopeName}`);
}

function linkIntoTrainNodeModules(name) {
  const scopeDir = join(trainRoot, "node_modules/@fitness-coach");
  mkdirSync(scopeDir, { recursive: true });
  const linkPath = join(scopeDir, name);
  rmSync(linkPath, { recursive: true, force: true });
  try {
    symlinkSync(join("../../../local_modules", name), linkPath);
    console.log(`linked packageTrain/node_modules/@fitness-coach/${name}`);
  } catch {
    cpSync(join(localRoot, name), linkPath, { recursive: true });
    console.log(`copied packageTrain/node_modules/@fitness-coach/${name}`);
  }
}

async function bundleCore() {
  const localDir = join(localRoot, "core");
  rmSync(localDir, { recursive: true, force: true });
  mkdirSync(localDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(repoRoot, "packages/core/src/index.ts")],
    bundle: true,
    platform: "neutral",
    format: "cjs",
    outfile: join(localDir, "index.js"),
    target: ["es2018"],
    logLevel: "warning",
    mainFields: ["module", "main"],
  });
  writePkgJson(localDir, "@fitness-coach/core", "0.0.0");
  mirrorToTrainNpm(localDir, "@fitness-coach/core");
  linkIntoTrainNodeModules("core");
  console.log(`bundled @fitness-coach/core → ${localDir}`);
}

async function bundlePoseMp() {
  const localDir = join(localRoot, "pose-mp");
  rmSync(localDir, { recursive: true, force: true });
  mkdirSync(localDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(repoRoot, "packages/pose-mp/src/index.ts")],
    bundle: true,
    platform: "neutral",
    format: "cjs",
    outfile: join(localDir, "api.js"),
    target: ["es2018"],
    external: ["@fitness-coach/core"],
    logLevel: "warning",
    mainFields: ["module", "main"],
  });

  copyFileSync(
    join(repoRoot, "packages/pose-mp/wechat/movenetRuntime.cjs"),
    join(localDir, "movenetRuntime.js"),
  );

  writeFileSync(
    join(localDir, "index.js"),
    [
      '"use strict";',
      'var api = require("./api.js");',
      'var runtime = require("./movenetRuntime.js");',
      "module.exports = Object.assign({}, api, runtime);",
      "",
    ].join("\n"),
  );

  writePkgJson(localDir, "@fitness-coach/pose-mp", "0.1.0");
  mirrorToTrainNpm(localDir, "@fitness-coach/pose-mp");
  linkIntoTrainNodeModules("pose-mp");
  console.log(`bundled @fitness-coach/pose-mp → ${localDir}`);
}

async function bundleRender() {
  const localDir = join(localRoot, "render");
  rmSync(localDir, { recursive: true, force: true });
  mkdirSync(localDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(repoRoot, "packages/render/src/index.ts")],
    bundle: true,
    platform: "neutral",
    format: "cjs",
    outfile: join(localDir, "index.js"),
    target: ["es2018"],
    external: ["@fitness-coach/core"],
    logLevel: "warning",
    mainFields: ["module", "main"],
  });

  writePkgJson(localDir, "@fitness-coach/render", "0.0.0");
  mirrorToTrainNpm(localDir, "@fitness-coach/render");
  linkIntoTrainNodeModules("render");
  console.log(`bundled @fitness-coach/render → ${localDir}`);
}

await bundleCore();
await bundlePoseMp();
await bundleRender();
console.log(
  "packages ready under packageTrain/. 主包不含 TFJS。接着在开发者工具对 packageTrain 构建 npm + sync-shims。",
);
