import {
  getDemoTrajectory,
  LandmarkIndex,
  poseFromFrame,
  sampleTrajectoryAt,
  type Pose,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  buildRig3d,
  bodyThicknessForRig,
  muscleRadiusForBone,
  poseToOrthoWorld,
  reconstructJointZ,
  RIG_HEAD,
  RIG_MID_HIP,
  RIG_MID_SHOULDER,
} from "./rig3d.js";

function squatPose(opts?: { withZ?: boolean; side?: boolean }): Pose {
  const pose: Pose = [];
  const z = opts?.withZ ? -0.9 : undefined;
  const side = opts?.side !== false;
  const pts: Record<number, { x: number; y: number; z?: number }> = {
    [LandmarkIndex.LeftShoulder]: { x: side ? 0.51 : 0.42, y: 0.28, z },
    [LandmarkIndex.RightShoulder]: { x: side ? 0.53 : 0.58, y: 0.28, z },
    [LandmarkIndex.LeftElbow]: { x: side ? 0.48 : 0.38, y: 0.4, z },
    [LandmarkIndex.RightElbow]: { x: side ? 0.55 : 0.62, y: 0.4, z },
    [LandmarkIndex.LeftWrist]: { x: side ? 0.47 : 0.36, y: 0.5, z },
    [LandmarkIndex.RightWrist]: { x: side ? 0.56 : 0.64, y: 0.5, z },
    [LandmarkIndex.LeftHip]: { x: side ? 0.51 : 0.44, y: 0.52, z },
    [LandmarkIndex.RightHip]: { x: side ? 0.53 : 0.56, y: 0.52, z },
    [LandmarkIndex.LeftKnee]: { x: side ? 0.5 : 0.43, y: 0.72, z },
    [LandmarkIndex.RightKnee]: { x: side ? 0.54 : 0.57, y: 0.72, z },
    [LandmarkIndex.LeftAnkle]: { x: side ? 0.5 : 0.42, y: 0.92, z },
    [LandmarkIndex.RightAnkle]: { x: side ? 0.54 : 0.58, y: 0.92, z },
  };
  for (const [idx, p] of Object.entries(pts)) {
    pose[Number(idx)] = { x: p.x, y: p.y, ...(p.z != null ? { z: p.z } : {}) };
  }
  return pose;
}

