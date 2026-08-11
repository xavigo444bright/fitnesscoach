import {
  buildPushupPose,
  buildSquatPose,
  getDemoTrajectory,
  LandmarkIndex,
  progressByNearestDrive,
  sampleTrajectoryAt,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { referencePoseFromTrajectory } from "./referenceSkeleton.js";

describe("referencePoseFromTrajectory (FR-068)", () => {
  it("enabled=false → null", () => {
    const user = buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 });
    expect(
      referencePoseFromTrajectory("squat", user, "descend", 130, {
        enabled: false,
      }),
    ).toBeNull();
  });

  it("对齐后钉用户踝；深膝角取样驱动角小于站立", () => {
    const user = buildSquatPose({ kneeDeg: 100, torsoLeanDeg: 26 });
    const traj = getDemoTrajectory("squat");
    const ref = referencePoseFromTrajectory("squat", user, "descend", 100, {
      trajectory: traj,
      enabled: true,
    });
    expect(ref).toBeTruthy();
    const ua =
      (user[LandmarkIndex.LeftAnkle]!.y + user[LandmarkIndex.RightAnkle]!.y) / 2;
    const ra =
      (ref![LandmarkIndex.LeftAnkle]!.y + ref![LandmarkIndex.RightAnkle]!.y) /
      2;
    expect(Math.abs(ra - ua)).toBeLessThan(0.02);

    const deepDrive = sampleTrajectoryAt(
      traj,
      progressByNearestDrive(traj, "descend", 100),
    ).driveDeg!;
    const standDrive = sampleTrajectoryAt(
      traj,
      progressByNearestDrive(traj, "stand", 175),
    ).driveDeg!;
    expect(deepDrive).toBeLessThan(standDrive);
  });

  it("俯卧撑轨迹 stand/bottom 驱动角不同", () => {
    const traj = getDemoTrajectory("pushup", "side");
    const user = buildPushupPose({ elbowDeg: 170 });
    const stand = referencePoseFromTrajectory("pushup", user, "stand", 170, {
      trajectory: traj,
      cameraHint: "side",
    })!;
    const bottom = referencePoseFromTrajectory("pushup", user, "bottom", 95, {
      trajectory: traj,
      cameraHint: "side",
    })!;
    const sShoulder =
      stand[LandmarkIndex.RightShoulder] ?? stand[LandmarkIndex.LeftShoulder]!;
    const bShoulder =
      bottom[LandmarkIndex.RightShoulder] ??
      bottom[LandmarkIndex.LeftShoulder]!;
    const sWrist =
      stand[LandmarkIndex.RightWrist] ?? stand[LandmarkIndex.LeftWrist]!;
    const bWrist =
      bottom[LandmarkIndex.RightWrist] ?? bottom[LandmarkIndex.LeftWrist]!;
    const sLen = Math.hypot(sWrist.x - sShoulder.x, sWrist.y - sShoulder.y);
    const bLen = Math.hypot(bWrist.x - bShoulder.x, bWrist.y - bShoulder.y);
    expect(Math.abs(sLen - bLen) + Math.abs(sWrist.y - bWrist.y)).toBeGreaterThan(
      0.01,
    );
  });

  it("侧面俯卧撑：对齐后肩中点接近用户肩（plank）", () => {
    const user = buildPushupPose({ elbowDeg: 165 });
    const ref = referencePoseFromTrajectory("pushup", user, "stand", 165, {
      cameraHint: "side",
      enabled: true,
    })!;
    const uShX =
      (user[LandmarkIndex.LeftShoulder]!.x +
        user[LandmarkIndex.RightShoulder]!.x) /
      2;
    const uShY =
      (user[LandmarkIndex.LeftShoulder]!.y +
        user[LandmarkIndex.RightShoulder]!.y) /
      2;
    const rShX =
      ((ref[LandmarkIndex.LeftShoulder] ?? ref[LandmarkIndex.RightShoulder])!
        .x +
        (ref[LandmarkIndex.RightShoulder] ?? ref[LandmarkIndex.LeftShoulder])!
          .x) /
      2;
    const rShY =
      ((ref[LandmarkIndex.LeftShoulder] ?? ref[LandmarkIndex.RightShoulder])!
        .y +
        (ref[LandmarkIndex.RightShoulder] ?? ref[LandmarkIndex.LeftShoulder])!
          .y) /
      2;
    expect(Math.abs(rShX - uShX)).toBeLessThan(0.08);
    expect(Math.abs(rShY - uShY)).toBeLessThan(0.08);
  });

  it("正面俯卧撑：缺踝示范骨仍对齐到用户肩（非原坐标）", () => {
    const user: import("@fitness-coach/core").Pose = [];
    user[LandmarkIndex.LeftShoulder] = { x: 0.32, y: 0.42 };
    user[LandmarkIndex.RightShoulder] = { x: 0.68, y: 0.42 };
    user[LandmarkIndex.LeftElbow] = { x: 0.26, y: 0.55 };
    user[LandmarkIndex.RightElbow] = { x: 0.74, y: 0.55 };
    user[LandmarkIndex.LeftWrist] = { x: 0.22, y: 0.72 };
    user[LandmarkIndex.RightWrist] = { x: 0.78, y: 0.72 };
    user[LandmarkIndex.LeftHip] = { x: 0.4, y: 0.38 };
    user[LandmarkIndex.RightHip] = { x: 0.6, y: 0.38 };

    const ref = referencePoseFromTrajectory("pushup", user, "stand", 170, {
      cameraHint: "front",
      enabled: true,
    })!;
    const uShX =
      (user[LandmarkIndex.LeftShoulder]!.x +
        user[LandmarkIndex.RightShoulder]!.x) /
      2;
    const uShY =
      (user[LandmarkIndex.LeftShoulder]!.y +
        user[LandmarkIndex.RightShoulder]!.y) /
      2;
    const rShX =
      (ref[LandmarkIndex.LeftShoulder]!.x +
        ref[LandmarkIndex.RightShoulder]!.x) /
      2;
    const rShY =
      (ref[LandmarkIndex.LeftShoulder]!.y +
        ref[LandmarkIndex.RightShoulder]!.y) /
      2;
    expect(Math.abs(rShX - uShX)).toBeLessThan(0.04);
    expect(Math.abs(rShY - uShY)).toBeLessThan(0.04);
    // 腕应在肩下方（俯卧撑支撑），且肩宽接近用户
    const rShW = Math.abs(
      ref[LandmarkIndex.LeftShoulder]!.x - ref[LandmarkIndex.RightShoulder]!.x,
    );
    expect(rShW).toBeGreaterThan(0.25);
    const rWrY =
      ((ref[LandmarkIndex.LeftWrist]?.y ?? 0) +
        (ref[LandmarkIndex.RightWrist]?.y ?? 0)) /
      2;
    expect(rWrY).toBeGreaterThan(rShY + 0.05);
  });
});
