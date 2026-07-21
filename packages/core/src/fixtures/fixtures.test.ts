import { describe, expect, it } from "vitest";
import { jointAngle } from "../angles.js";
import { LandmarkIndex, type Fixture, type Pose } from "../types.js";
import { FIXTURES } from "./index.js";

const REQUIRED_INDICES = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.RightKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
];

const rightKnee = (pose: Pose) =>
  jointAngle(pose, {
    a: LandmarkIndex.RightHip,
    b: LandmarkIndex.RightKnee,
    c: LandmarkIndex.RightAnkle,
  });

const firstPose = (fx: Fixture): Pose => fx.pose ?? fx.sequence![0];

describe("VT-P1-010 夹具完备性", () => {
  const expectedIds = [
    "FX-SQUAT-STAND",
    "FX-SQUAT-BOTTOM-OK",
    "FX-SQUAT-SHALLOW",
    "FX-SQUAT-VALGUS-L",
    "FX-SQUAT-LEAN",
    "FX-SEQ-5REPS",
  ];

  it("六组夹具齐全", () => {
    expect(Object.keys(FIXTURES).sort()).toEqual([...expectedIds].sort());
  });

  for (const id of expectedIds) {
    describe(id, () => {
      const fx = FIXTURES[id];

      it("有姿态或序列", () => {
        expect(fx.pose || fx.sequence).toBeTruthy();
      });

      it("必需关键点齐全", () => {
        const pose = firstPose(fx);
        for (const idx of REQUIRED_INDICES) {
          expect(pose[idx], `index ${idx}`).toBeTruthy();
        }
      });
    });
  }
});

describe("夹具几何自洽（用 angles.ts 复核膝角）", () => {
  it("STAND 膝角 > 160°", () => {
    expect(rightKnee(FIXTURES["FX-SQUAT-STAND"].pose!)!).toBeGreaterThan(160);
  });

  it("BOTTOM-OK 膝角 < 90°", () => {
    expect(rightKnee(FIXTURES["FX-SQUAT-BOTTOM-OK"].pose!)!).toBeLessThan(90);
  });

  it("SHALLOW 膝角 ≥110°（深度 error 触发线）", () => {
    const deg = rightKnee(FIXTURES["FX-SQUAT-SHALLOW"].pose!)!;
    expect(deg).toBeGreaterThanOrEqual(110);
    expect(deg).toBeLessThan(160);
  });

  it("SEQ-5REPS 覆盖站立与底部两端", () => {
    const seq = FIXTURES["FX-SEQ-5REPS"].sequence!;
    const knees = seq.map((p) => rightKnee(p)!);
    expect(Math.max(...knees)).toBeGreaterThan(160);
    expect(Math.min(...knees)).toBeLessThan(90);
    expect(seq.length).toBe(5 * 5 * 6);
  });
});

describe("夹具元数据（期望状态/规则）", () => {
  it("SHALLOW 期望触发 squat-depth", () => {
    expect(FIXTURES["FX-SQUAT-SHALLOW"].expectedRuleIds).toContain("squat-depth");
  });

  it("VALGUS-L 侧摄禁用：不期望触发 knee-valgus-l", () => {
    expect(FIXTURES["FX-SQUAT-VALGUS-L"].expectedRuleIds ?? []).not.toContain(
      "knee-valgus-l",
    );
    expect(FIXTURES["FX-SQUAT-VALGUS-L"].expectedStatus).toBe("correct");
  });

  it("LEAN 期望触发 torso-upright（warning）", () => {
    expect(FIXTURES["FX-SQUAT-LEAN"].expectedRuleIds).toContain("torso-upright");
    expect(FIXTURES["FX-SQUAT-LEAN"].expectedStatus).toBe("warning");
  });

  it("SEQ-5REPS 期望 5 次", () => {
    expect(FIXTURES["FX-SEQ-5REPS"].expectedRepCount).toBe(5);
  });
});