describe("buildRig3d (FR-080 / T8-2)", () => {
  it("projects x/y identically to the input Pose", () => {
    const pose = squatPose({ withZ: true, side: true });
    const rig = buildRig3d(pose, { cameraHint: "side" });
    expect(rig).not.toBeNull();
    expect(rig!.space).toBe("normalized");
    for (const j of rig!.joints) {
      if (j.index >= 100) continue;
      const lm = pose[j.index];
      expect(lm).toBeDefined();
      expect(j.x).toBeCloseTo(lm!.x, 8);
      expect(j.y).toBeCloseTo(lm!.y, 8);
    }
  });

  it("ignores unaligned MediaPipe z on side and uses left/right thickness", () => {
    const pose = squatPose({ withZ: true, side: true });
    const rig = buildRig3d(pose, { cameraHint: "side" })!;
    const left = rig.joints.find((j) => j.index === LandmarkIndex.LeftHip)!;
    const right = rig.joints.find((j) => j.index === LandmarkIndex.RightHip)!;
    expect(left.z).not.toBeCloseTo(-0.9, 2);
    expect(left.z).toBeGreaterThan(0);
    expect(right.z).toBeLessThan(0);
    expect(left.z).toBeCloseTo(-right.z, 8);
    expect(Math.abs(left.z)).toBeLessThanOrEqual(0.07);
  });

  it("thickness scales with aligned body height", () => {
    const pose = squatPose({ side: true });
    const t = bodyThicknessForRig(pose);
    expect(t).toBeGreaterThanOrEqual(0.018);
    expect(t).toBeLessThanOrEqual(0.07);
    const left = reconstructJointZ(pose, LandmarkIndex.LeftKnee, -0.9, "side");
    expect(left).toBeCloseTo(t, 8);
  });

  it("adds a mid-torso segment for squat silhouette", () => {
    const rig = buildRig3d(squatPose({ side: true }), { cameraHint: "side" })!;
    expect(rig.cameraHint).toBe("side");
    expect(rig.joints.some((j) => j.index === RIG_MID_SHOULDER)).toBe(true);
    expect(rig.joints.some((j) => j.index === RIG_MID_HIP)).toBe(true);
    expect(
      rig.bones.some(
        (b) => b.from === RIG_MID_SHOULDER && b.to === RIG_MID_HIP,
      ),
    ).toBe(true);
  });

  it("uses thicker capsules for thighs than forearms (FR-081)", () => {
    const thigh = muscleRadiusForBone(
      LandmarkIndex.LeftHip,
      LandmarkIndex.LeftKnee,
    );
    const forearm = muscleRadiusForBone(
      LandmarkIndex.LeftElbow,
      LandmarkIndex.LeftWrist,
    );
    expect(thigh.from).toBeGreaterThan(forearm.from);
    expect(thigh.from).toBeGreaterThan(thigh.to);
  });

  it("returns null when too few joints", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
    expect(buildRig3d(pose)).toBeNull();
  });

  it("skips bones whose endpoints are missing", () => {
    const pose = squatPose({ side: true });
    pose[LandmarkIndex.LeftAnkle] = undefined;
    const rig = buildRig3d(pose, { cameraHint: "side" })!;
    expect(
      rig.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftKnee &&
          b.to === LandmarkIndex.LeftAnkle,
      ),
    ).toBe(false);
    expect(
      rig.bones.some(
        (b) =>
          b.from === LandmarkIndex.RightKnee &&
          b.to === LandmarkIndex.RightAnkle,
      ),
    ).toBe(true);
  });

  it("drives a rig from squat-side-v1 mid-rep (T8-2)", () => {
    const traj = getDemoTrajectory("squat", "side");
    const pose = poseFromFrame(sampleTrajectoryAt(traj, 0.45));
    const rig = buildRig3d(pose, { cameraHint: "side" });
    expect(rig).not.toBeNull();
    expect(rig!.cameraHint).toBe("side");
    expect(rig!.bones.length).toBeGreaterThan(8);
    const knee = rig!.joints.find((j) => j.index === LandmarkIndex.RightKnee);
    expect(knee).toBeDefined();
    expect(knee!.x).toBeGreaterThan(0);
    expect(knee!.x).toBeLessThan(1);
  });

  it("drives a plank rig from pushup-side-v1 with thicker arms (T8-4)", () => {
    const traj = getDemoTrajectory("pushup", "side");
    const pose = poseFromFrame(sampleTrajectoryAt(traj, 0.45));
    const rig = buildRig3d(pose, {
      cameraHint: "side",
      exerciseId: "pushup",
    });
    expect(rig).not.toBeNull();
    expect(rig!.volumes.some((v) => v.kind === "torso")).toBe(true);
    const arm = rig!.bones.find(
      (b) =>
        b.from === LandmarkIndex.LeftShoulder &&
        b.to === LandmarkIndex.LeftElbow,
    );
    const squatArm = muscleRadiusForBone(
      LandmarkIndex.LeftShoulder,
      LandmarkIndex.LeftElbow,
      "squat",
    );
    const pushArm = muscleRadiusForBone(
      LandmarkIndex.LeftShoulder,
      LandmarkIndex.LeftElbow,
      "pushup",
    );
    expect(pushArm.from).toBeGreaterThan(squatArm.from);
    expect(arm).toBeDefined();
    expect(arm!.radiusFrom).toBeGreaterThan(0);
    const t = bodyThicknessForRig(pose, "pushup");
    expect(t).toBeGreaterThanOrEqual(0.018);
    expect(t).toBeLessThanOrEqual(0.07);
  });

  it("scales muscle radii with body size and emits a torso volume (T8-3)", () => {
    const tall = squatPose({ side: true });
    tall[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.99 };
    tall[LandmarkIndex.RightAnkle] = { x: 0.54, y: 0.99 };
    const short = squatPose({ side: true });
    short[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.7 };
    short[LandmarkIndex.RightAnkle] = { x: 0.54, y: 0.7 };
    const rTall = buildRig3d(tall, { cameraHint: "side" })!;
    const rShort = buildRig3d(short, { cameraHint: "side" })!;
    const thighOf = (rig: NonNullable<ReturnType<typeof buildRig3d>>) =>
      rig.bones.find(
        (b) =>
          b.from === LandmarkIndex.LeftHip &&
          b.to === LandmarkIndex.LeftKnee,
      );
    const thighTall = thighOf(rTall);
    const thighShort = thighOf(rShort);
    expect(thighTall).toBeDefined();
    expect(thighShort).toBeDefined();
    expect(thighTall!.radiusFrom).toBeGreaterThan(thighTall!.radiusTo);
    expect(thighTall!.radiusFrom).toBeGreaterThan(thighShort!.radiusFrom);
    expect(rTall.volumes.some((v) => v.kind === "torso")).toBe(true);
    const torso = rTall.volumes.find((v) => v.kind === "torso")!;
    expect(torso.ry).toBeGreaterThan(torso.rx * 0.5);
    const kinds = new Set(rTall.volumes.map((v) => v.kind));
    expect(kinds.has("head")).toBe(true);
    expect(kinds.has("chest")).toBe(true);
    expect(kinds.has("pelvis")).toBe(true);
    expect(kinds.has("thigh")).toBe(true);
    expect(kinds.has("upperArm")).toBe(true);
    const head = rTall.volumes.find((v) => v.kind === "head")!;
    const sh = rTall.joints.find((j) => j.index === RIG_MID_SHOULDER)!;
    expect(Math.hypot(head.x - sh.x, head.y - sh.y)).toBeGreaterThan(0.12);
    expect(head.rx).toBeGreaterThan(0.05);
    expect(rTall.joints.some((j) => j.index === RIG_HEAD)).toBe(true);
  });

  it("maps pose x/y into an aspect-correct ortho world (FR-082)", () => {
    const p = poseToOrthoWorld(0.5, 0.25, 0.04, 0.5);
    expect(p.x).toBeCloseTo(0.25, 8);
    expect(p.y).toBeCloseTo(0.75, 8);
    expect(p.z).toBeCloseTo(0.02, 8);
  });

  it("3D ortho projection hits the same pixels as the 2D overlay", () => {
    const aspect = 0.46;
    const width = 390;
    const height = 848;
    const px = 0.52;
    const py = 0.41;
    const w = poseToOrthoWorld(px, py, 0, aspect);
    expect((w.x / aspect) * width).toBeCloseTo(px * width, 5);
    expect((1 - w.y) * height).toBeCloseTo(py * height, 5);
  });
});
