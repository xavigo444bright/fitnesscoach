/**
 * 周期计次：在最近几秒的可见轨迹里找变化最大的一条一维信号，数完整来回。
 * 幅度用本人已经完成的次数，不写死角度。静力计时仍走 stepRep。
 * 日志 C06-03。六个尝试动作已改走 attempt.ts（C07-01），见 docs/count-change-log.md。
 */

import { jointAngle } from "./angles.js";
import { landmarkReliable } from "./landmarks.js";
import {
  LandmarkIndex,
  type JointTriplet,
  type Phase,
  type Pose,
  type RepCounterState,
  type RepCycleOutcome,
  type RepEvent,
} from "./types.js";

const WINDOW_MS = 3000;
const KEEP_MS = 4000;
const GAP_MS = 500;
const MIN_INTERVAL_MS = 400;
const MIN_SAMPLES = 8;
/** 确认拐头：要从极值回撤这么多（相对个人幅度）。 */
const RETRACE_RATIO = 0.28;
/** 完成一次：这一来回至少要到个人幅度的这个比例。 */
const AMP_RATIO = 0.5;
const SIGNAL_VIS = 0.35;

type Trend = "seek" | "rising" | "falling";
type ExtremeKind = "peak" | "valley";

interface Frame {
  t: number;
  values: Record<string, number>;
}

export interface CycleSignal {
  key: string;
  v: number | null;
}

export interface CycleCounterState {
  count: number;
  reps: RepEvent[];
  lastOutcome: RepCycleOutcome | null;
  phase: Phase;
  frames: Frame[];
  lockedKey: string | null;
  trend: Trend;
  anchor: number | null;
  prevKind: ExtremeKind | null;
  prevExtreme: number | null;
  lastCountT: number | null;
  amplitudes: number[];
  lastSampleT: number | null;
  /**
   * 这一趟里终点出现过。侧平举的终点是手到肩，不是幅度比例。
   * 其它动作不传 finishReached，此标记不参与计次。
   */
  finishSeen: boolean;
}

