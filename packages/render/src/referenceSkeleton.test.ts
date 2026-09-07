import {
  buildPushupPose,
  buildSquatPose,
  getDemoTrajectory,
  LandmarkIndex,
  progressByNearestDrive,
  sampleTrajectoryAt,
  type Pose,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { buildRig3d } from "./rig3d.js";
import {
  canonicalPoseFromTrajectory,
  canonicalPoseFromUser,
  referencePoseFromTrajectory,
} from "./referenceSkeleton.js";

function hipY(pose: Pose): number {
  return (
    ((pose[LandmarkIndex.LeftHip] ?? pose[LandmarkIndex.RightHip])!.y +
      (pose[LandmarkIndex.RightHip] ?? pose[LandmarkIndex.LeftHip])!.y) /
    2
  );
}

function shiftPoseY(pose: Pose, dy: number): Pose {
  const out: Pose = [];
  pose.forEach((lm, i) => {
    if (lm) out[i] = { ...lm, y: lm.y + dy };
  });
  return out;
}

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

describe("canonicalPoseFromTrajectory (FR-084 跟相位不贴身)", () => {
  it("enabled=false → null", () => {
    const user = buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 });
    expect(
      canonicalPoseFromTrajectory("squat", user, "descend", 130, {
        enabled: false,
      }),
    ).toBeNull();
  });

  it("stand vs bottom：姿态不同（相位驱动）", () => {
    const user = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 18 });
    const stand = canonicalPoseFromTrajectory("squat", user, "stand", 175)!;
    const bottom = canonicalPoseFromTrajectory("squat", user, "bottom", 90)!;
    const standKnee =
      stand[LandmarkIndex.LeftKnee] ?? stand[LandmarkIndex.RightKnee]!;
    const bottomKnee =
      bottom[LandmarkIndex.LeftKnee] ?? bottom[LandmarkIndex.RightKnee]!;
    const standHip =
      stand[LandmarkIndex.LeftHip] ?? stand[LandmarkIndex.RightHip]!;
    const bottomHip =
      bottom[LandmarkIndex.LeftHip] ?? bottom[LandmarkIndex.RightHip]!;
    const poseDelta =
      Math.abs(standKnee.x - bottomKnee.x) +
      Math.abs(standKnee.y - bottomKnee.y) +
      Math.abs(standHip.x - bottomHip.x) +
      Math.abs(standHip.y - bottomHip.y);
    expect(poseDelta).toBeGreaterThan(0.04);
    expect(Math.abs(bottomKnee.x - bottomHip.x)).toBeGreaterThan(
      Math.abs(standKnee.x - standHip.x) + 0.01,
    );
  });

  it("不同体型用户：canonical 髋不钉用户髋；aligned 骨仍钉用户", () => {
    const userA = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 18 });
    const userB = shiftPoseY(userA, 0.22);
    const canA = canonicalPoseFromTrajectory("squat", userA, "stand", 175)!;
    const canB = canonicalPoseFromTrajectory("squat", userB, "stand", 175)!;
    expect(Math.abs(hipY(canA) - hipY(canB))).toBeLessThan(0.04);
    expect(Math.abs(hipY(canB) - hipY(userB))).toBeGreaterThan(0.08);

    const alA = referencePoseFromTrajectory("squat", userA, "stand", 175)!;
    const alB = referencePoseFromTrajectory("squat", userB, "stand", 175)!;
    expect(Math.abs(hipY(alB) - hipY(userB))).toBeLessThan(0.05);
    expect(Math.abs(hipY(alA) - hipY(alB))).toBeGreaterThan(0.12);
  });

  it("框内拟合后关节与体积都在画幅内（不裁出窗）", () => {
    const user = buildSquatPose({ kneeDeg: 100, torsoLeanDeg: 26 });
    const pose = canonicalPoseFromTrajectory("squat", user, "descend", 100)!;
    for (const lm of pose) {
      if (!lm) continue;
      expect(lm.x).toBeGreaterThan(0.05);
      expect(lm.x).toBeLessThan(0.95);
      expect(lm.y).toBeGreaterThan(0.05);
      expect(lm.y).toBeLessThan(0.95);
    }
    const rig = buildRig3d(pose, { cameraHint: "side", exerciseId: "squat" })!;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const j of rig.joints) {
      expect(j.x).toBeGreaterThan(0.02);
      expect(j.x).toBeLessThan(0.98);
      expect(j.y).toBeGreaterThan(0.02);
      expect(j.y).toBeLessThan(0.98);
      minX = Math.min(minX, j.x);
      minY = Math.min(minY, j.y);
      maxX = Math.max(maxX, j.x);
      maxY = Math.max(maxY, j.y);
    }
    for (const v of rig.volumes) {
      expect(v.x - Math.abs(v.rx)).toBeGreaterThan(0.01);
      expect(v.x + Math.abs(v.rx)).toBeLessThan(0.99);
      expect(v.y - Math.abs(v.ry)).toBeGreaterThan(0.01);
      expect(v.y + Math.abs(v.ry)).toBeLessThan(0.99);
      minX = Math.min(minX, v.x - Math.abs(v.rx));
      minY = Math.min(minY, v.y - Math.abs(v.ry));
      maxX = Math.max(maxX, v.x + Math.abs(v.rx));
      maxY = Math.max(maxY, v.y + Math.abs(v.ry));
    }
    expect((minX + maxX) / 2).toBeGreaterThan(0.42);
    expect((minX + maxX) / 2).toBeLessThan(0.58);
    expect((minY + maxY) / 2).toBeGreaterThan(0.42);
    expect((minY + maxY) / 2).toBeLessThan(0.58);
  });
});

