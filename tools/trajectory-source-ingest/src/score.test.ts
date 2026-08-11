import { describe, expect, it } from "vitest";
import { synthesizePoseDump } from "@fitness-coach/core";
import { dryRunPoseDump, stretchPoseDumpDuration } from "./fixture.js";
import {
  MAX_CLIP_SEC,
  MIN_CLIP_SEC,
  MIN_REPS,
  PREFERRED_CLIP_SEC_MAX,
  selectCandidateWindows,
} from "./score.js";

describe("trajectory-source-ingest score", () => {
  it("dry-run 夹具选出 ≥1 条符合样片标准的候选", () => {
    const dump = dryRunPoseDump("squat", 12);
    const result = selectCandidateWindows(dump, {
      exerciseId: "squat",
      cameraHint: "side",
    });

    expect(result.durationSec).toBeGreaterThanOrEqual(MIN_CLIP_SEC);
    expect(result.durationSec).toBeLessThanOrEqual(MAX_CLIP_SEC + 1);
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);

    const best = result.candidates[0]!;
    expect(best.estimatedReps).toBeGreaterThanOrEqual(MIN_REPS);
    expect(best.selected).toBe(true);
    expect(best.score).toBeGreaterThanOrEqual(0.55);
    const dur = best.timeRange.endSec - best.timeRange.startSec;
    expect(dur).toBeGreaterThanOrEqual(MIN_CLIP_SEC - 0.05);
    expect(dur).toBeLessThanOrEqual(MAX_CLIP_SEC + 0.05);
  });

  it("短于旧 8s 门禁但有足够 rep 的片可入选（时长软偏好）", () => {
    const short = stretchPoseDumpDuration(synthesizePoseDump("squat", 3), 4);
    const result = selectCandidateWindows(short, {
      exerciseId: "squat",
      cameraHint: "side",
    });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    const best = result.candidates[0]!;
    expect(best.estimatedReps).toBeGreaterThanOrEqual(MIN_REPS);
    const dur = best.timeRange.endSec - best.timeRange.startSec;
    expect(dur).toBeLessThan(8);
    expect(dur).toBeGreaterThanOrEqual(MIN_CLIP_SEC - 0.05);
  });

  it("极端过短（<1.5s）仍淘汰", () => {
    const tiny = stretchPoseDumpDuration(synthesizePoseDump("squat", 3), 1);
    const result = selectCandidateWindows(tiny, {
      exerciseId: "squat",
      cameraHint: "side",
    });
    expect(result.candidates.length).toBe(0);
    expect(result.rejected.length).toBeGreaterThan(0);
  });

  it("拉伸后 pushup 也可入选", () => {
    const dump = stretchPoseDumpDuration(
      synthesizePoseDump("pushup", 3),
      Math.min(14, PREFERRED_CLIP_SEC_MAX),
    );
    const result = selectCandidateWindows(dump, {
      exerciseId: "pushup",
      cameraHint: "side",
    });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates[0]!.estimatedReps).toBeGreaterThanOrEqual(MIN_REPS);
  });
});
