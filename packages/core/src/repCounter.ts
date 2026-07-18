/**
 * @fitness-coach/core — Rep 计数（M1-T6，VT-P1-005）
 *
 * 一个 rep = stand → descend → bottom → ascend → 回 stand。
 * 若该次 bottom 阶段触发 squat-depth（未达深度），该 rep 不计入（见 squat-rules.md）。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  initialPhaseState,
  stepPhase,
  type PhaseConfig,
} from "./phase.js";
import { SQUAT_RULES, validate, type EvaluableRule } from "./validate.js";
import type { Pose, RepCounterState } from "./types.js";

export function initialRepCounterState(): RepCounterState {
  return {
    count: 0,
    reps: [],
    phaseState: initialPhaseState(),
    depthFaultThisCycle: false,
  };
}

export interface RepCounterOptions {
  phaseConfig?: PhaseConfig;
  rules?: EvaluableRule[];
}

/**
 * 推进一帧：更新相位；在 bottom 阶段记录是否深度不足；
 * 当相位回到 stand（完成一次 down-up 周期）时结算一次 rep。
 */
export function stepRep(
  state: RepCounterState,
  pose: Pose,
  opts: RepCounterOptions = {},
): RepCounterState {
  const phaseConfig = opts.phaseConfig ?? DEFAULT_SQUAT_PHASE_CONFIG;
  const rules = opts.rules ?? SQUAT_RULES;

  const prevPhase = state.phaseState.phase;
  const { state: phaseState } = stepPhase(state.phaseState, pose, phaseConfig);
  const nowPhase = phaseState.phase;

  let depthFaultThisCycle = state.depthFaultThisCycle;
  let count = state.count;
  const reps = state.reps;

  // 离开 stand 进入下蹲：开启新周期
  if (prevPhase === "stand" && nowPhase === "descend") {
    depthFaultThisCycle = false;
  }

  // 处于 bottom：检查是否深度不足
  if (nowPhase === "bottom") {
    const res = validate(pose, "bottom", rules);
    if (res.results.some((r) => r.id === "squat-depth" && r.triggered)) {
      depthFaultThisCycle = true;
    }
  }

  // 回到 stand 且本周期确实经过 bottom：结算一次 rep
  if (nowPhase === "stand" && prevPhase === "ascend") {
    const counted = !depthFaultThisCycle;
    if (counted) count += 1;
    reps.push({ index: reps.length, counted });
    depthFaultThisCycle = false;
  }

  return {
    count,
    reps,
    phaseState,
    depthFaultThisCycle,
  };
}

/** 跑完整序列，返回最终计数状态。 */
export function countReps(
  poses: Pose[],
  opts: RepCounterOptions = {},
): RepCounterState {
  let state = initialRepCounterState();
  for (const pose of poses) {
    state = stepRep(state, pose, opts);
  }
  return state;
}