export function initialCycleCounterState(): CycleCounterState {
  return {
    count: 0,
    reps: [],
    lastOutcome: null,
    phase: "stand",
    frames: [],
    lockedKey: null,
    trend: "seek",
    anchor: null,
    prevKind: null,
    prevExtreme: null,
    lastCountT: null,
    amplitudes: [],
    lastSampleT: null,
    finishSeen: false,
  };
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** 偏离匀速的程度。平滑的来回很小，帧间乱跳接近幅度本身。 */
function roughness(xs: readonly number[]): number {
  if (xs.length < 3) return 0;
  const deltas: number[] = [];
  for (let i = 2; i < xs.length; i += 1) {
    const expected = xs[i - 1]! + (xs[i - 1]! - xs[i - 2]!);
    deltas.push(Math.abs(xs[i]! - expected));
  }
  return median(deltas);
}

/** 幅度 / 不平滑程度。度数和归一化位移可以放在一起比。 */
function prominence(xs: readonly number[]): number {
  if (xs.length < 4) return 0;
  const range = Math.max(...xs) - Math.min(...xs);
  return range / Math.max(roughness(xs), 1e-4);
}

function seriesOf(frames: readonly Frame[], key: string): number[] {
  const xs: number[] = [];
  for (const frame of frames) {
    const v = frame.values[key];
    if (v != null) xs.push(v);
  }
  return xs;
}

function selectKey(
  frames: readonly Frame[],
  locked: string | null,
  trend: Trend,
): string | null {
  const counts = new Map<string, number>();
  for (const frame of frames) {
    for (const key of Object.keys(frame.values)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const need = Math.min(MIN_SAMPLES, Math.ceil(frames.length * 0.6));
  let best: string | null = null;
  let bestScore = 0;
  for (const [key, n] of counts) {
    if (n < need) continue;
    const score = prominence(seriesOf(frames, key));
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  if (!locked) return best;
  const lockedN = counts.get(locked) ?? 0;
  const lockedStillThere = lockedN >= Math.max(need, Math.ceil(frames.length * 0.4));
  if (trend !== "seek" && lockedStillThere) return locked;
  if (!best || best === locked) return lockedStillThere ? locked : best;
  const lockedScore = prominence(seriesOf(frames, locked));
  if (!lockedStillThere || bestScore > lockedScore * 1.6) return best;
  return locked;
}

function pushCap(xs: readonly number[], value: number, cap: number): number[] {
  const next = xs.length >= cap ? xs.slice(xs.length - cap + 1) : [...xs];
  next.push(value);
  return next;
}

function phaseOf(
  trend: Trend,
  v: number | null,
  series: readonly number[],
  levels?: { standAbove: number; bottomBelow: number },
): Phase {
  if (v == null || trend === "seek") return "stand";
  if (levels) {
    if (v <= levels.bottomBelow) return "bottom";
    if (v >= levels.standAbove) return "stand";
    if (trend === "falling") return "descend";
    if (trend === "rising") return "ascend";
    return "stand";
  }
  if (series.length < 2) return "stand";
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo;
  if (span <= 1e-6) return "stand";
  const pos = (v - lo) / span;
  if (trend === "falling" && pos < 0.35) return "bottom";
  if (trend === "falling") return "descend";
  if (trend === "rising" && pos > 0.65) return "stand";
  if (trend === "rising") return "ascend";
  return "stand";
}

function clearSwing(state: CycleCounterState): CycleCounterState {
  return {
    ...state,
    trend: "seek",
    anchor: null,
    prevKind: null,
    prevExtreme: null,
    lockedKey: null,
    finishSeen: false,
  };
}

/**
 * 推进一帧。signals 为空表示这一帧没有可用点（出画或暂停），
 * 超过 GAP_MS 就丢掉未完成的来回，已计入的次数保留。
 */
export function stepCycleCounter(
  state: CycleCounterState,
  input: {
    t: number;
    signals: readonly CycleSignal[];
    /**
     * 这次来回的终点是否已经达到。
     * 不传：只按来回计次。传了：这一趟里至少有一帧为 true 才加次数。
     */
    finishReached?: boolean;
    /**
     * 信号低端要落到这个值以下，这次下蹲才算数。
     * 深蹲用髋离脚的比例，不用窗口里的最低点。
     */
    finishBelow?: number;
    /** 信号本身的站直 / 蹲深分界。传了就不再把窗口最低点当成 bottom。 */
    levels?: { standAbove: number; bottomBelow: number };
  },
): CycleCounterState {
  const values: Record<string, number> = {};
  for (const signal of input.signals) {
    if (signal.v != null && Number.isFinite(signal.v)) values[signal.key] = signal.v;
  }
  let frames = state.frames.filter((frame) => input.t - frame.t <= KEEP_MS);
  if (frames.length > 0 && frames[frames.length - 1]!.t === input.t) {
    frames = frames.slice(0, -1);
  }

  if (Object.keys(values).length === 0) {
    const gap =
      state.lastSampleT != null && input.t - state.lastSampleT > GAP_MS;
    const paused = gap ? clearSwing(state) : state;
    return {
      ...paused,
      frames,
      lastOutcome: null,
      finishSeen: gap ? false : state.finishSeen || input.finishReached === true,
    };
  }

  frames = [...frames, { t: input.t, values }];
  const window = frames.filter((frame) => input.t - frame.t <= WINDOW_MS);
  const gap =
    state.lastSampleT != null && input.t - state.lastSampleT > GAP_MS;
  let next: CycleCounterState = gap
    ? clearSwing({ ...state, frames, lastOutcome: null, lastSampleT: input.t })
    : { ...state, frames, lastOutcome: null, lastSampleT: input.t };

  const key = selectKey(window, next.lockedKey, next.trend);
  if (key !== next.lockedKey) {
    next = {
      ...next,
      lockedKey: key,
      trend: "seek",
      anchor: null,
      prevKind: null,
      prevExtreme: null,
    };
  }
  if (!key) {
    return { ...next, phase: "stand" };
  }
  const series = seriesOf(window, key);
  const v = values[key];
  const finishSeen = next.finishSeen || input.finishReached === true;
  if (v == null) {
    return {
      ...next,
      finishSeen,
      phase: phaseOf(next.trend, null, series, input.levels),
    };
  }
  const allowFinish = input.finishReached === undefined || finishSeen;
  return advance(
    { ...next, finishSeen },
    v,
    input.t,
    series,
    allowFinish,
    input.finishBelow,
    input.levels,
  );
}

function advance(
  state: CycleCounterState,
  v: number,
  t: number,
  series: readonly number[],
  allowFinish: boolean,
  finishBelow?: number,
  levels?: { standAbove: number; bottomBelow: number },
): CycleCounterState {
  const rough = roughness(series);
  const range = Math.max(...series) - Math.min(...series);
  const moving = series.length >= MIN_SAMPLES && range > Math.max(6 * rough, 1e-4);
  const rom = state.amplitudes.length > 0 ? median(state.amplitudes) : null;
  const retrace = !moving
    ? Number.POSITIVE_INFINITY
    : rom != null
      ? RETRACE_RATIO * rom
      : 0.3 * range;
  const ampNeed = !moving
    ? Number.POSITIVE_INFINITY
    : rom != null
      ? AMP_RATIO * rom
      : 0.45 * range;

  let trend = state.trend;
  let anchor = state.anchor;
  let prevKind = state.prevKind;
  let prevExtreme = state.prevExtreme;
  let count = state.count;
  let reps = state.reps;
  let lastOutcome: RepCycleOutcome | null = null;
  let amplitudes = state.amplitudes;
  let lastCountT = state.lastCountT;
  let finishSeen = state.finishSeen;

  if (trend === "seek" || anchor == null) {
    if (anchor == null) {
      anchor = v;
    } else if (v >= anchor + retrace) {
      trend = "rising";
      anchor = v;
    } else if (v <= anchor - retrace) {
      trend = "falling";
      anchor = v;
    }
  } else if (trend === "rising") {
    if (v >= anchor) {
      anchor = v;
    } else if (anchor - v >= retrace) {
      const swing = prevExtreme == null ? 0 : Math.abs(anchor - prevExtreme);
      const qualified = prevExtreme != null && swing >= ampNeed;
      const spaced =
        lastCountT == null || t - lastCountT >= MIN_INTERVAL_MS;
      const deepEnough =
        finishBelow == null ||
        (prevExtreme != null && prevExtreme <= finishBelow);
      if (prevKind === "valley" && qualified && spaced && deepEnough) {
        if (allowFinish) {
          count += 1;
          reps = [...reps, { index: reps.length, counted: true }];
          lastOutcome = { type: "counted" };
          amplitudes = pushCap(amplitudes, swing, 4);
          lastCountT = t;
        }
        finishSeen = false;
      }
      prevKind = "peak";
      prevExtreme = anchor;
      trend = "falling";
      anchor = v;
    }
  } else if (v <= anchor) {
    anchor = v;
  } else if (v - anchor >= retrace) {
    prevKind = "valley";
    prevExtreme = anchor;
    trend = "rising";
    anchor = v;
  }

  return {
    ...state,
    count,
    reps,
    lastOutcome,
    phase: phaseOf(trend, v, series, levels),
    trend,
    anchor,
    prevKind,
    prevExtreme,
    amplitudes,
    lastCountT,
    finishSeen,
  };
}

function torsoY(pose: Pose): number | null {
  const left = pose[LandmarkIndex.LeftShoulder];
  const right = pose[LandmarkIndex.RightShoulder];
  if (
    landmarkReliable(left, { minVis: SIGNAL_VIS }) &&
    landmarkReliable(right, { minVis: SIGNAL_VIS })
  ) {
    return (left.y + right.y) / 2;
  }
  const hipL = pose[LandmarkIndex.LeftHip];
  const hipR = pose[LandmarkIndex.RightHip];
  if (
    landmarkReliable(hipL, { minVis: SIGNAL_VIS }) &&
    landmarkReliable(hipR, { minVis: SIGNAL_VIS })
  ) {
    return (hipL.y + hipR.y) / 2;
  }
  return null;
}

/**
 * 候选信号：规则里的关节角，以及这些点相对肩（或髋）的上下位移。
 * 不在全部 33 点里找，避免头和路过的人把方向带走。
 */
/** 计次只跟这一个驱动角，不再拿画面上下位移跟它抢。 */
export function driveCycleSignals(drive: number | null): CycleSignal[] {
  if (drive == null || !Number.isFinite(drive)) return [];
  return [{ key: "drive", v: drive }];
}

export function signalsFromPose(
  pose: Pose,
  rules: readonly { joints: JointTriplet }[],
): CycleSignal[] {
  const out: CycleSignal[] = [];
  const seen = new Set<string>();
  const indices = new Set<number>();
  for (const rule of rules) {
    const { a, b, c } = rule.joints;
    indices.add(a);
    indices.add(b);
    indices.add(c);
    const key = `ang:${a}-${b}-${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ok =
      landmarkReliable(pose[a], { minVis: SIGNAL_VIS }) &&
      landmarkReliable(pose[b], { minVis: SIGNAL_VIS }) &&
      landmarkReliable(pose[c], { minVis: SIGNAL_VIS });
    out.push({
      key,
      v: ok ? jointAngle(pose, rule.joints) : null,
    });
  }
  const anchor = torsoY(pose);
  for (const index of indices) {
    const lm = pose[index];
    const ok = anchor != null && landmarkReliable(lm, { minVis: SIGNAL_VIS });
    out.push({
      key: `dy:${index}`,
      v: ok && lm ? anchor - lm.y : null,
    });
  }
  return out;
}

/** 把周期计数写回现有 RepCounterState，供训练页沿用次数和相位。 */
export function repStateFromCycle(
  prev: RepCounterState,
  cycle: CycleCounterState,
): RepCounterState {
  return {
    ...prev,
    count: cycle.count,
    reps: cycle.reps,
    phaseState: {
      phase: cycle.phase,
      pendingPhase: null,
      pendingFrames: 0,
    },
    depthFaultThisCycle: false,
    lastOutcome: cycle.lastOutcome,
    holdAccumMs: 0,
    holdAnchorMs: null,
    cycleDriveMin: null,
    cycleDriveMax: null,
  };
}
