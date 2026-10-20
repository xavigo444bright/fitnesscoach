import { describe, expect, it } from "vitest";
import { cuePlanesFor } from "./cuePlanes.data.js";
import { filterRulesForView, ruleAllowedOnPlane } from "./cueView.js";
import { LandmarkIndex, type JointTriplet, type Pose } from "./types.js";

const elbow: JointTriplet = {
  a: LandmarkIndex.LeftShoulder,
  b: LandmarkIndex.LeftElbow,
  c: LandmarkIndex.LeftWrist,
};

function rule(id: string) {
  return {
    id,
    joints: elbow,
    severity: "warning" as const,
    phases: [] as const,
    toleranceDeg: 0,
    message: id,
  };
}

function poseVisible(): Pose {
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.3, visibility: 1 };
  pose[LandmarkIndex.LeftElbow] = { x: 0.42, y: 0.5, visibility: 1 };
  pose[LandmarkIndex.LeftWrist] = { x: 0.44, y: 0.7, visibility: 1 };
  return pose;
}

describe("cueView", () => {
  it("正面关掉只在侧面才有的纠错", () => {
    expect(ruleAllowedOnPlane(["side"], "front")).toBe(false);
    expect(ruleAllowedOnPlane(["side"], "side")).toBe(true);
  });

  it("斜向只留写了 three_quarter，或正侧都能看的规则", () => {
    expect(ruleAllowedOnPlane(["side"], 0)).toBe(false);
    expect(ruleAllowedOnPlane(["three_quarter"], 0)).toBe(true);
    expect(ruleAllowedOnPlane(["front", "side"], 0)).toBe(true);
  });

  it("规格里的规则按机位过滤，点出画也关掉", () => {
    const planes = [{ ruleId: "fly-depth", planes: ["front", "three_quarter"] as const }];
    const kept = filterRulesForView(
      [rule("fly-depth"), rule("other")],
      poseVisible(),
      "side",
      planes,
    );
    expect(kept.map((r) => r.id)).toEqual(["other"]);

    const hidden = poseVisible();
    hidden[LandmarkIndex.LeftWrist] = { x: 0.01, y: 0.7, visibility: 1 };
    expect(
      filterRulesForView([rule("other")], hidden, "front", undefined),
    ).toEqual([]);
  });

  it("祖父动作没有机位表", () => {
    expect(cuePlanesFor("bench-press")).toBeUndefined();
    expect(cuePlanesFor("pullup")).toBeUndefined();
    expect(cuePlanesFor("db-fly")?.some((row) => row.ruleId === "fly-depth")).toBe(
      true,
    );
  });
});
