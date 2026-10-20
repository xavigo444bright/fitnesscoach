/**
 * 高位下拉臂链。
 * 画骨只用这一帧：肘不在当前肩和腕之间，或腕离当前肩不像这条手臂，这一侧前臂不画。
 * 上一帧的肘和腕只留给计次，用来忽略钢索上跳的一帧。
 * 肩离开上一帧的肘，或手臂垂到髋侧，立刻清掉保持。垂着的臂按当前点画，不计次。
 * 日志 C03-03、C10-04，见 docs/count-change-log.md。
 */

import { ARM_POINT_STUB } from "./angles.js";
import { landmarkInFrame } from "./landmarks.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";

/** 肘或腕相对上一帧的归一化跳变，超过则先按野点。 */
export const LAT_PULLDOWN_ARM_JUMP = 0.1;
/** 野点连续落在同一处，才承认是真的移过去了。 */
export const LAT_PULLDOWN_ARM_STABLE = 0.05;
export const LAT_PULLDOWN_ARM_HOLD_FRAMES = 4;
/** 肘投影到肩的另一侧（手还在杆上、肘掉到垫上）则不在链上。 */
const CHAIN_T_MIN = -0.15;
/** 和肩几乎等距时不算「更靠近髋」，避免肋旁的真肘被丢掉。 */
const HIP_MARGIN = 0.02;

const SIDES = [
  {
    shoulder: LandmarkIndex.LeftShoulder,
    elbow: LandmarkIndex.LeftElbow,
    wrist: LandmarkIndex.LeftWrist,
    hip: LandmarkIndex.LeftHip,
  },
  {
    shoulder: LandmarkIndex.RightShoulder,
    elbow: LandmarkIndex.RightElbow,
    wrist: LandmarkIndex.RightWrist,
    hip: LandmarkIndex.RightHip,
  },
] as const;

type ArmTip = { shoulder: Landmark; elbow: Landmark; wrist: Landmark };

export type LatPulldownArmFrames = { count: Pose; draw: Pose };

