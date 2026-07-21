/**
 * @fitness-coach/core — Rep 计数（M1-T6，VT-P1-005）
 *
 * 一个 rep = stand → descend → bottom → ascend → 回 stand。
 * 未进入 bottom（半蹲）的周期不结算计入；回站时给出 rejected/shallow 供 UI 提示。
 * 若 bottom 阶段触发 squat-depth 则 counted=false（rejected/depth_fault）。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  initialPhaseState,
  stepPhase,
  type PhaseConfig,
} from "./phase.js";
import { SQUAT_RULES, validate, type EvaluableRule } from "./validate.js";
import type { Pose, RepCounterState, RepCycleOutcome } from "./types.js";

export function initialRepCounterState(): RepCounterState {
  return {
    count: 0,
    reps: [],
    phaseState: initialPhaseState(),
    depthFaultThisCycle: false,
    lastOutcome: null,
  };
}

export interface RepCounterOptions {
  phaseConfig?: PhaseConfig;
  rules?: EvaluableRule[];
}

/**
 * 推进一帧：更新相位；在 bottom 阶段记录是否深度不足；
 * 当相位回到 stand 时结算（完整周期）或提示半蹲未计入。
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
  let lastOutcome: RepCycleOutcome | null = null;

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

  // 完整周期：ascend → stand
  if (nowPhase === "stand" && prevPhase === "ascend") {
    const counted = !depthFaultThisCycle;
    if (counted) count += 1;
    reps.push({ index: reps.length, counted });
    lastOutcome = counted
      ? { type: "counted" }
      : { type: "rejected", reason: "depth_fault" };
    depthFaultThisCycle = false;
  }

  // 半蹲：descend → stand（未进 bottom / ascend）
  if (nowPhase === "stand" && prevPhase === "descend") {
    lastOutcome = { type: "rejected", reason: "shallow" };
    depthFaultThisCycle = false;
  }

  return {
    count,
    reps,
    phaseState,
    depthFaultThisCycle,
    lastOutcome,
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

/** 半蹲/深度不足时的 UI 文案（与 squat-depth 对齐）。 */
export function messageForRepReject(
  reason: "shallow" | "depth_fault",
): string {
  if (reason === "shallow") return "蹲得不够深，未计入次数";
  return "蹲得不够深，臀部再下沉一些";
}
