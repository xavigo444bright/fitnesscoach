/**
 * @fitness-coach/core — Rep 计数（M1-T6，VT-P1-005）
 *
 * 一个 rep = stand → descend → bottom → ascend → 回 stand。
 * 未进入 bottom 的周期不结算计入；回站时给出 rejected/shallow。
 * bottom 阶段触发 depthRuleId（深蹲 squat-depth / 俯卧撑 elbow-depth）则 counted=false。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  LATERAL_RAISE_MIN_ROM_DEG,
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
    holdAccumMs: 0,
    holdAnchorMs: null,
    cycleDriveMin: null,
    cycleDriveMax: null,
  };
}

/**
 * 丢掉未完成周期：相位回到 stand，不结算 counted/rejected。
 * 已计入的 count/reps 保留。用于「已经不像当前动作」时（FR-090）。
 */
export function abortOpenRepCycle(state: RepCounterState): RepCounterState {
  return {
    ...state,
    phaseState: initialPhaseState(),
    lastOutcome: null,
    depthFaultThisCycle: false,
    holdAccumMs: 0,
    holdAnchorMs: null,
    cycleDriveMin: null,
    cycleDriveMax: null,
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
  /** messageForRepReject 文案族 */
  exerciseId?:
    | "squat"
    | "pushup"
    | "glute-bridge"
    | "lunge"
    | "plank"
    | "db-row"
    | "ohp"
    | "bench-press"
    | "rdl"
    | "pullup"
    | "db-fly"
    | "dip"
    | "incline-pushup"
    | "cable-crossover"
    | "chest-press-machine"
    | "lateral-raise"
    | "front-raise"
    | "rear-delt-fly"
    | "face-pull"
    | "pike-pushup";
  /** 默认 rep；平板用 hold_second（撑稳每满 1s +1）。 */
  countMode?: "rep" | "hold_second";
  /** hold_second 用的墙钟；缺省按 50ms/帧。 */
  nowMs?: number;
  /** 单次周期驱动角峰谷差下限；侧平举默认 LATERAL_RAISE_MIN_ROM_DEG。 */
  minRomDeg?: number;
}

/**
 * 推进一帧：更新相位；在 bottom 阶段记录是否深度不足；
 * 当相位回到 stand 时结算（完整周期）或提示半程未计入。
 * 离开 bottom 的确认帧相位仍是 bottom，但姿态已是回落/贴地；
 * 那些帧不再用 depthRule 误杀（臀桥 v0.2.1 真机完整顶髋不计次）。
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
  const drive = angleFn(pose);
  const minRomDeg =
    opts.minRomDeg ??
    (opts.exerciseId === "lateral-raise" ? LATERAL_RAISE_MIN_ROM_DEG : undefined);

  const prevPhase = state.phaseState.phase;
  const { state: phaseState } = stepPhaseWithAngle(
    state.phaseState,
    drive,
    phaseConfig,
  );
  const nowPhase = phaseState.phase;

  let depthFaultThisCycle = state.depthFaultThisCycle;
  let count = state.count;
  const reps = state.reps;
  let lastOutcome: RepCycleOutcome | null = null;
  let cycleDriveMin = state.cycleDriveMin;
  let cycleDriveMax = state.cycleDriveMax;

  if (drive != null) {
    if (prevPhase === "stand" && nowPhase === "stand") {
      cycleDriveMin = drive;
      cycleDriveMax = drive;
    } else {
      cycleDriveMin =
        cycleDriveMin == null ? drive : Math.min(cycleDriveMin, drive);
      cycleDriveMax =
        cycleDriveMax == null ? drive : Math.max(cycleDriveMax, drive);
    }
  }

  // 离开 stand 进入下蹲/底部：开启新周期
  if (
    prevPhase === "stand" &&
    (nowPhase === "descend" || nowPhase === "bottom")
  ) {
    depthFaultThisCycle = false;
  }

  if (nowPhase === "bottom" && phaseState.pendingPhase !== "stand") {
    const res = validate(pose, "bottom", rules);
    if (res.results.some((r) => r.id === depthRuleId && r.triggered)) {
      depthFaultThisCycle = true;
    }
  }

  if (opts.countMode === "hold_second") {
    const holding = nowPhase === "bottom" && !depthFaultThisCycle;
    const t =
      opts.nowMs ??
      (state.holdAnchorMs != null ? state.holdAnchorMs + 50 : 0);
    let holdAccumMs = state.holdAccumMs;
    let holdAnchorMs = state.holdAnchorMs;
    if (holding) {
      if (holdAnchorMs != null && t >= holdAnchorMs) {
        holdAccumMs += t - holdAnchorMs;
      }
      holdAnchorMs = t;
      while (holdAccumMs >= 1000) {
        holdAccumMs -= 1000;
        count += 1;
        reps.push({ index: reps.length, counted: true });
        lastOutcome = { type: "counted" };
      }
    } else if (nowPhase === "bottom") {
      holdAnchorMs = null;
    } else {
      holdAnchorMs = null;
      holdAccumMs = 0;
    }
    return {
      count,
      reps,
      phaseState,
      depthFaultThisCycle,
      lastOutcome,
      holdAccumMs,
      holdAnchorMs,
      cycleDriveMin,
      cycleDriveMax,
    };
  }

  if (
    nowPhase === "stand" &&
    (prevPhase === "ascend" || prevPhase === "bottom")
  ) {
    let counted = !depthFaultThisCycle;
    if (
      counted &&
      minRomDeg != null &&
      cycleDriveMin != null &&
      cycleDriveMax != null &&
      cycleDriveMax - cycleDriveMin < minRomDeg
    ) {
      counted = false;
    }
    if (counted) count += 1;
    reps.push({ index: reps.length, counted });
    lastOutcome = counted
      ? { type: "counted" }
      : {
          type: "rejected",
          reason: depthFaultThisCycle ? "depth_fault" : "shallow",
        };
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
    holdAccumMs: 0,
    holdAnchorMs: null,
    cycleDriveMin,
    cycleDriveMax,
  };
}

/** 跑完整序列，返回最终计数状态。 */
export function countReps(
  poses: Pose[],
  opts: RepCounterOptions = {},
): RepCounterState {
  let state = initialRepCounterState();
  if (opts.countMode === "hold_second") {
    let t = 0;
    for (const pose of poses) {
      state = stepRep(state, pose, { ...opts, nowMs: t });
      t += 50;
    }
    return state;
  }
  for (const pose of poses) {
    state = stepRep(state, pose, opts);
  }
  return state;
}

/** 半程/深度不足时的 UI 文案。 */
export function messageForRepReject(
  reason: "shallow" | "depth_fault",
  exerciseId:
    | "squat"
    | "pushup"
    | "glute-bridge"
    | "lunge"
    | "plank"
    | "db-row"
    | "ohp"
    | "bench-press"
    | "rdl"
    | "pullup"
    | "db-fly"
    | "dip"
    | "incline-pushup"
    | "cable-crossover"
    | "chest-press-machine"
    | "lateral-raise"
    | "front-raise"
    | "rear-delt-fly"
    | "face-pull"
    | "pike-pushup" = "squat",
): string {
  if (exerciseId === "pushup") {
    if (reason === "shallow") return "降得不够低，未计入次数";
    return "手臂未弯到位，胸口再靠近地面";
  }
  if (exerciseId === "glute-bridge") {
    if (reason === "shallow") return "髋没顶够，未计入次数";
    return "髋没顶够，推到肩膝一线并收臀";
  }
  if (exerciseId === "lunge") {
    if (reason === "shallow") return "蹲得不够深，未计入次数";
    return "蹲得不够深，前膝再弯一些";
  }
  if (exerciseId === "plank") {
    if (reason === "shallow") return "身体没撑直，未计入秒数";
    return "撅臀了，把腰放平";
  }
  if (exerciseId === "db-row") {
    if (reason === "shallow") return "拉得不够高，未计入次数";
    return "拉得不够高，肘再往髋后收";
  }
  if (exerciseId === "ohp") {
    if (reason === "shallow") return "没推直，未计入次数";
    return "腰过度后仰，收紧核心再推";
  }
  if (exerciseId === "bench-press") {
    if (reason === "shallow") return "没放到胸口，未计入次数";
    return "杠没落到胸口，再下放一些";
  }
  if (exerciseId === "rdl") {
    if (reason === "shallow") return "铰链不够深，未计入次数";
    return "铰链不够深，臀部再往后坐";
  }
  if (exerciseId === "pullup") {
    if (reason === "shallow") return "拉得不够高，未计入次数";
    return "拉得不够高，下巴再过杆";
  }
  if (exerciseId === "db-fly") {
    if (reason === "shallow") return "打开不够深，未计入次数";
    return "打开不够深，手臂再打开一些";
  }
  if (exerciseId === "dip") {
    if (reason === "shallow") return "降得不够低，未计入次数";
    return "降得不够低，肩再往下沉一些";
  }
  if (exerciseId === "incline-pushup") {
    if (reason === "shallow") return "降得不够低，未计入次数";
    return "胸口再靠近支撑面";
  }
  if (exerciseId === "cable-crossover") {
    if (reason === "shallow") return "打开不够开，未计入次数";
    return "打开不够开，手臂再向两侧打开";
  }
  if (exerciseId === "chest-press-machine") {
    if (reason === "shallow") return "收得不够近，未计入次数";
    return "没收到胸口，再收回一些";
  }
  if (exerciseId === "lateral-raise" || exerciseId === "front-raise") {
    if (reason === "shallow") return "抬得不够高，未计入次数";
    return "再抬高一些，到大约肩的高度";
  }
  if (exerciseId === "rear-delt-fly") {
    if (reason === "shallow") return "打开不够开，未计入次数";
    return "打开不够开，手臂再向两侧打开";
  }
  if (exerciseId === "face-pull") {
    if (reason === "shallow") return "拉得不够近，未计入次数";
    return "再拉向面部一些";
  }
  if (exerciseId === "pike-pushup") {
    if (reason === "shallow") return "降得不够低，未计入次数";
    return "头再靠近地面一些";
  }
  if (reason === "shallow") return "蹲得不够深，未计入次数";
  return "蹲得不够深，臀部再下沉一些";
}
