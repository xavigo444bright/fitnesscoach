/**
 * @fitness-coach/core — 相位状态机（M1-T5，VT-P1-004）
 *
 * 由驱动角（深蹲=膝角，俯卧撑=肘角）驱动 stand → descend → bottom → ascend → stand。
 * 相位切换需连续 confirmFrames 帧满足条件（防抖）。
 */

import { jointAngle } from "./angles.js";
import {
  LandmarkIndex,
  type Phase,
  type PhaseState,
  type Pose,
} from "./types.js";

/** 相位阈值（驱动角，度）与确认帧数。 */
export interface PhaseConfig {
  standAboveDeg: number;
  bottomBelowDeg: number;
  confirmFrames: number;
}

export const DEFAULT_SQUAT_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};

/** 俯卧撑：肘角阈值，见 pushup-rules.md。 */
export const DEFAULT_PUSHUP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 120,
  confirmFrames: 5,
};

export function initialPhaseState(): PhaseState {
  return { phase: "stand", pendingPhase: null, pendingFrames: 0 };
}

/** 取两侧膝角均值；单侧缺失用另一侧；都缺返回 null。 */
export function squatKneeAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftHip,
    b: LandmarkIndex.LeftKnee,
    c: LandmarkIndex.LeftAnkle,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightHip,
    b: LandmarkIndex.RightKnee,
    c: LandmarkIndex.RightAnkle,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

/** 取两侧肘角（肩-肘-腕）均值；俯卧撑相位驱动。 */
export function pushupElbowAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftElbow,
    c: LandmarkIndex.LeftWrist,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightElbow,
    c: LandmarkIndex.RightWrist,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

/**
 * 由当前相位 + 驱动角，给出「目标相位」（未考虑防抖）。
 * - stand：角 > standAbove
 * - bottom：角 < bottomBelow
 * - 中间区：按上一相位方向判 descend / ascend
 */
function targetPhase(current: Phase, angle: number, cfg: PhaseConfig): Phase {
  if (angle > cfg.standAboveDeg) return "stand";
  if (angle < cfg.bottomBelowDeg) return "bottom";
  // 中间过渡区：依据上一相位推断上升还是下降
  switch (current) {
    case "stand":
    case "descend":
      return "descend";
    case "bottom":
    case "ascend":
      return "ascend";
    default:
      return current;
  }
}

/**
 * 用显式驱动角推进一帧（俯卧撑肘角 / 测试注入）。
 */
export function stepPhaseWithAngle(
  state: PhaseState,
  angle: number | null,
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): { state: PhaseState; changed: boolean } {
  if (angle == null) {
    return { state: { ...state }, changed: false };
  }

  const target = targetPhase(state.phase, angle, cfg);

  // 目标即当前：清空候选
  if (target === state.phase) {
    return {
      state: { phase: state.phase, pendingPhase: null, pendingFrames: 0 },
      changed: false,
    };
  }

  // 过渡相位（descend/ascend）无需 confirmFrames，立即跟随（连续量）
  const isTransient = target === "descend" || target === "ascend";
  if (isTransient) {
    return {
      state: { phase: target, pendingPhase: null, pendingFrames: 0 },
      changed: true,
    };
  }

  // 端点相位（stand/bottom）需连续 confirmFrames 帧确认
  const pendingFrames =
    state.pendingPhase === target ? state.pendingFrames + 1 : 1;
  if (pendingFrames >= cfg.confirmFrames) {
    return {
      state: { phase: target, pendingPhase: null, pendingFrames: 0 },
      changed: true,
    };
  }
  return {
    state: {
      phase: state.phase,
      pendingPhase: target,
      pendingFrames,
    },
    changed: false,
  };
}

/**
 * 推进一帧（默认深蹲膝角）。角缺失则保持原相位。
 */
export function stepPhase(
  state: PhaseState,
  pose: Pose,
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): { state: PhaseState; changed: boolean } {
  return stepPhaseWithAngle(state, squatKneeAngle(pose), cfg);
}

/** 跑完整序列，返回相位转移序列（去重相邻重复）。 */
export function runPhaseSequence(
  poses: Pose[],
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): Phase[] {
  let state = initialPhaseState();
  const transitions: Phase[] = [state.phase];
  for (const pose of poses) {
    const res = stepPhase(state, pose, cfg);
    state = res.state;
    if (res.changed && transitions[transitions.length - 1] !== state.phase) {
      transitions.push(state.phase);
    }
  }
  return transitions;
}
