/**
 * VT-P5-004：同一夹具经 pose-mp（MoveNet 17→MediaPipe 33）映射后，
 * validate status / 触发规则与直接喂 core 一致。
 */
import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  LandmarkIndex,
  validate,
  type Phase,
  type Pose,
} from "@fitness-coach/core";
import { analyzeMoveNetResult } from "./analyze.js";
import {
  movenetKeypointsToPose,
  type MoveNetKeypoint,
} from "./movenetMap.js";

/** 单帧夹具相位（与 core validate.test 对齐）。 */
const PHASE_OF: Record<string, Phase> = {
  "FX-SQUAT-STAND": "stand",
  "FX-SQUAT-BOTTOM-OK": "bottom",
  "FX-SQUAT-SHALLOW": "bottom",
  "FX-SQUAT-VALGUS-L": "bottom",
  "FX-SQUAT-LEAN": "descend",
};

/** 将 core Pose 转为「伪 MoveNet 像素关键点」（模拟小程序 detect 输出）。 */
export function corePoseToMoveNetKeypoints(
  pose: Pose,
  frameWidth = 192,
  frameHeight = 192,
): MoveNetKeypoint[] {
  const pairs: [string, number][] = [
    ["left_shoulder", LandmarkIndex.LeftShoulder],
    ["right_shoulder", LandmarkIndex.RightShoulder],
    ["left_hip", LandmarkIndex.LeftHip],
    ["right_hip", LandmarkIndex.RightHip],
    ["left_knee", LandmarkIndex.LeftKnee],
    ["right_knee", LandmarkIndex.RightKnee],
    ["left_ankle", LandmarkIndex.LeftAnkle],
    ["right_ankle", LandmarkIndex.RightAnkle],
  ];
  const out: MoveNetKeypoint[] = [];
  for (const [name, idx] of pairs) {
    const lm = pose[idx];
    if (!lm) continue;
    out.push({
      name,
      x: lm.x * frameWidth,
      y: lm.y * frameHeight,
      score: lm.visibility ?? 1,
    });
  }
  return out;
}

function triggeredIds(pose: Pose, phase: Phase): string[] {
  return validate(pose, phase)
    .results.filter((r) => r.triggered)
    .map((r) => r.id)
    .sort();
}

describe("VT-P5-004 pose-mp ↔ core 夹具一致", () => {
  for (const id of Object.keys(PHASE_OF)) {
    it(`${id}: status + rules 与直喂 core 相同`, () => {
      const fx = FIXTURES[id]!;
      const phase = PHASE_OF[id]!;
      const direct = validate(fx.pose!, phase);

      const kps = corePoseToMoveNetKeypoints(fx.pose!);
      const mapped = movenetKeypointsToPose(kps, 192, 192);
      const viaMp = validate(mapped, phase);

      expect(viaMp.status).toBe(direct.status);
      expect(viaMp.status).toBe(fx.expectedStatus);
      expect(triggeredIds(mapped, phase)).toEqual(triggeredIds(fx.pose!, phase));
      expect(triggeredIds(mapped, phase)).toEqual(
        [...(fx.expectedRuleIds ?? [])].sort(),
      );
    });
  }

  it("analyzeMoveNetResult 与 validate 对齐（SHALLOW）", () => {
    const fx = FIXTURES["FX-SQUAT-SHALLOW"]!;
    const kps = corePoseToMoveNetKeypoints(fx.pose!);
    const analysis = analyzeMoveNetResult(
      {
        count: kps.length,
        detectedOf17: kps.length,
        keypoints: kps,
        frameWidth: 192,
        frameHeight: 192,
      },
      "bottom",
    );
    expect(analysis.validation.status).toBe("error");
    expect(
      analysis.validation.results
        .filter((r) => r.triggered)
        .map((r) => r.id),
    ).toContain("squat-depth");
  });
});
