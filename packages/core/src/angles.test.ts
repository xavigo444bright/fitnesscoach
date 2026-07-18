import { describe, expect, it } from "vitest";
import { angleBetween, jointAngle } from "./angles.js";
import { LandmarkIndex, type Pose } from "./types.js";

const p = (x: number, y: number) => ({ x, y });

describe("angleBetween", () => {
  it("直角 = 90°", () => {
    // b 在原点，a 在右，c 在上
    expect(angleBetween(p(1, 0), p(0, 0), p(0, 1))).toBeCloseTo(90, 5);
  });

  it("共线同向 = 0°", () => {
    expect(angleBetween(p(2, 0), p(1, 0), p(3, 0))).toBeCloseTo(0, 5);
  });

  it("共线反向（伸直）= 180°", () => {
    expect(angleBetween(p(0, 0), p(1, 0), p(2, 0))).toBeCloseTo(180, 5);
  });

  it("45°", () => {
    expect(angleBetween(p(1, 0), p(0, 0), p(1, 1))).toBeCloseTo(45, 5);
  });

  it("结果与点顺序无关（a、c 互换相同）", () => {
    const a = p(1, 0);
    const b = p(0, 0);
    const c = p(0.3, 0.8);
    expect(angleBetween(a, b, c)).toBeCloseTo(angleBetween(c, b, a), 5);
  });

  it("始终落在 [0,180]", () => {
    expect(angleBetween(p(-1, -1), p(0, 0), p(1, -1))).toBeGreaterThanOrEqual(0);
    expect(angleBetween(p(-1, -1), p(0, 0), p(1, -1))).toBeLessThanOrEqual(180);
  });
});

describe("jointAngle", () => {
  const pose: Pose = [];
  pose[LandmarkIndex.LeftHip] = p(0, 0);
  pose[LandmarkIndex.LeftKnee] = p(0, 1);
  pose[LandmarkIndex.LeftAnkle] = p(0, 2);

  it("伸直的腿（髋-膝-踝共线）≈ 180°", () => {
    const deg = jointAngle(pose, {
      a: LandmarkIndex.LeftHip,
      b: LandmarkIndex.LeftKnee,
      c: LandmarkIndex.LeftAnkle,
    });
    expect(deg).not.toBeNull();
    expect(deg as number).toBeCloseTo(180, 5);
  });

  it("缺点返回 null", () => {
    const deg = jointAngle(pose, {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    });
    expect(deg).toBeNull();
  });
});