function dist3(a: Landmark, b: Landmark): number {
  const dz = a.z != null && b.z != null ? a.z - b.z : 0;
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

function projectT(shoulder: Landmark, elbow: Landmark, wrist: Landmark): number {
  const useZ = shoulder.z != null && elbow.z != null && wrist.z != null;
  const sx = wrist.x - shoulder.x;
  const sy = wrist.y - shoulder.y;
  const sz = useZ ? (wrist.z ?? 0) - (shoulder.z ?? 0) : 0;
  const ex = elbow.x - shoulder.x;
  const ey = elbow.y - shoulder.y;
  const ez = useZ ? (elbow.z ?? 0) - (shoulder.z ?? 0) : 0;
  const denom = sx * sx + sy * sy + sz * sz;
  if (denom < 1e-8) return 0;
  return (ex * sx + ey * sy + ez * sz) / denom;
}

function nearerHip(point: Landmark, hip: Landmark, shoulder: Landmark): boolean {
  return dist3(point, hip) + HIP_MARGIN < dist3(point, shoulder);
}

function tipClose(a: ArmTip, b: ArmTip, max: number): boolean {
  return dist3(a.elbow, b.elbow) <= max && dist3(a.wrist, b.wrist) <= max;
}

type Verdict =
  | { kind: "missing" }
  | { kind: "passthrough" }
  | { kind: "stood" }
  | { kind: "reject" }
  | { kind: "ok"; tip: ArmTip };

function shoulderLeft(shoulder: Landmark, last: ArmTip): boolean {
  const reach = Math.max(
    dist3(last.shoulder, last.elbow) + dist3(last.elbow, last.wrist),
    0.12,
  );
  return dist3(shoulder, last.elbow) > reach;
}

/** 腕离当前肩远得不像这条手臂。 */
function wristUnlikeArm(
  shoulder: Landmark,
  wrist: Landmark,
  hip: Landmark | undefined,
): boolean {
  const reach = dist3(shoulder, wrist);
  if (reach < ARM_POINT_STUB) return true;
  if (!hip) return reach > 0.75;
  const torso = dist3(shoulder, hip);
  if (torso < ARM_POINT_STUB) return reach > 0.75;
  return reach > Math.max(0.55, torso * 2.2);
}

function verdict(pose: Pose, side: (typeof SIDES)[number]): Verdict {
  const elbow = pose[side.elbow];
  const wrist = pose[side.wrist];
  if (!elbow || !wrist) return { kind: "missing" };
  const shoulder = pose[side.shoulder];
  if (!shoulder) return { kind: "passthrough" };
  const hip = pose[side.hip];
  if (
    hip &&
    nearerHip(elbow, hip, shoulder) &&
    nearerHip(wrist, hip, shoulder)
  ) {
    return { kind: "stood" };
  }
  if (
    dist3(shoulder, elbow) < ARM_POINT_STUB ||
    dist3(elbow, wrist) < ARM_POINT_STUB
  ) {
    return { kind: "reject" };
  }
  if (projectT(shoulder, elbow, wrist) < CHAIN_T_MIN) return { kind: "reject" };
  return {
    kind: "ok",
    tip: {
      shoulder: { ...shoulder },
      elbow: { ...elbow },
      wrist: { ...wrist },
    },
  };
}

/** 画骨不补上一帧。链不对就去掉肘，前臂不连；画面里的腕留在手上。 */
function paintDraw(
  pose: Pose,
  side: (typeof SIDES)[number],
  out: Pose,
): void {
  const shoulder = pose[side.shoulder];
  const elbow = pose[side.elbow];
  const wrist = pose[side.wrist];
  if (!shoulder) return;
  const hip = pose[side.hip];
  const along =
    elbow != null && wrist != null ? projectT(shoulder, elbow, wrist) : 0;
  const onChain =
    elbow != null &&
    wrist != null &&
    dist3(shoulder, wrist) >= ARM_POINT_STUB &&
    along >= CHAIN_T_MIN &&
    along <= 1.15;
  if (!onChain) out[side.elbow] = undefined;
  if (
    !wrist ||
    !landmarkInFrame(wrist) ||
    wristUnlikeArm(shoulder, wrist, hip)
  ) {
    out[side.wrist] = undefined;
    if (!onChain) out[side.elbow] = undefined;
  }
}

/**
 * 计次可以沿用上一帧的肘和腕，画骨不行。
 */
export class LatPulldownArmHold {
  private last: Array<ArmTip | null> = [null, null];
  private pending: Array<ArmTip | null> = [null, null];
  private streak: [number, number] = [0, 0];

  reset(): void {
    this.last = [null, null];
    this.pending = [null, null];
    this.streak = [0, 0];
  }

  private clearSide(i: number): void {
    this.last[i] = null;
    this.pending[i] = null;
    this.streak[i] = 0;
  }

  step(pose: Pose): LatPulldownArmFrames {
    const count = pose.slice();
    const draw = pose.slice();
    SIDES.forEach((side, i) => {
      paintDraw(pose, side, draw);
      const v = verdict(pose, side);
      const shoulder = pose[side.shoulder];
      const held = this.last[i];
      if (shoulder && held && shoulderLeft(shoulder, held)) this.clearSide(i);
      if (v.kind === "passthrough") return;
      if (v.kind === "missing" || v.kind === "stood") {
        this.clearSide(i);
        if (v.kind === "stood") {
          count[side.elbow] = undefined;
          count[side.wrist] = undefined;
        }
        return;
      }
      if (v.kind === "reject") {
        this.pending[i] = null;
        this.streak[i] = 0;
        const kept = this.last[i];
        count[side.elbow] = kept ? { ...kept.elbow } : undefined;
        count[side.wrist] = kept ? { ...kept.wrist } : undefined;
        return;
      }
      const tip = v.tip;
      const prev = this.last[i];
      if (!prev || tipClose(prev, tip, LAT_PULLDOWN_ARM_JUMP)) {
        this.last[i] = tip;
        this.pending[i] = null;
        this.streak[i] = 0;
        count[side.elbow] = { ...tip.elbow };
        count[side.wrist] = { ...tip.wrist };
        return;
      }
      const pend = this.pending[i];
      if (pend && tipClose(pend, tip, LAT_PULLDOWN_ARM_STABLE)) {
        this.streak[i] += 1;
      } else {
        this.pending[i] = tip;
        this.streak[i] = 1;
      }
      if (this.streak[i] >= LAT_PULLDOWN_ARM_HOLD_FRAMES) {
        this.last[i] = tip;
        this.pending[i] = null;
        this.streak[i] = 0;
        count[side.elbow] = { ...tip.elbow };
        count[side.wrist] = { ...tip.wrist };
        return;
      }
      count[side.elbow] = { ...prev.elbow };
      count[side.wrist] = { ...prev.wrist };
    });
    return { count, draw };
  }
}
