/**
 * 多人同框时选出正在做当前动作的人；重合度相对本场基线明显下降则不计次/不纠错（FR-090）。
 * 不是同时指导多人：只锁一个主体。重合度看骨骼方向与示范轨迹/Ghost 关键帧。
 * 活动门是统一相对下降，不按动作 id 分支。
 */

import { ghostKeyframesFor, type GhostExerciseId } from "./exercises/ghostKeyframes.js";
import { isCoachableId } from "./exercises/catalog.js";
import { landmarkReliable } from "./landmarks.js";
import { LandmarkIndex, type Pose } from "./types.js";
import {
  hasDemoTrajectory,
  getDemoTrajectory,
  poseFromFrame,
  sampleTrajectoryAt,
} from "./trajectory/index.js";

/** 参与重合度的骨段（躯干+四肢，不含脸/手）。 */
const OVERLAP_BONES: ReadonlyArray<readonly [number, number]> = [
  [LandmarkIndex.LeftShoulder, LandmarkIndex.LeftElbow],
  [LandmarkIndex.LeftElbow, LandmarkIndex.LeftWrist],
  [LandmarkIndex.RightShoulder, LandmarkIndex.RightElbow],
  [LandmarkIndex.RightElbow, LandmarkIndex.RightWrist],
  [LandmarkIndex.LeftShoulder, LandmarkIndex.LeftHip],
  [LandmarkIndex.RightShoulder, LandmarkIndex.RightHip],
  [LandmarkIndex.LeftHip, LandmarkIndex.LeftKnee],
  [LandmarkIndex.LeftKnee, LandmarkIndex.LeftAnkle],
  [LandmarkIndex.RightHip, LandmarkIndex.RightKnee],
  [LandmarkIndex.RightKnee, LandmarkIndex.RightAnkle],
];

const BODY_FOR_BOX = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.RightKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
] as const;

export const SUBJECT_LOCK_RADIUS = 0.18;
export const SUBJECT_SWITCH_MARGIN = 0.16;
export const SUBJECT_SWITCH_FRAMES = 5;
/** 面积只做并列时的弱权重，主信号仍是轨迹重合度。 */
export const SUBJECT_AREA_WEIGHT = 0.1;

type Vec2 = { x: number; y: number };

function mid(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): Vec2 | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

function dir(pose: Pose, from: number, to: number): Vec2 | null {
  const a = pose[from];
  const b = pose[to];
  if (!landmarkReliable(a) || !landmarkReliable(b)) return null;
  const x = b.x - a.x;
  const y = b.y - a.y;
  const len = Math.hypot(x, y);
  if (len < 1e-4) return null;
  return { x: x / len, y: y / len };
}

function flipX(pose: Pose): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    out[i] = { ...lm, x: 1 - lm.x };
  }
  return out;
}

/** 两套 Pose 骨段方向余弦平均，映射到 0–1。骨不够则 0。 */
export function poseBoneOverlap(live: Pose, template: Pose): number {
  let sum = 0;
  let n = 0;
  for (const [from, to] of OVERLAP_BONES) {
    const a = dir(live, from, to);
    const b = dir(template, from, to);
    if (!a || !b) continue;
    sum += (a.x * b.x + a.y * b.y + 1) / 2;
    n += 1;
  }
  if (n < 3) return 0;
  return sum / n;
}

export function maxTrajectoryOverlap(live: Pose, templates: readonly Pose[]): number {
  if (templates.length === 0) return 0;
  const mirrored = flipX(live);
  let best = 0;
  for (const t of templates) {
    best = Math.max(best, poseBoneOverlap(live, t), poseBoneOverlap(mirrored, t));
  }
  return best;
}

function reliableLm(pose: Pose, index: number) {
  const lm = pose[index];
  return landmarkReliable(lm) ? lm : undefined;
}

export function poseCentroid(pose: Pose): Vec2 | null {
  return (
    mid(
      reliableLm(pose, LandmarkIndex.LeftHip),
      reliableLm(pose, LandmarkIndex.RightHip),
    ) ??
    mid(
      reliableLm(pose, LandmarkIndex.LeftShoulder),
      reliableLm(pose, LandmarkIndex.RightShoulder),
    )
  );
}

