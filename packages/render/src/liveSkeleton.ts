/**
 * 训练页现场骨怎么画（不改相位/计数）。
 * 侧面深蹲等只留近侧；卧推类侧视保留两臂、可藏远侧腿。
 * 贴边假腿不画；远侧臂可见度不够或叠在近侧上则不画。
 * 3/4（hint=0）不当正侧剪半。
 */

import {
  LandmarkIndex,
  landmarkInFrame,
  overlayKeepsBothArmsOnSide,
  type Pose,
} from "@fitness-coach/core";
import {
  isDistalLegLandmark,
  keepBoneForNearSide,
  keepJointForNearSide,
  keepJointForOverlay,
  landmarkLaterality,
  type OverlayLimbPolicy,
} from "./bones.js";
import type { CameraHint } from "./cameraHint.js";
import { inferNearLimbSide, type NearLimbSide } from "./muscleTint.js";

/** 与 composePlacementHint / 训练页 planeWrong 同一门槛。 */
export const WRONG_PLANE_CONFIDENCE = 0.55;

/** 计次已放宽 vis 的动作：画骨加严，杠/架上的假点少连成网。 */
export const STRICT_DRAW_VISIBILITY = 0.45;
/** 侧面远侧肘/腕：可见度不够不画，避免挡在近侧上叠成网。 */
export const FAR_ARM_MIN_VISIBILITY = 0.55;
/** 远侧肘/腕与近侧贴在一起则丢掉远侧。 */
export const FAR_ARM_STACK_DIST = 0.08;

export type LiveSkeletonDrawSpec = {
  /** 身上叠用户 2D 骨 */
  drawLive: boolean;
  /** 示范窗「骨骼」跟人；false 时停在样片 */
  followUserInPip: boolean;
  nearSide: NearLimbSide;
  limbPolicy: OverlayLimbPolicy;
  minVisibility: number;
};

export function isWrongCameraPlane(opts: {
  requireSidePlane?: boolean;
  requireFrontPlane?: boolean;
  observedCamera: CameraHint | 0;
  observedConfidence: number;
}): boolean {
  const confident = opts.observedConfidence >= WRONG_PLANE_CONFIDENCE;
  if (
    opts.requireSidePlane &&
    opts.observedCamera === "front" &&
    confident
  ) {
    return true;
  }
  if (
    opts.requireFrontPlane &&
    opts.observedCamera === "side" &&
    confident
  ) {
    return true;
  }
  return false;
}

export function liveSkeletonDrawSpec(opts: {
  requireSidePlane?: boolean;
  requireFrontPlane?: boolean;
  observedCamera: CameraHint | 0;
  observedConfidence: number;
  pose: Pose;
  strictDrawVisibility?: boolean;
  exerciseId?: string;
}): LiveSkeletonDrawSpec {
  if (isWrongCameraPlane(opts)) {
    return {
      drawLive: false,
      followUserInPip: false,
      nearSide: "both",
      limbPolicy: "all",
      minVisibility: 1,
    };
  }
  const minVisibility = opts.strictDrawVisibility ? STRICT_DRAW_VISIBILITY : 0;
  // 仅在明确侧面时剪远侧；3/4 / 正面整副画。
  if (opts.observedCamera !== "side") {
    return {
      drawLive: true,
      followUserInPip: true,
      nearSide: "both",
      limbPolicy: "all",
      minVisibility,
    };
  }
  const keepArms = overlayKeepsBothArmsOnSide(opts.exerciseId ?? "");
  return {
    drawLive: true,
    followUserInPip: true,
    nearSide: inferNearLimbSide(opts.pose, "side"),
    limbPolicy: keepArms ? "near-legs" : "near-all",
    minVisibility,
  };
}

function visibleEnough(
  visibility: number | undefined,
  minVisibility: number,
): boolean {
  if (minVisibility <= 0) return true;
  return (visibility ?? 1) >= minVisibility;
}

function farArmDistalIndices(nearSide: NearLimbSide): number[] {
  if (nearSide === "left") {
    return [LandmarkIndex.RightElbow, LandmarkIndex.RightWrist];
  }
  if (nearSide === "right") {
    return [LandmarkIndex.LeftElbow, LandmarkIndex.LeftWrist];
  }
  return [];
}

function nearArmCounterpart(index: number): number | null {
  switch (index) {
    case LandmarkIndex.LeftElbow:
      return LandmarkIndex.RightElbow;
    case LandmarkIndex.RightElbow:
      return LandmarkIndex.LeftElbow;
    case LandmarkIndex.LeftWrist:
      return LandmarkIndex.RightWrist;
    case LandmarkIndex.RightWrist:
      return LandmarkIndex.LeftWrist;
    default:
      return null;
  }
}

function dropUnreliableFarArm(
  out: Pose,
  source: Pose,
  nearSide: NearLimbSide,
): void {
  if (nearSide === "both") return;
  for (const i of farArmDistalIndices(nearSide)) {
    const lm = out[i];
    if (!lm) continue;
    if ((lm.visibility ?? 1) < FAR_ARM_MIN_VISIBILITY) {
      delete out[i];
      continue;
    }
    const nearIdx = nearArmCounterpart(i);
    const nearLm = nearIdx != null ? source[nearIdx] : undefined;
    if (
      nearLm &&
      Math.hypot(lm.x - nearLm.x, lm.y - nearLm.y) < FAR_ARM_STACK_DIST
    ) {
      delete out[i];
    }
  }
}

/** 去掉远侧点、手指点、贴边假腿，以及低于画骨可见度的点。不改传入数组。 */
export function filterPoseForOverlay(
  pose: Pose,
  nearSide: NearLimbSide,
  minVisibility = 0,
  limbPolicy: OverlayLimbPolicy = "near-all",
): Pose {
  const out: Pose = [];
  pose.forEach((lm, i) => {
    if (!lm) return;
    if (!keepJointForOverlay(i, nearSide, limbPolicy)) return;
    if (!visibleEnough(lm.visibility, minVisibility)) return;
    if (isDistalLegLandmark(i) && !landmarkInFrame(lm)) return;
    out[i] = lm;
  });
  dropUnreliableFarArm(out, pose, nearSide);
  return out;
}

export {
  keepBoneForNearSide,
  keepJointForNearSide,
  keepJointForOverlay,
  landmarkLaterality,
};
export type { OverlayLimbPolicy };
