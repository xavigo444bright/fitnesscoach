import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LandmarkIndex } from "../types.js";
import {
  extractFromPoseDump,
  filterLowConfidenceFrames,
  findRepLoops,
  sampleTrajectoryAt,
} from "./clean.js";
import { parseDemoTrajectory, parseDemoTrajectoryJson } from "./parse.js";
import { getDemoTrajectory, hasDemoTrajectory, listDemoTrajectoryIds } from "./registry.js";
import { poseFromFrame } from "./serialize.js";
import {
  synthesizeDemoTrajectory,
  synthesizeMultiRepSequence,
  synthesizePoseDump,
} from "./synthesize.js";
import { TRAJECTORY_SCHEMA_VERSION } from "./types.js";

const TRAJ_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../trajectories",
);

describe("trajectory format + extract (T7-1 / FR-067 / VT-P7-001)", () => {
  it("弓步合成序列能检出循环", () => {
    const raw = synthesizeMultiRepSequence("lunge", 3);
    const loops = findRepLoops(raw, "lunge");
    expect(loops.length).toBeGreaterThanOrEqual(1);
    const traj = synthesizeDemoTrajectory("lunge");
    expect(traj.exerciseId).toBe("lunge");
    expect(traj.frames.some((f) => f.phase === "bottom")).toBe(true);
  });

  it("合成多 rep 能检出 ≥1 个完整循环", () => {
    for (const id of ["squat", "pushup"] as const) {
      const raw = synthesizeMultiRepSequence(id, 3);
      const loops = findRepLoops(raw, id);
      expect(loops.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("臀桥：顶髋开局仍能提取 rest→peak 循环", () => {
    const traj = synthesizeDemoTrajectory("glute-bridge");
    expect(traj.exerciseId).toBe("glute-bridge");
    expect(traj.frames.length).toBeGreaterThanOrEqual(8);
    expect(traj.frames[0]!.t).toBe(0);
    expect(traj.frames[traj.frames.length - 1]!.t).toBe(1);
    expect(traj.frames.some((f) => f.phase === "bottom")).toBe(true);
    expect(traj.frames.some((f) => f.phase === "stand")).toBe(true);
    const drives = traj.frames
      .map((f) => f.driveDeg)
      .filter((d): d is number => d != null);
    expect(Math.max(...drives)).toBeGreaterThan(48);
    expect(Math.min(...drives)).toBeLessThan(18);
    expect(drives[drives.length - 1]!).toBeGreaterThan(40);
  });

  it("臀桥 PoseDump → extractFromPoseDump 可 parse", () => {
    const dump = synthesizePoseDump("glute-bridge", 2);
    const traj = extractFromPoseDump(dump, {
      exerciseId: "glute-bridge",
      id: "glute-bridge-from-dump",
    });
    const again = parseDemoTrajectoryJson(JSON.stringify(traj));
    expect(again.id).toBe("glute-bridge-from-dump");
    expect(again.frames.length).toBe(traj.frames.length);
  });

  it("hasDemoTrajectory：臀桥/弓步/本批四动作未打包", () => {
    expect(hasDemoTrajectory("glute-bridge", "side")).toBe(false);
    expect(() => getDemoTrajectory("glute-bridge")).toThrow(/not bundled/);
    expect(hasDemoTrajectory("lunge", "side")).toBe(false);
    expect(() => getDemoTrajectory("lunge")).toThrow(/not bundled/);
    for (const id of ["plank", "db-row", "ohp", "bench-press", "rdl", "pullup", "db-fly", "dip", "incline-pushup", "cable-crossover", "chest-press-machine", "lateral-raise", "front-raise", "rear-delt-fly", "face-pull", "pike-pushup"] as const) {
      expect(hasDemoTrajectory(id, "side")).toBe(false);
      expect(() => getDemoTrajectory(id)).toThrow(/not bundled/);
    }
    expect(hasDemoTrajectory("cable-crossover", "front")).toBe(false);
    expect(hasDemoTrajectory("lateral-raise", "front")).toBe(false);
  });

  it("synthesize 上斜/夹胸/推胸器能裁出含 bottom 的循环", () => {
    for (const id of [
      "incline-pushup",
      "cable-crossover",
      "chest-press-machine",
      "lateral-raise",
      "front-raise",
      "rear-delt-fly",
      "face-pull",
      "pike-pushup",
    ] as const) {
      const traj = synthesizeDemoTrajectory(id);
      expect(traj.frames.length).toBeGreaterThanOrEqual(8);
      expect(traj.frames.some((f) => f.phase === "bottom")).toBe(true);
    }
  });

  it("extract 产出 schema 合法、t 单调、首尾 0/1", () => {
    for (const id of ["squat", "pushup"] as const) {
      const traj = synthesizeDemoTrajectory(id);
      expect(traj.schemaVersion).toBe(TRAJECTORY_SCHEMA_VERSION);
      expect(traj.exerciseId).toBe(id);
      expect(traj.frames.length).toBeGreaterThanOrEqual(8);
      expect(traj.frames[0]!.t).toBe(0);
      expect(traj.frames[traj.frames.length - 1]!.t).toBe(1);
      expect(traj.frames.some((f) => f.phase === "bottom")).toBe(true);
      const hip =
        poseFromFrame(traj.frames[0]!)[LandmarkIndex.RightHip] ??
        poseFromFrame(traj.frames[0]!)[LandmarkIndex.LeftHip];
      expect(hip).toBeTruthy();
    }
  });

  it("PoseDump → extractFromPoseDump 与 synthesize 等价可加载", () => {
    const dump = synthesizePoseDump("squat", 2);
    const traj = extractFromPoseDump(dump, {
      exerciseId: "squat",
      id: "squat-from-dump",
    });
    const again = parseDemoTrajectoryJson(JSON.stringify(traj));
    expect(again.id).toBe("squat-from-dump");
    expect(again.frames.length).toBe(traj.frames.length);
  });

  it("低 visibility 帧被过滤", () => {
    const raw = synthesizeMultiRepSequence("squat", 1).map((fr, i) => {
      if (i !== 2) return fr;
      return {
        ...fr,
        pose: fr.pose.map((lm) =>
          lm ? { ...lm, visibility: 0.1 } : undefined,
        ),
      };
    });
    const filtered = filterLowConfidenceFrames(raw);
    expect(filtered.length).toBeLessThan(raw.length);
  });

  it("bundled 深蹲/俯卧撑 侧面+正面，parse 往返稳定", () => {
    expect(listDemoTrajectoryIds()).toEqual(
      expect.arrayContaining([
        "squat-side-v1",
        "squat-front-v1",
        "pushup-side-v1",
        "pushup-front-v1",
      ]),
    );
    expect(getDemoTrajectory("squat", "side").meta.cameraHint).toBe("side");
    expect(getDemoTrajectory("squat", "front").meta.cameraHint).toBe("front");
    expect(getDemoTrajectory("pushup", "side").meta.cameraHint).toBe("side");
    expect(getDemoTrajectory("pushup", "front").meta.cameraHint).toBe("front");
    expect(getDemoTrajectory("pushup").source.type).toBe("video");
    for (const id of ["squat", "pushup"] as const) {
      const traj = getDemoTrajectory(id);
      const round = parseDemoTrajectory(
        JSON.parse(JSON.stringify(traj)) as unknown,
      );
      expect(round.exerciseId).toBe(id);
      expect(round.frames.length).toBe(traj.frames.length);
    }
  });

  it("sampleTrajectoryAt 中间进度有关键点", () => {
    const traj = getDemoTrajectory("squat");
    const mid = sampleTrajectoryAt(traj, 0.5);
    expect(mid.t).toBe(0.5);
    expect(mid.landmarks.length).toBeGreaterThan(0);
    const pose = poseFromFrame(mid);
    expect(
      pose[LandmarkIndex.RightKnee] ?? pose[LandmarkIndex.LeftKnee],
    ).toBeTruthy();
  });

  it("非法 schema 被拒绝", () => {
    expect(() =>
      parseDemoTrajectory({ schemaVersion: "0.9", id: "x" }),
    ).toThrow(/schemaVersion/);
  });

  it("磁盘 JSON 可被 core 加载（VT-P7-001）", () => {
    for (const [name, cam] of [
      ["squat-side-v1.json", "side"],
      ["squat-side-v2.json", "side"],
      ["pushup-side-v1.json", "side"],
      ["pushup-front-v1.json", "front"],
    ] as const) {
      const text = readFileSync(join(TRAJ_DIR, name), "utf8");
      const traj = parseDemoTrajectoryJson(text);
      expect(traj.frames.length).toBeGreaterThanOrEqual(8);
      expect(traj.meta.cameraHint).toBe(cam);
    }
  });

  it("磁盘臀桥 JSON 可被 core 加载（未打包进 registry）", () => {
    const text = readFileSync(join(TRAJ_DIR, "glute-bridge-side-v1.json"), "utf8");
    const traj = parseDemoTrajectoryJson(text);
    expect(traj.exerciseId).toBe("glute-bridge");
    expect(traj.frames.length).toBeGreaterThanOrEqual(8);
    expect(traj.meta.cameraHint).toBe("side");
    const last = traj.frames[traj.frames.length - 1]!;
    const first = traj.frames[0]!;
    expect(first.phase).toBe("stand");
    expect(last.driveDeg!).toBeGreaterThan(40);
  });

  it("磁盘弓步 JSON 可被 core 加载（未打包进 registry）", () => {
    const text = readFileSync(join(TRAJ_DIR, "lunge-side-v1.json"), "utf8");
    const traj = parseDemoTrajectoryJson(text);
    expect(traj.exerciseId).toBe("lunge");
    expect(traj.frames.length).toBeGreaterThanOrEqual(8);
    expect(traj.meta.cameraHint).toBe("side");
    expect(traj.frames.some((f) => f.phase === "bottom")).toBe(true);
    expect(traj.frames.some((f) => f.phase === "stand")).toBe(true);
    const drives = traj.frames
      .map((f) => f.driveDeg)
      .filter((d): d is number => d != null);
    expect(Math.min(...drives)).toBeLessThan(100);
    expect(Math.max(...drives)).toBeGreaterThan(150);
  });
});
