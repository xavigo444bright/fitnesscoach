/**
 * @fitness-coach/core — Rep 计数（M1-T6，VT-P1-005）
 *
 * 一个 rep = stand → descend → bottom → ascend → 回 stand。
 * 未进入 bottom 的周期不结算计入；回站时给出 rejected/shallow。
 * bottom 阶段触发 depthRuleId（深蹲 squat-depth / 俯卧撑 elbow-depth）则 counted=false。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  initialPhaseState,
  squatKneeAngle,
  stepPhaseWithAngle,
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

export type AngleFn = (pose: Pose) => number | null;

export interface RepCounterOptions {
  phaseConfig?: PhaseConfig;
  rules?: EvaluableRule[];
  /** 相位驱动角；默认深蹲膝角。 */
  angleFn?: AngleFn;
  /** bottom 阶段导致「深度不足不计次」的规则 ID。 */
  depthRuleId?: string;
  /** messageForRepReject 文案族：squat | pushup */
  exerciseId?: "squat" | "pushup";
}

/**
 * 推进一帧：更新相位；在 bottom 阶段记录是否深度不足；
 * 当相位回到 stand 时结算（完整周期）或提示半程未计入。
 */
export function stepRep(
  state: RepCounterState,
  pose: Pose,
  opts: RepCounterOptions = {},
): RepCounterState {
  const phaseConfig = opts.phaseConfig ?? DEFAULT_SQUAT_PHASE_CONFIG;
  const rules = opts.rules ?? SQUAT_RULES;
  const angleFn = opts.angleFn ?? squatKneeAngle;
  const depthRuleId = opts.depthRuleId ?? "squat-depth";

  const prevPhase = state.phaseState.phase;
  const { state: phaseState } = stepPhaseWithAngle(
    state.phaseState,
    angleFn(pose),
    phaseConfig,
  );
  const nowPhase = phaseState.phase;

  let depthFaultThisCycle = state.depthFaultThisCycle;
  let count = state.count;
  const reps = state.reps;
  let lastOutcome: RepCycleOutcome | null = null;

  // 离开 stand 进入下蹲/底部：开启新周期
  if (
    prevPhase === "stand" &&
    (nowPhase === "descend" || nowPhase === "bottom")
  ) {
    depthFaultThisCycle = false;
  }

  if (nowPhase === "bottom") {
    const res = validate(pose, "bottom", rules);
    if (res.results.some((r) => r.id === depthRuleId && r.triggered)) {
      depthFaultThisCycle = true;
    }
  }

  if (
    nowPhase === "stand" &&
    (prevPhase === "ascend" || prevPhase === "bottom")
  ) {
    const counted = !depthFaultThisCycle;
    if (counted) count += 1;
    reps.push({ index: reps.length, counted });
    lastOutcome = counted
      ? { type: "counted" }
      : { type: "rejected", reason: "depth_fault" };
    depthFaultThisCycle = false;
  }

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

/** 半程/深度不足时的 UI 文案。 */
export function messageForRepReject(
  reason: "shallow" | "depth_fault",
  exerciseId: "squat" | "pushup" = "squat",
): string {
  if (exerciseId === "pushup") {
    if (reason === "shallow") return "降得不够低，未计入次数";
    return "手臂未弯到位，胸口再靠近地面";
  }
  if (reason === "shallow") return "蹲得不够深，未计入次数";
  return "蹲得不够深，臀部再下沉一些";
}