export function poseArea(pose: Pose): number {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let n = 0;
  for (const i of BODY_FOR_BOX) {
    const lm = pose[i];
    if (!landmarkReliable(lm)) continue;
    n += 1;
    minX = Math.min(minX, lm.x);
    maxX = Math.max(maxX, lm.x);
    minY = Math.min(minY, lm.y);
    maxY = Math.max(maxY, lm.y);
  }
  if (n < 2) return 0;
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function asGhostId(exerciseId: string): GhostExerciseId | null {
  return isCoachableId(exerciseId) ? exerciseId : null;
}

/** Ghost 四关键帧 + 已打包示范轨迹稀疏取样。 */
export function trajectoryTemplatesFor(exerciseId: string): Pose[] {
  const id = asGhostId(exerciseId);
  if (!id) return [];
  const kf = ghostKeyframesFor(id);
  const templates: Pose[] = [kf.stand, kf.descend_mid, kf.bottom, kf.ascend_mid];
  for (const cam of ["side", "front"] as const) {
    if (!hasDemoTrajectory(id, cam)) continue;
    const traj = getDemoTrajectory(id, cam);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      templates.push(poseFromFrame(sampleTrajectoryAt(traj, t)));
    }
  }
  return templates;
}

type Scored = {
  pose: Pose;
  overlap: number;
  score: number;
  centroid: Vec2;
  area: number;
};

