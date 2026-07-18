/**
 * @fitness-coach/core — 深蹲动作定义（M1-T7，VT-P1-006）
 *
 * 规则真源：docs/exercises/squat-rules.md。契约测试比对二者一致。
 * 规则的评估逻辑复用 validate.ts 的 SQUAT_RULES（避免两处实现漂移）。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
} from "../phase.js";
import { SQUAT_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const SQUAT: ExerciseDefinition = {
  id: "squat",
  name: "深蹲",
  cameraHint: "side",
  rules: SQUAT_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_SQUAT_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_SQUAT_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_SQUAT_PHASE_CONFIG.confirmFrames,
  },
};
