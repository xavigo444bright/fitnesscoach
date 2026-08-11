import { buildPushupPose, buildSquatPose, LandmarkIndex } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { buildAnatomyGuideScene } from "./anatomyGuide.js";

describe("buildAnatomyGuideScene (FR-068 A)", () => {
  it("深蹲站立：必有 spine / head / hip / 双腿 guides", () => {
    const pose = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 12 });
    const scene = buildAnatomyGuideScene(pose);
    expect(scene.guides?.length).toBeGreaterThanOrEqual(4);
    const kinds = new Set(scene.guides!.map((g) => g.kind));
    expect(kinds.has("spine")).toBe(true);
    expect(kinds.has("head")).toBe(true);
    expect(kinds.has("hip")).toBe(true);
    expect(kinds.has("limb")).toBe(true);
    expect(scene.guides!.some((g) => g.id === "spine")).toBe(true);
    expect(scene.guides!.find((g) => g.id === "spine")!.points.length).toBeGreaterThan(
      4,
    );
    expect(scene.guides!.find((g) => g.id === "head")!.points.length).toBeGreaterThan(
      8,
    );
  });

  it("俯卧撑侧面：有臂/腿 guide，缺侧不崩溃", () => {
    const pose = buildPushupPose({ elbowDeg: 165 });
    const scene = buildAnatomyGuideScene(pose);
    expect(scene.guides?.some((g) => g.kind === "spine")).toBe(true);
    expect(scene.guides?.some((g) => g.kind === "limb")).toBe(true);
    // 关键关节点缀存在
    expect(
      scene.joints.some((j) => j.index === LandmarkIndex.LeftShoulder),
    ).toBe(true);
  });

  it("仅肩髋时仍产出 spine+head+hip", () => {
    const pose: import("@fitness-coach/core").Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.3 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.6, y: 0.3 };
    pose[LandmarkIndex.LeftHip] = { x: 0.42, y: 0.55 };
    pose[LandmarkIndex.RightHip] = { x: 0.58, y: 0.55 };
    const scene = buildAnatomyGuideScene(pose);
    const ids = scene.guides!.map((g) => g.id);
    expect(ids).toContain("spine");
    expect(ids).toContain("head");
    expect(ids).toContain("hip");
  });
});