function scoreCandidates(candidates: Pose[], templates: readonly Pose[]): Scored[] {
  const raw = candidates
    .map((pose) => {
      const centroid = poseCentroid(pose);
      if (!centroid) return null;
      return {
        pose,
        overlap: maxTrajectoryOverlap(pose, templates),
        centroid,
        area: poseArea(pose),
        score: 0,
      };
    })
    .filter((s): s is Scored => s != null);
  const maxArea = raw.reduce((m, s) => Math.max(m, s.area), 0);
  for (const s of raw) {
    const areaN = maxArea > 0 ? s.area / maxArea : 0;
    s.score = s.overlap + SUBJECT_AREA_WEIGHT * areaN;
  }
  return raw;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 相对本场 EMA 下降超过此值 → 开始不像当前动作（软门）。 */
export const ACTIVITY_GATE_DROP = 0.16;
/** 下降达到此值 → 当帧关掉计次/纠错（起身/躺姿变站立）。 */
export const ACTIVITY_GATE_HARD_DROP = 0.25;
/** 软门连续帧数后确认离开。 */
export const ACTIVITY_GATE_SOFT_CONFIRM = 3;
/** 重合度回到基线附近后再开引擎。 */
export const ACTIVITY_GATE_REOPEN_CONFIRM = 5;
export const ACTIVITY_EMA_ALPHA = 0.12;
export const ACTIVITY_BOOTSTRAP_FRAMES = 10;

export type ActivityGateState = {
  ema: number;
  frames: number;
  latchedOff: boolean;
  pendingOff: number;
  pendingOn: number;
  /** 本帧是否允许 stepRep / validate 纠错。 */
  engineOn: boolean;
};

export function initialActivityGateState(): ActivityGateState {
  return {
    ema: 0,
    frames: 0,
    latchedOff: false,
    pendingOff: 0,
    pendingOn: 0,
    engineOn: true,
  };
}

/**
 * 统一活动门：只看重合度相对本场基线掉了多少，不按动作 id 分支。
 * EMA 只在「像当前动作」时更新，避免把起身学成新常态。
 */
export function stepActivityGate(
  state: ActivityGateState,
  overlap: number,
  hasTemplates: boolean,
): ActivityGateState {
  if (!hasTemplates) {
    return {
      ...initialActivityGateState(),
      frames: state.frames + 1,
      engineOn: true,
    };
  }

  if (state.frames < ACTIVITY_BOOTSTRAP_FRAMES) {
    const n = state.frames + 1;
    const ema =
      state.frames === 0 ? overlap : state.ema + (overlap - state.ema) / n;
    return {
      ema,
      frames: n,
      latchedOff: false,
      pendingOff: 0,
      pendingOn: 0,
      engineOn: true,
    };
  }

  const drop = state.ema - overlap;
  const looksLike = drop <= ACTIVITY_GATE_DROP;
  const hardUnlike = drop >= ACTIVITY_GATE_HARD_DROP;
  const reopen = overlap >= state.ema - ACTIVITY_GATE_DROP * 0.5;

  if (state.latchedOff) {
    const pendingOn = reopen ? state.pendingOn + 1 : 0;
    if (pendingOn >= ACTIVITY_GATE_REOPEN_CONFIRM) {
      return {
        ema: state.ema + ACTIVITY_EMA_ALPHA * (overlap - state.ema),
        frames: state.frames + 1,
        latchedOff: false,
        pendingOff: 0,
        pendingOn: 0,
        engineOn: true,
      };
    }
    return {
      ...state,
      frames: state.frames + 1,
      pendingOn,
      pendingOff: 0,
      engineOn: false,
    };
  }

  if (looksLike) {
    return {
      ema: state.ema + ACTIVITY_EMA_ALPHA * (overlap - state.ema),
      frames: state.frames + 1,
      latchedOff: false,
      pendingOff: 0,
      pendingOn: 0,
      engineOn: true,
    };
  }

  const pendingOff = state.pendingOff + 1;
  const trip = hardUnlike || pendingOff >= ACTIVITY_GATE_SOFT_CONFIRM;
  return {
    ema: state.ema,
    frames: state.frames + 1,
    latchedOff: trip,
    pendingOff: trip ? 0 : pendingOff,
    pendingOn: 0,
    engineOn: !trip,
  };
}

/**
 * 帧间粘住同一个人；只有另一人轨迹重合度明显更高才换。
 * pick 之后用同一套重合度更新活动门。
 */
export class ExerciseSubjectLock {
  private templates: Pose[];
  private centroid: Vec2 | null = null;
  private pendingKey = "";
  private pendingCount = 0;
  private switched = false;
  private activity: ActivityGateState = initialActivityGateState();

  constructor(exerciseId: string) {
    this.templates = trajectoryTemplatesFor(exerciseId);
  }

  reset(): void {
    this.centroid = null;
    this.pendingKey = "";
    this.pendingCount = 0;
    this.switched = false;
    this.activity = initialActivityGateState();
  }

  /** 上一帧 pick 是否换了人（给平滑器 reset）。 */
  didSwitch(): boolean {
    return this.switched;
  }

  /** 本帧是否仍像当前动作：不像则禁止计次与纠错。 */
  isExerciseActive(): boolean {
    return this.activity.engineOn;
  }

  pick(candidates: Pose[]): Pose | null {
    this.switched = false;
    const scored = scoreCandidates(candidates, this.templates);
    if (scored.length === 0) {
      this.centroid = null;
      return null;
    }

    const best = scored.reduce((a, b) => (a.score >= b.score ? a : b));
    let chosen: Scored = best;

    if (this.centroid) {
      let locked: Scored | null = null;
      let lockedDist = Infinity;
      for (const s of scored) {
        const d = dist(s.centroid, this.centroid);
        if (d < lockedDist) {
          lockedDist = d;
          locked = s;
        }
      }
      if (locked && lockedDist <= SUBJECT_LOCK_RADIUS) {
        const samePerson = locked === best;
        if (
          !samePerson &&
          best.score >= locked.score + SUBJECT_SWITCH_MARGIN
        ) {
          const key = `${best.centroid.x.toFixed(3)},${best.centroid.y.toFixed(3)}`;
          if (this.pendingKey === key) this.pendingCount += 1;
          else {
            this.pendingKey = key;
            this.pendingCount = 1;
          }
          if (this.pendingCount >= SUBJECT_SWITCH_FRAMES) {
            this.centroid = best.centroid;
            this.pendingKey = "";
            this.pendingCount = 0;
            this.switched = true;
            chosen = best;
            this.observe(chosen.overlap);
            return chosen.pose;
          }
        } else {
          this.pendingKey = "";
          this.pendingCount = 0;
        }
        this.centroid = locked.centroid;
        chosen = locked;
        this.observe(chosen.overlap);
        return chosen.pose;
      }
    }

    this.centroid = best.centroid;
    this.pendingKey = "";
    this.pendingCount = 0;
    this.observe(best.overlap);
    return best.pose;
  }

  private observe(overlap: number): void {
    this.activity = stepActivityGate(
      this.activity,
      overlap,
      this.templates.length > 0,
    );
  }
}
