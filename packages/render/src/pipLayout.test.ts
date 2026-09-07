import { buildSquatPose, LandmarkIndex } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { aabbFromRig, fitAabbToPixelRect, mapSkeletonToPip, mapToPipPx } from "./pipLayout.js";
import { canonicalPoseFromTrajectory } from "./referenceSkeleton.js";
import { buildRig3d } from "./rig3d.js";
import { buildSkeletonScene } from "./buildSkeleton.js";

const PIP_W = 132;
const PIP_H = 220;

describe("pipLayout（小窗人居中）", () => {
  it("stand/bottom 映射后 AABB 中心在窗中，且蹲姿几何不同", () => {
    const user = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 18 });
    const stand = canonicalPoseFromTrajectory("squat", user, "stand", 175)!;
    const bottom = canonicalPoseFromTrajectory("squat", user, "bottom", 90)!;

    const standRig = buildRig3d(stand, {
      cameraHint: "side",
      exerciseId: "squat",
    })!;
    const bottomRig = buildRig3d(bottom, {
      cameraHint: "side",
      exerciseId: "squat",
    })!;

    const standBox = aabbFromRig(standRig)!;
    const bottomBox = aabbFromRig(bottomRig)!;
    const standFit = fitAabbToPixelRect(standBox, PIP_W, PIP_H);
    const bottomFit = fitAabbToPixelRect(bottomBox, PIP_W, PIP_H);

    const mappedBox = (
      box: typeof standBox,
      fit: typeof standFit,
    ): { minX: number; minY: number; maxX: number; maxY: number } => {
      const a = mapToPipPx(box.minX, box.minY, fit);
      const b = mapToPipPx(box.maxX, box.maxY, fit);
      return {
        minX: Math.min(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxX: Math.max(a.x, b.x),
        maxY: Math.max(a.y, b.y),
      };
    };

    const sPx = mappedBox(standBox, standFit);
    const bPx = mappedBox(bottomBox, bottomFit);
    expect((sPx.minX + sPx.maxX) / 2).toBeGreaterThan(PIP_W / 2 - 6);
    expect((sPx.minX + sPx.maxX) / 2).toBeLessThan(PIP_W / 2 + 6);
    expect((sPx.minY + sPx.maxY) / 2).toBeGreaterThan(PIP_H / 2 - 6);
    expect((sPx.minY + sPx.maxY) / 2).toBeLessThan(PIP_H / 2 + 6);
    expect(sPx.minX).toBeGreaterThan(2);
    expect(sPx.maxX).toBeLessThan(PIP_W - 2);
    expect(sPx.minY).toBeGreaterThan(2);
    expect(sPx.maxY).toBeLessThan(PIP_H - 2);
    expect(bPx.minX).toBeGreaterThan(2);
    expect(bPx.maxX).toBeLessThan(PIP_W - 2);
    expect(bPx.minY).toBeGreaterThan(2);
    expect(bPx.maxY).toBeLessThan(PIP_H - 2);

    const standHip =
      stand[LandmarkIndex.LeftHip] ?? stand[LandmarkIndex.RightHip]!;
    const bottomHip =
      bottom[LandmarkIndex.LeftHip] ?? bottom[LandmarkIndex.RightHip]!;
    const standKnee =
      stand[LandmarkIndex.LeftKnee] ?? stand[LandmarkIndex.RightKnee]!;
    const bottomKnee =
      bottom[LandmarkIndex.LeftKnee] ?? bottom[LandmarkIndex.RightKnee]!;
    const standHipPx = mapToPipPx(standHip.x, standHip.y, standFit);
    const bottomHipPx = mapToPipPx(bottomHip.x, bottomHip.y, bottomFit);
    const standKneePx = mapToPipPx(standKnee.x, standKnee.y, standFit);
    const bottomKneePx = mapToPipPx(bottomKnee.x, bottomKnee.y, bottomFit);
    const standLegX = standKneePx.x - standHipPx.x;
    const standLegY = standKneePx.y - standHipPx.y;
    const bottomLegX = bottomKneePx.x - bottomHipPx.x;
    const bottomLegY = bottomKneePx.y - bottomHipPx.y;
    expect(
      Math.hypot(standLegX - bottomLegX, standLegY - bottomLegY),
    ).toBeGreaterThan(8);

    const pipSkel = mapSkeletonToPip(buildSkeletonScene(stand), standFit);
    expect(pipSkel.bones.length).toBeGreaterThanOrEqual(8);
    for (const j of pipSkel.joints) {
      expect(j.x).toBeGreaterThan(2);
      expect(j.x).toBeLessThan(PIP_W - 2);
      expect(j.y).toBeGreaterThan(2);
      expect(j.y).toBeLessThan(PIP_H - 2);
    }
  });
});
