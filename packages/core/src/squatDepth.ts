/**
 * 深蹲深度：髋离脚有多近，用这个人的腿长归一。
 * 1 = 直腿站着，越小髋越靠近脚。不写死膝角。
 * 日志 C06-04。尝试引擎与涂红共用这一次读数（C07-07），见 docs/count-change-log.md。
 */

import {
  hasWorldPoint,
  jointAngleImage,
  worldJointAngle,
} from "./angles.js";
import {
  LandmarkIndex,
  type Landmark,
  type Pose,
} from "./types.js";

/** 髋到脚的竖直距离缩到直腿的大约四分之三，算明显蹲下去了。 */
export const SQUAT_CLOSE = 0.75;
/** 还接近直腿。这之上的小波动不当成下蹲。 */
export const SQUAT_STILL_STANDING = 0.88;

const EXTENDED = 0.92;
/** 还没见过站直时，用常见的髋-踝 / 肩-髋竖直比。见到站直后改用本人的。 */
const COLD_LEG_OVER_TORSO = 1.55;

export interface SquatDepthState {
  /** 直腿时，画面里髋-踝竖直距离 / 肩-髋竖直距离。 */
  standingLegOverTorso: number | null;
}

export function initialSquatDepthState(): SquatDepthState {
  return { standingLegOverTorso: null };
}

const SIDES = [
  {
    hip: LandmarkIndex.LeftHip,
    knee: LandmarkIndex.LeftKnee,
    ankle: LandmarkIndex.LeftAnkle,
    shoulder: LandmarkIndex.LeftShoulder,
  },
  {
    hip: LandmarkIndex.RightHip,
    knee: LandmarkIndex.RightKnee,
    ankle: LandmarkIndex.RightAnkle,
    shoulder: LandmarkIndex.RightShoulder,
  },
] as const;

function dist3(a: Landmark, b: Landmark): number {
  return Math.hypot((a.wx ?? 0) - (b.wx ?? 0), (a.wy ?? 0) - (b.wy ?? 0), (a.wz ?? 0) - (b.wz ?? 0));
}

/** 画面角和三维角里更弯的那个，折成和腿长同一把尺子：180° → 1。 */
function kneeOpenness(pose: Pose): number | null {
  const angles: number[] = [];
  for (const side of SIDES) {
    const joints = { a: side.hip, b: side.knee, c: side.ankle };
    const image = jointAngleImage(pose, joints);
    const world = worldJointAngle(pose, joints);
    const vals = [image, world].filter((n): n is number => n != null && Number.isFinite(n));
    if (vals.length > 0) angles.push(Math.min(...vals));
  }
  if (angles.length === 0) return null;
  const bent = Math.min(...angles);
  return Math.sin((bent * Math.PI) / 360);
}

function worldLegOpenness(pose: Pose): number | null {
  const ratios: number[] = [];
  for (const side of SIDES) {
    const hip = pose[side.hip];
    const knee = pose[side.knee];
    const ankle = pose[side.ankle];
    if (!hasWorldPoint(hip) || !hasWorldPoint(knee) || !hasWorldPoint(ankle)) continue;
    const segments = dist3(hip, knee) + dist3(knee, ankle);
    const vertical = Math.abs(ankle.wy - hip.wy);
    if (segments < 0.2) continue;
    ratios.push(vertical / segments);
  }
  if (ratios.length === 0) return null;
  return Math.min(...ratios);
}

function imageLegOverTorso(pose: Pose): { short: number; long: number } | null {
  const ratios: number[] = [];
  for (const side of SIDES) {
    const hip = pose[side.hip];
    const ankle = pose[side.ankle];
    const shoulder = pose[side.shoulder];
    if (!hip || !ankle || !shoulder) continue;
    const torso = hip.y - shoulder.y;
    const leg = ankle.y - hip.y;
    if (torso < 0.04 || leg < 0.02) continue;
    const ratio = leg / torso;
    if (ratio < 0.3 || ratio > 4) continue;
    ratios.push(ratio);
  }
  if (ratios.length === 0) return null;
  return { short: Math.min(...ratios), long: Math.max(...ratios) };
}

function rememberStanding(prev: number | null, sample: number): number {
  if (prev == null) return sample;
  if (sample > prev) return prev * 0.85 + sample * 0.15;
  return prev;
}

/**
 * 这一帧髋离脚有多近。膝角只在它比髋的高度更弯时把读数拉低。
 * 膝角缺失时仍用髋相对肩的高度；看不出来返回 null，不当成已经蹲到底。
 */
export function readSquatDepth(
  state: SquatDepthState,
  pose: Pose,
): { state: SquatDepthState; openness: number | null } {
  const knee = kneeOpenness(pose);
  const world = worldLegOpenness(pose);
  const image = imageLegOverTorso(pose);
  let standing = state.standingLegOverTorso;
  if (image && knee != null && knee >= EXTENDED) {
    // 正面蹲到底时膝角仍可能看起来很直，但髋已经靠近脚。那种帧不能当成站直。
    if (standing == null || image.long >= standing * 0.92) {
      standing = rememberStanding(standing, image.long);
    }
  } else if (
    image &&
    knee == null &&
    (standing == null || image.long >= standing)
  ) {
    standing = rememberStanding(standing, image.long);
  }
  const parts: number[] = [];
  if (knee != null) parts.push(knee);
  if (world != null) parts.push(world);
  if (image) {
    parts.push(image.short / (standing ?? COLD_LEG_OVER_TORSO));
  }
  return {
    state: { standingLegOverTorso: standing },
    openness: parts.length > 0 ? Math.min(...parts) : null,
  };
}
