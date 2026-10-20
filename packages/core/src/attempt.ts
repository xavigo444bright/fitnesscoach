/**
 * 一次尝试：同一具身体离开起始、到过完成、再回到起始。
 * 加次发生在回到起始的那一帧。没到完成就回来只出指导。
 * 空帧超过半秒，这次尝试作废，不加次也不提示。
 * 日志 C07-01、C07-02、C07-03、C08-01，见 docs/count-change-log.md。
 */

import type { Phase, RepCycleOutcome, RepCounterState, RepEvent } from "./types.js";

/** 完成要连续这么多帧，单帧抖动不算到过。 */
export const ATTEMPT_FINISH_HOLD = 3;
/** 离开起始也要连续几帧，避免站立噪声开一次尝试。 */
export const ATTEMPT_LEAVE_HOLD = 3;
/** 回到起始连续这么多帧才结算。 */
export const ATTEMPT_RETURN_HOLD = 2;
/** 空帧超过这时长，尝试作废。 */
export const ATTEMPT_GAP_MS = 500;

export interface AttemptObs {
  /** 0 靠近起始，1 是完成线，可以更大。 */
  progress: number;
  atStart: boolean;
  atFinish: boolean;
  /** 走出至少这么远又没到完成，才提示。再小的晃动不说话。 */
  shortTravel: number;
  /**
   * 行程已经到位时，计次规则是否接受这一次。
   * 缺省接受。俯身飞鸟这类：引擎只看开合角，方向不对则不加次。
   */
  counts?: boolean;
}

export interface AttemptState {
  status: "idle" | "outbound" | "reached";
  travel: number;
  finishHold: number;
  leaveHold: number;
  returnHold: number;
  gapMs: number;
  lastT: number | null;
  count: number;
  reps: RepEvent[];
  lastOutcome: RepCycleOutcome | null;
  phase: Phase;
  lastProgress: number;
  /** 确认到位的那一帧，计次规则是否接受。 */
  finishCounts: boolean;
}

export function initialAttemptState(): AttemptState {
  return {
    status: "idle",
    travel: 0,
    finishHold: 0,
    leaveHold: 0,
    returnHold: 0,
    gapMs: 0,
    lastT: null,
    count: 0,
    reps: [],
    lastOutcome: null,
    phase: "stand",
    lastProgress: 0,
    finishCounts: true,
  };
}

function phaseOf(state: AttemptState, progress: number): Phase {
  if (state.status === "idle") return "stand";
  if (state.status === "outbound") return "descend";
  if (progress < state.lastProgress - 0.02) return "ascend";
  return "bottom";
}

function abort(state: AttemptState): AttemptState {
  return {
    ...state,
    status: "idle",
    travel: 0,
    finishHold: 0,
    leaveHold: 0,
    returnHold: 0,
    gapMs: 0,
    lastOutcome: null,
    phase: "stand",
    lastProgress: 0,
    finishCounts: true,
  };
}

export function stepAttempt(
  state: AttemptState,
  input: { t: number; obs: AttemptObs | null; abort?: boolean },
): AttemptState {
  if (input.abort) {
    return { ...abort(state), lastT: input.t };
  }
  if (input.obs == null) {
    const gap =
      state.lastT == null ? ATTEMPT_GAP_MS : state.gapMs + (input.t - state.lastT);
    const next = { ...state, gapMs: gap, lastT: input.t, lastOutcome: null };
    if (gap >= ATTEMPT_GAP_MS) return abort(next);
    return next;
  }

  const obs = input.obs;
  let next: AttemptState = {
    ...state,
    gapMs: 0,
    lastT: input.t,
    lastOutcome: null,
    lastProgress: obs.progress,
  };

  if (next.status === "idle") {
    if (!obs.atStart) {
      next.leaveHold += 1;
      if (next.leaveHold >= ATTEMPT_LEAVE_HOLD) {
        next.status = "outbound";
        next.travel = obs.progress;
        next.leaveHold = 0;
        next.finishHold = obs.atFinish ? 1 : 0;
      }
    } else {
      next.leaveHold = 0;
    }
    next.phase = "stand";
    return next;
  }

  if (obs.atFinish) {
    next.finishHold += 1;
    if (
      next.finishHold >= ATTEMPT_FINISH_HOLD &&
      next.status !== "reached"
    ) {
      next.status = "reached";
      next.finishCounts = obs.counts !== false;
    }
  } else {
    next.finishHold = 0;
  }

  if (obs.progress >= next.travel) {
    next.travel = obs.progress;
  }

  const returning = obs.atStart && !obs.atFinish;
  if (returning) next.returnHold += 1;
  else next.returnHold = 0;

  if (next.returnHold >= ATTEMPT_RETURN_HOLD) {
    if (next.status === "reached" && next.finishCounts) {
      next.count += 1;
      next.reps = [...next.reps, { index: next.reps.length, counted: true }];
      next.lastOutcome = { type: "counted" };
    } else if (
      (next.status === "reached" && !next.finishCounts) ||
      next.travel >= obs.shortTravel
    ) {
      next.reps = [...next.reps, { index: next.reps.length, counted: false }];
      next.lastOutcome = { type: "short" };
    }
    next.status = "idle";
    next.travel = 0;
    next.finishHold = 0;
    next.leaveHold = 0;
    next.returnHold = 0;
    next.phase = "stand";
    next.finishCounts = true;
    return next;
  }

  next.phase = phaseOf(next, obs.progress);
  return next;
}

/** 写回训练页已经在用的计数状态。 */
export function repStateFromAttempt(
  prev: RepCounterState,
  attempt: AttemptState,
): RepCounterState {
  return {
    ...prev,
    count: attempt.count,
    reps: attempt.reps,
    phaseState: {
      phase: attempt.phase,
      pendingPhase: null,
      pendingFrames: 0,
    },
    depthFaultThisCycle: false,
    lastOutcome: attempt.lastOutcome,
    holdAccumMs: 0,
    holdAnchorMs: null,
    cycleDriveMin: null,
    cycleDriveMax: null,
  };
}
