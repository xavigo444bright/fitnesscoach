#!/usr/bin/env node
/**
 * 冒烟：训练分包 miniprogram_npm 内 core / pose-mp / render 可加载。
 */
import { createRequire } from "node:module";
import Module from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const mpRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const trainNpm = join(mpRoot, "packageTrain/miniprogram_npm");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (
    typeof request === "string" &&
    request.startsWith("@fitness-coach/")
  ) {
    const candidate = join(trainNpm, request, "index.js");
    try {
      return origResolve.call(this, candidate, parent, isMain, options);
    } catch {
      // fall through
    }
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const require = createRequire(import.meta.url);

const core = require("@fitness-coach/core");
const poseMp = require("@fitness-coach/pose-mp");
const render = require("@fitness-coach/render");

if (!core.CORE_VERSION) throw new Error("core missing");
if (!poseMp.POSE_MP_VERSION) throw new Error("pose-mp missing");
if (!render.RENDER_VERSION) throw new Error("render missing");
if (typeof render.stepWiredFeedback !== "function") {
  throw new Error("render missing stepWiredFeedback");
}

console.log("packageTrain npm smoke OK:", {
  CORE_VERSION: core.CORE_VERSION,
  POSE_MP_VERSION: poseMp.POSE_MP_VERSION,
  RENDER_VERSION: render.RENDER_VERSION,
  PREPROCESS_VERSION: poseMp.PREPROCESS_VERSION,
});
