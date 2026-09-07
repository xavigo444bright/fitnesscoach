/**
 * 把画面里「躺着的人」抬正到重力方向（头在上、+Y 向下）。
 * 竖屏 UI 锁住但手机横过来时，相机预览会横置，驱动角把画面 +Y 当竖直会失败。
 * 卧姿/趴地动作禁止用头-髋抬正，否则会把躺着的人转成立姿。
 */

import { LandmarkIndex, type Landmark, type Pose } from "./types.js";

export type QuarterTurn = 0 | 90 | 180 | 270;

const LYING_OR_FLOOR = new Set<string>([
  "bench-press",
  "glute-bridge",
  "db-fly",
  "pushup",
  "incline-pushup",
  "plank",
  "pike-pushup",
]);

export function poseUprightApplies(exerciseId: string): boolean {
  return !LYING_OR_FLOOR.has(exerciseId);
}

function mid(
  a: Landmark | undefined,
  b: Landmark | undefined,
): Landmark | null {
  if (a && b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: 1 };
  }
  if (a) return a;
  if (b) return b;
  return null;
}

function rotateXy(
  x: number,
  y: number,
  turn: QuarterTurn,
): { x: number; y: number } {
  if (turn === 0) return { x, y };
  if (turn === 90) return { x: y, y: 1 - x };
  if (turn === 180) return { x: 1 - x, y: 1 - y };
  return { x: 1 - y, y: x };
}

export function invertQuarterTurn(turn: QuarterTurn): QuarterTurn {
  if (turn === 0) return 0;
  if (turn === 90) return 270;
  if (turn === 180) return 180;
  return 90;
}

export function rotatePoseNormalized(pose: Pose, turn: QuarterTurn): Pose {
  if (turn === 0) return pose;
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    const xy = rotateXy(lm.x, lm.y, turn);
    out[i] = { ...lm, x: xy.x, y: xy.y };
  }
  return out;
}

/**
 * 头相对髋的方向：y 向下时，头在上 = 已抬正。
 * 头在画面右侧 → 90° 顺时针。
 */
export function inferPoseUprightTurn(pose: Pose): QuarterTurn {
  const hip =
    mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]) ??
    mid(pose[LandmarkIndex.LeftShoulder], pose[LandmarkIndex.RightShoulder]);
  const head =
    pose[LandmarkIndex.Nose] ??
    mid(pose[LandmarkIndex.LeftShoulder], pose[LandmarkIndex.RightShoulder]);
  if (!hip || !head) return 0;
  const dx = head.x - hip.x;
  const dy = head.y - hip.y;
  if (Math.hypot(dx, dy) < 0.08) return 0;
  if (Math.abs(dy) >= Math.abs(dx)) return dy <= 0 ? 0 : 180;
  return dx >= 0 ? 90 : 270;
}

export class PoseUprightLatch {
  private locked: QuarterTurn = 0;
  private pending: QuarterTurn = 0;
  private pendingCount = 0;

  constructor(private readonly confirmFrames = 3) {}

  get value(): QuarterTurn {
    return this.locked;
  }

  reset(): void {
    this.locked = 0;
    this.pending = 0;
    this.pendingCount = 0;
  }

  update(observed: QuarterTurn): QuarterTurn {
    if (observed === this.locked) {
      this.pending = 0;
      this.pendingCount = 0;
      return this.locked;
    }
    if (this.pending === observed) this.pendingCount += 1;
    else {
      this.pending = observed;
      this.pendingCount = 1;
    }
    if (this.pendingCount >= this.confirmFrames) {
      this.locked = observed;
      this.pending = 0;
      this.pendingCount = 0;
    }
    return this.locked;
  }
}