function hipX(pose: Pose): number {
  return (
    ((pose[LandmarkIndex.LeftHip] ?? pose[LandmarkIndex.RightHip])!.x +
      (pose[LandmarkIndex.RightHip] ?? pose[LandmarkIndex.LeftHip])!.x) /
    2
  );
}

function kneeX(pose: Pose): number {
  return (
    ((pose[LandmarkIndex.LeftKnee] ?? pose[LandmarkIndex.RightKnee])!.x +
      (pose[LandmarkIndex.RightKnee] ?? pose[LandmarkIndex.LeftKnee])!.x) /
    2
  );
}

function ankleY(pose: Pose): number {
  return (
    ((pose[LandmarkIndex.LeftAnkle] ?? pose[LandmarkIndex.RightAnkle])!.y +
      (pose[LandmarkIndex.RightAnkle] ?? pose[LandmarkIndex.LeftAnkle])!.y) /
    2
  );
}

/** 侧面深蹲：膝相对髋的前伸 / 髋–踝高度。均匀缩放后不变。 */
function squatFold(pose: Pose): number {
  return Math.abs(kneeX(pose) - hipX(pose)) / Math.max(1e-6, ankleY(pose) - hipY(pose));
}

describe("canonicalPoseFromUser (FR-084 骨骼跟人)", () => {
  it("enabled=false → null", () => {
    const user = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 28 });
    expect(canonicalPoseFromUser(user, { enabled: false })).toBeNull();
  });

  it("跟用户蹲姿，不跟样片站姿", () => {
    const user = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 28 });
    const pip = canonicalPoseFromUser(user, {
      cameraHint: "side",
      exerciseId: "squat",
    })!;
    const sampleStand = canonicalPoseFromTrajectory(
      "squat",
      user,
      "stand",
      175,
    )!;
    const userC = squatFold(user);
    const pipC = squatFold(pip);
    const sampleC = squatFold(sampleStand);
    expect(userC).toBeGreaterThan(0.5);
    expect(Math.abs(pipC - userC)).toBeLessThan(0.08);
    expect(Math.abs(sampleC - userC)).toBeGreaterThan(0.4);
  });

  it("俯卧撑撑地：腕仍在肩下方（跟人，不跳到样片站姿）", () => {
    const user = buildPushupPose({ elbowDeg: 165 });
    const pip = canonicalPoseFromUser(user, {
      cameraHint: "front",
      exerciseId: "pushup",
    })!;
    const sh =
      (user[LandmarkIndex.LeftShoulder]!.y +
        user[LandmarkIndex.RightShoulder]!.y) /
      2;
    const wr =
      (user[LandmarkIndex.LeftWrist]!.y + user[LandmarkIndex.RightWrist]!.y) /
      2;
    const pipSh =
      (pip[LandmarkIndex.LeftShoulder]!.y +
        pip[LandmarkIndex.RightShoulder]!.y) /
      2;
    const pipWr =
      (pip[LandmarkIndex.LeftWrist]!.y + pip[LandmarkIndex.RightWrist]!.y) / 2;
    expect(wr).toBeGreaterThan(sh);
    expect(pipWr).toBeGreaterThan(pipSh);
  });
});
