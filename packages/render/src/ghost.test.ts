import { LandmarkIndex } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  alignGhostToUser,
  estimateAlignTransform,
  GhostScaleSmoother,
  ghostPoseForExercise,
  ghostPoseForPhase,
  inferSideFacing,
  lerpPose,
  matchSideFacing,
  mirrorPoseX,
  resolveAlignMode,
} from "./ghost.js";

describe("ghost interpolation (M3-T6 / VT-P3B-001,002)", () => {
  it("lerpPose midpoints coordinates", () => {
    const a = [];
    const b = [];
    a[LandmarkIndex.RightKnee] = { x: 0, y: 0 };
    b[LandmarkIndex.RightKnee] = { x: 1, y: 1 };
    const m = lerpPose(a, b, 0.5);
    expect(m[LandmarkIndex.RightKnee]?.x).toBeCloseTo(0.5);
    expect(m[LandmarkIndex.RightKnee]?.y).toBeCloseTo(0.5);
  });

  it("stand / bottom differ at hip (knee y fixed by fixture geometry)", () => {
    const s = ghostPoseForPhase("stand", 170);
    const b = ghostPoseForPhase("bottom", 85);
    expect(s[LandmarkIndex.RightHip]?.y).not.toBe(
      b[LandmarkIndex.RightHip]?.y,
    );
  });

  it("descend mid hip y is between stand and bottom", () => {
    const standY = ghostPoseForPhase("stand", 170)[LandmarkIndex.RightHip]!.y;
    const bottomY = ghostPoseForPhase("bottom", 85)[LandmarkIndex.RightHip]!.y;
    const midY = ghostPoseForPhase("descend", 130)[LandmarkIndex.RightHip]!.y;
    expect(midY).toBeGreaterThan(Math.min(standY, bottomY) - 1e-9);
    expect(midY).toBeLessThan(Math.max(standY, bottomY) + 1e-9);
    expect(midY).not.toBeCloseTo(standY);
    expect(midY).not.toBeCloseTo(bottomY);
  });

  it("pushup ghostPoseForExercise bottom differs from stand", () => {
    const s = ghostPoseForExercise("pushup", "stand", 170);
    const b = ghostPoseForExercise("pushup", "bottom", 95);
    expect(s[LandmarkIndex.RightElbow]?.y).not.toBe(
      b[LandmarkIndex.RightWrist]?.y,
    );
    expect(s[LandmarkIndex.RightShoulder]).toBeDefined();
    expect(b[LandmarkIndex.RightWrist]).toBeDefined();
  });

  it("alignGhostToUser 站立时髋踝中点重合", () => {
    const ghost: import("@fitness-coach/core").Pose = [];
    ghost[LandmarkIndex.LeftHip] = { x: 0.48, y: 0.5 };
    ghost[LandmarkIndex.RightHip] = { x: 0.52, y: 0.5 };
    ghost[LandmarkIndex.LeftAnkle] = { x: 0.48, y: 0.85 };
    ghost[LandmarkIndex.RightAnkle] = { x: 0.52, y: 0.85 };
    ghost[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.3 };
    ghost[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.3 };
    ghost[LandmarkIndex.LeftKnee] = { x: 0.48, y: 0.68 };
    ghost[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.68 };

    const user: import("@fitness-coach/core").Pose = [];
    user[LandmarkIndex.LeftHip] = { x: 0.4, y: 0.45 };
    user[LandmarkIndex.RightHip] = { x: 0.46, y: 0.45 };
    user[LandmarkIndex.LeftAnkle] = { x: 0.4, y: 0.95 };
    user[LandmarkIndex.RightAnkle] = { x: 0.46, y: 0.95 };
    user[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.18 };
    user[LandmarkIndex.RightShoulder] = { x: 0.46, y: 0.18 };

    const tf = estimateAlignTransform(ghost, user)!;
    expect(tf.scale).toBeGreaterThan(1.2); // 用户腿更长，不得被夹到 1.22
    const aligned = alignGhostToUser(ghost, user, tf);
    const aHipY =
      ((aligned[LandmarkIndex.LeftHip]!.y + aligned[LandmarkIndex.RightHip]!.y) /
        2);
    const aAnkleY =
      ((aligned[LandmarkIndex.LeftAnkle]!.y +
        aligned[LandmarkIndex.RightAnkle]!.y) /
        2);
    expect(aAnkleY).toBeCloseTo(0.95, 3);
    expect(aHipY).toBeCloseTo(0.45, 3);
  });

  it("alignGhostToUser：行程中冻结站立尺度，底部不拉爆", () => {
    const stand: import("@fitness-coach/core").Pose = [];
    stand[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
    stand[LandmarkIndex.RightHip] = { x: 0.5, y: 0.5 };
    stand[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.9 };
    stand[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
    stand[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.28 };

    const bottom: import("@fitness-coach/core").Pose = [];
    bottom[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.72 };
    bottom[LandmarkIndex.RightHip] = { x: 0.5, y: 0.72 };
    bottom[LandmarkIndex.LeftKnee] = { x: 0.62, y: 0.78 };
    bottom[LandmarkIndex.RightKnee] = { x: 0.62, y: 0.78 };
    bottom[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.89 };
    bottom[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.89 };
    bottom[LandmarkIndex.LeftShoulder] = { x: 0.52, y: 0.48 };
    bottom[LandmarkIndex.LeftWrist] = { x: 0.55, y: 0.42 };

    const user: import("@fitness-coach/core").Pose = [];
    user[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
    user[LandmarkIndex.RightHip] = { x: 0.5, y: 0.5 };
    user[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.9 };
    user[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };

    const tf = estimateAlignTransform(stand, user)!;
    const aligned = alignGhostToUser(bottom, user, tf);
    const wristY = aligned[LandmarkIndex.LeftWrist]!.y;
    expect(wristY).toBeGreaterThan(-0.05);
    expect(wristY).toBeLessThan(0.75);
  });

  it("GhostScaleSmoother 行程中冻结尺度", () => {
    const s = new GhostScaleSmoother();
    expect(
      s.update({ scale: 1.0, rot: 0, mode: "upright" }, true, true).scale,
    ).toBeCloseTo(1.0);
    expect(
      s.update({ scale: 1.2, rot: 0, mode: "upright" }, false, true).scale,
    ).toBeCloseTo(1.0);
    expect(
      s.update({ scale: 1.2, rot: 0, mode: "upright" }, true, false).scale,
    ).toBeCloseTo(1.0);
    const next = s.update({ scale: 1.2, rot: 0, mode: "upright" }, true, true);
    expect(next.scale).toBeGreaterThan(1.0);
    expect(next.scale).toBeLessThan(1.2);
  });

  it("侧面示范不因用户腿短而误判 support", () => {
    const demo: import("@fitness-coach/core").Pose = [];
    demo[LandmarkIndex.LeftShoulder] = { x: 0.3, y: 0.35 };
    demo[LandmarkIndex.RightShoulder] = { x: 0.31, y: 0.35 };
    demo[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.45 };
    demo[LandmarkIndex.RightHip] = { x: 0.5, y: 0.45 };
    demo[LandmarkIndex.LeftAnkle] = { x: 0.85, y: 0.55 };
    demo[LandmarkIndex.RightAnkle] = { x: 0.85, y: 0.55 };

    const userFront: import("@fitness-coach/core").Pose = [];
    userFront[LandmarkIndex.LeftShoulder] = { x: 0.3, y: 0.45 };
    userFront[LandmarkIndex.RightShoulder] = { x: 0.7, y: 0.45 };
    userFront[LandmarkIndex.LeftHip] = { x: 0.4, y: 0.4 };
    userFront[LandmarkIndex.RightHip] = { x: 0.6, y: 0.4 };
    userFront[LandmarkIndex.LeftAnkle] = { x: 0.48, y: 0.38 };
    userFront[LandmarkIndex.RightAnkle] = { x: 0.52, y: 0.38 };

    expect(resolveAlignMode(demo, userFront, "auto")).toBe("upright");
    expect(resolveAlignMode(demo, userFront, "upright")).toBe("upright");
  });

  it("缺踝示范骨走 support 对齐到用户肩，不返回原坐标", () => {
    const ghost: import("@fitness-coach/core").Pose = [];
    ghost[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.5 };
    ghost[LandmarkIndex.RightShoulder] = { x: 0.55, y: 0.5 };
    ghost[LandmarkIndex.LeftWrist] = { x: 0.35, y: 0.8 };
    ghost[LandmarkIndex.RightWrist] = { x: 0.6, y: 0.8 };
    ghost[LandmarkIndex.LeftHip] = { x: 0.45, y: 0.45 };
    ghost[LandmarkIndex.RightHip] = { x: 0.52, y: 0.45 };

    const user: import("@fitness-coach/core").Pose = [];
    user[LandmarkIndex.LeftShoulder] = { x: 0.3, y: 0.4 };
    user[LandmarkIndex.RightShoulder] = { x: 0.7, y: 0.4 };
    user[LandmarkIndex.LeftWrist] = { x: 0.25, y: 0.75 };
    user[LandmarkIndex.RightWrist] = { x: 0.75, y: 0.75 };

    const aligned = alignGhostToUser(ghost, user, { mode: "support" });
    const midX =
      (aligned[LandmarkIndex.LeftShoulder]!.x +
        aligned[LandmarkIndex.RightShoulder]!.x) /
      2;
    expect(midX).toBeCloseTo(0.5, 2);
    expect(aligned[LandmarkIndex.LeftShoulder]!.x).not.toBeCloseTo(0.4, 2);
  });

  it("inferSideFacing / matchSideFacing 镜像朝左用户", () => {
    const faceRight: import("@fitness-coach/core").Pose = [];
    faceRight[LandmarkIndex.RightKnee] = { x: 0.62, y: 0.7 };
    faceRight[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
    faceRight[LandmarkIndex.LeftKnee] = { x: 0.6, y: 0.7 };
    faceRight[LandmarkIndex.LeftAnkle] = { x: 0.48, y: 0.9 };
    faceRight[LandmarkIndex.RightHip] = { x: 0.45, y: 0.5 };
    faceRight[LandmarkIndex.LeftHip] = { x: 0.45, y: 0.5 };

    const faceLeft = mirrorPoseX(faceRight, 0.5);
    expect(inferSideFacing(faceRight)).toBe(1);
    expect(inferSideFacing(faceLeft)).toBe(-1);

    const matched = matchSideFacing(faceRight, faceLeft);
    expect(inferSideFacing(matched)).toBe(-1);
  });

  it("matchSideFacing 使用 latched 朝向（示范竖直时也能翻）", () => {
    const demo: import("@fitness-coach/core").Pose = [];
    demo[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.45 };
    demo[LandmarkIndex.RightHip] = { x: 0.5, y: 0.45 };
    demo[LandmarkIndex.LeftKnee] = { x: 0.5, y: 0.7 };
    demo[LandmarkIndex.RightKnee] = { x: 0.5, y: 0.7 };
    demo[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.9 };
    demo[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
    demo[LandmarkIndex.LeftShoulder] = { x: 0.58, y: 0.25 };
    demo[LandmarkIndex.RightShoulder] = { x: 0.58, y: 0.25 };

    const userLeft: import("@fitness-coach/core").Pose = [];
    userLeft[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.45 };
    userLeft[LandmarkIndex.RightHip] = { x: 0.5, y: 0.45 };
    userLeft[LandmarkIndex.LeftAnkle] = { x: 0.4, y: 0.9 };
    userLeft[LandmarkIndex.RightAnkle] = { x: 0.4, y: 0.9 };
    userLeft[LandmarkIndex.LeftKnee] = { x: 0.35, y: 0.7 };
    userLeft[LandmarkIndex.RightKnee] = { x: 0.35, y: 0.7 };

    const matched = matchSideFacing(demo, userLeft, -1);
    expect(matched[LandmarkIndex.LeftShoulder]!.x).toBeLessThan(0.5);
  });

  it("alignGhostToUser 不再做 hip–ankle flipX（朝向只走 matchSideFacing）", () => {
    const ghost: import("@fitness-coach/core").Pose = [];
    ghost[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.4 };
    ghost[LandmarkIndex.RightHip] = { x: 0.5, y: 0.4 };
    ghost[LandmarkIndex.LeftAnkle] = { x: 0.6, y: 0.9 };
    ghost[LandmarkIndex.RightAnkle] = { x: 0.6, y: 0.9 };
    ghost[LandmarkIndex.LeftKnee] = { x: 0.65, y: 0.65 };
    ghost[LandmarkIndex.RightKnee] = { x: 0.65, y: 0.65 };
    ghost[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.2 };
    ghost[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.2 };

    const user: import("@fitness-coach/core").Pose = [];
    user[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.4 };
    user[LandmarkIndex.RightHip] = { x: 0.5, y: 0.4 };
    user[LandmarkIndex.LeftAnkle] = { x: 0.4, y: 0.9 };
    user[LandmarkIndex.RightAnkle] = { x: 0.4, y: 0.9 };
    user[LandmarkIndex.LeftKnee] = { x: 0.35, y: 0.65 };
    user[LandmarkIndex.RightKnee] = { x: 0.35, y: 0.65 };
    user[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.2 };
    user[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.2 };

    // 显式 rot=0：不因用户踝在左而做左右镜像（朝向交给 matchSideFacing）
    const aligned = alignGhostToUser(ghost, user, { scale: 1, rot: 0 });
    const ankleX =
      (aligned[LandmarkIndex.LeftAnkle]!.x +
        aligned[LandmarkIndex.RightAnkle]!.x) /
      2;
    expect(aligned[LandmarkIndex.LeftKnee]!.x).toBeGreaterThan(ankleX);
  });

  it("matchSideFacing latched=0 时不镜像", () => {
    const demo: import("@fitness-coach/core").Pose = [];
    demo[LandmarkIndex.LeftShoulder] = { x: 0.6, y: 0.3 };
    demo[LandmarkIndex.RightShoulder] = { x: 0.6, y: 0.3 };
    const user: import("@fitness-coach/core").Pose = [];
    expect(matchSideFacing(demo, user, 0)[LandmarkIndex.LeftShoulder]!.x).toBe(
      0.6,
    );
  });
});

