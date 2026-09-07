/**
 * @fitness-coach/core — 杠铃卧推（FR-088 / VT-P6-011）
 * 真源：docs/exercises/bench-press-rules.md
 */

import { DEFAULT_BENCH_PRESS_PHASE_CONFIG } from "../phase.js";
import { BENCH_PRESS_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const BENCH_PRESS: ExerciseDefinition = {
  id: "bench-press",
  name: "杠铃卧推",
  cameraHint: "side",
  rules: BENCH_PRESS_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_BENCH_PRESS_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_BENCH_PRESS_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_BENCH_PRESS_PHASE_CONFIG.confirmFrames,
  },
};

export const BENCH_PRESS_DEPTH_RULE_ID = "elbow-depth";
