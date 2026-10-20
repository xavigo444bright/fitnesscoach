import { describe, expect, it } from "vitest";
import {
  assertScoutLookWindow,
  assertScoutMatches,
  inferWindowKind,
  intersectSearchBandWithReadableRom,
  ingestSkipReason,
  loadScoutRegistry,
  parseScoutIdList,
  poseSkipReason,
  requireScoutClip,
  resolveScoutUrl,
  urlsReferToSameSource,
  youtubeVideoId,
  type ScoutClip,
} from "./scout.js";

function proposedClip(over: Partial<ScoutClip>): ScoutClip {
  return {
    id: "test-clip",
    exerciseId: "lunge",
    name: "弓步蹲",
    camera: "side",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    startSec: 10,
    endSec: 18,
    why: "test",
    status: "proposed",
    role: "primary",
    windowKind: "reps",
    timeSource: "unverified",
    ...over,
  };
}

describe("ASSET-SCOUT registry", () => {
  it("loads grandfathered 10 plus Phase E/F/G and unique ids", () => {
    const reg = loadScoutRegistry();
    expect(reg.schemaVersion).toBe("1.0");
    expect(reg.clips.length).toBe(67);
    const ids = new Set(reg.clips.map((c) => c.id));
    expect(ids.size).toBe(reg.clips.length);
    const exercises = new Set(reg.clips.map((c) => c.exerciseId));
    expect([...exercises].sort()).toEqual(
      [
        "band-row",
        "bench-press",
        "bird-dog",
        "cable-crossover",
        "calf-raise",
        "chest-press-machine",
        "crunch",
        "db-fly",
        "db-row",
        "dead-bug",
        "dip",
        "face-pull",
        "front-raise",
        "glute-bridge",
        "goblet-squat",
        "hanging-knee-raise",
        "incline-pushup",
        "lat-pulldown",
        "lateral-raise",
        "leg-press",
        "lunge",
        "ohp",
        "pike-pushup",
        "plank",
        "pullup",
        "pushup",
        "rdl",
        "rear-delt-fly",
        "seated-row",
        "side-plank",
        "squat",
        "superman",
      ].sort(),
    );
  });

  it("lists Phase E required cameras as authorized user-verified windows", () => {
    const flyQ = requireScoutClip("db-fly-three_quarter-01");
    expect(flyQ.status).toBe("authorized");
    expect(flyQ.camera).toBe("three_quarter");
    expect(flyQ.startSec).toBe(1);
    expect(flyQ.endSec).toBe(7);
    expect(requireScoutClip("db-fly-front-01")).toMatchObject({
      camera: "front",
      startSec: 120,
      endSec: 128,
      timeSource: "user-verified",
    });
    expect(requireScoutClip("dip-three_quarter-01")).toMatchObject({
      startSec: 60,
      endSec: 67,
    });
    expect(requireScoutClip("dip-front-01")).toMatchObject({
      startSec: 143,
      endSec: 148,
      cameraStability: "moving",
    });
    expect(requireScoutClip("incline-pushup-side-01")).toMatchObject({
      startSec: 1,
      endSec: 5,
    });
    expect(requireScoutClip("incline-pushup-front-01")).toMatchObject({
      startSec: 3,
      endSec: 12,
    });
    expect(requireScoutClip("cable-crossover-front-01")).toMatchObject({
      startSec: 1,
      endSec: 5,
    });
    expect(requireScoutClip("chest-press-machine-side-01")).toMatchObject({
      startSec: 49,
      endSec: 54,
    });
    expect(
      requireScoutClip("chest-press-machine-three_quarter-01"),
    ).toMatchObject({
      startSec: 99,
      endSec: 105,
    });
  });

  it("lists Phase F required cameras as authorized user-verified windows", () => {
    expect(requireScoutClip("lateral-raise-front-01")).toMatchObject({
      exerciseId: "lateral-raise",
      camera: "front",
      status: "authorized",
      timeSource: "user-verified",
      startSec: 1,
      endSec: 7,
    });
    expect(requireScoutClip("front-raise-side-01")).toMatchObject({
      exerciseId: "front-raise",
      camera: "side",
      status: "authorized",
      startSec: 1,
      endSec: 7,
    });
    expect(requireScoutClip("rear-delt-fly-three_quarter-01")).toMatchObject({
      exerciseId: "rear-delt-fly",
      camera: "three_quarter",
      status: "authorized",
      startSec: 1,
      endSec: 7,
    });
    expect(requireScoutClip("face-pull-three_quarter-01")).toMatchObject({
      exerciseId: "face-pull",
      camera: "three_quarter",
      status: "authorized",
      startSec: 1,
      endSec: 7,
    });
    expect(requireScoutClip("pike-pushup-side-01")).toMatchObject({
      exerciseId: "pike-pushup",
      camera: "side",
      status: "authorized",
      startSec: 2,
      endSec: 11,
      url: "https://www.youtube.com/watch?v=XckEEwa1BPI",
    });
  });

  it("marks ingested squat/pushup as ingested; new clips authorized", () => {
    const squat = requireScoutClip("squat-side-01");
    expect(squat.status).toBe("ingested");
    expect(squat.exerciseId).toBe("squat");
    const bridge = requireScoutClip("glute-bridge-side-01");
    expect(bridge.status).toBe("authorized");
    expect(bridge.url).toContain("tqp5XQPpTxY");
    expect(bridge.startSec).toBe(2);
    expect(bridge.endSec).toBe(8);
  });

  it("keeps user-verified tight windows for plank and db-row samples", () => {
    const plank = requireScoutClip("plank-side-01");
    expect(plank.windowKind).toBe("hold");
    expect(plank.startSec).toBe(12);
    expect(plank.endSec).toBe(17);
    expect(plank.timeSource).toBe("user-verified");
    const row = requireScoutClip("db-row-side-01");
    expect(row.startSec).toBe(115);
    expect(row.endSec).toBe(120);
    expect(row.timeSource).toBe("user-verified");
  });

  it("anchors lunge-side-01 look-window after waist CUs", () => {
    const lunge = requireScoutClip("lunge-side-01");
    expect(lunge.startSec).toBe(44);
    expect(lunge.endSec).toBe(51);
    expect(lunge.timeSource).toBe("user-verified");
    // 字幕查找带 38–48；38–40 为部位特写（不否决片源）；本地拼图 44 才全身。
    expect(
      intersectSearchBandWithReadableRom(
        { startSec: 38, endSec: 48 },
        { startSec: 41, endSec: 48 },
      ),
    ).toEqual({ startSec: 41, endSec: 48 });
    expect(() =>
      intersectSearchBandWithReadableRom(
        { startSec: 38, endSec: 40 },
        { startSec: 41, endSec: 48 },
      ),
    ).toThrow(/does not overlap/);
  });

  it("rejects lecture-length proposed look-windows", () => {
    expect(inferWindowKind("plank")).toBe("hold");
    expect(inferWindowKind("side-plank")).toBe("hold");
    expect(inferWindowKind("hollow-hold")).toBe("hold");
    expect(inferWindowKind("lat-pulldown")).toBe("reps");
    expect(() =>
      assertScoutLookWindow(
        proposedClip({
          id: "plank-too-long",
          exerciseId: "plank",
          windowKind: "hold",
          startSec: 0,
          endSec: 24,
        }),
      ),
    ).toThrow(/hold look-window/);
    expect(() =>
      assertScoutLookWindow(
        proposedClip({
          id: "row-too-long",
          exerciseId: "db-row",
          startSec: 18,
          endSec: 70,
        }),
      ),
    ).toThrow(/reps look-window/);
  });

  it("rejects padded proposed reps windows even if under the 15s hard cap", () => {
    expect(() =>
      assertScoutLookWindow(
        proposedClip({
          id: "fly-padded",
          exerciseId: "db-fly",
          startSec: 1,
          endSec: 15,
          timeSource: "short-clip",
        }),
      ),
    ).toThrow(/prefer 4–10s/);
    expect(() =>
      assertScoutLookWindow(
        proposedClip({
          id: "fly-tight",
          exerciseId: "db-fly",
          startSec: 1,
          endSec: 7,
          timeSource: "short-clip",
        }),
      ),
    ).not.toThrow();
  });

  it("parses comma-separated and repeated scout ids", () => {
    expect(parseScoutIdList(["a,b", "c"])).toEqual(["a", "b", "c"]);
    expect(() => parseScoutIdList(["a", "a"])).toThrow(/duplicate/);
    expect(parseScoutIdList([])).toEqual([]);
  });

  it("caps proposed look-windows to Pose-usable length", () => {
    const reg = loadScoutRegistry();
    for (const clip of reg.clips) {
      if (clip.status !== "proposed" && clip.status !== "authorized") continue;
      expect(clip.startSec).not.toBeNull();
      expect(clip.endSec).not.toBeNull();
      const dur = (clip.endSec as number) - (clip.startSec as number);
      if (clip.windowKind === "hold") {
        expect(dur).toBeGreaterThanOrEqual(3);
        expect(dur).toBeLessThanOrEqual(8);
      } else {
        expect(dur).toBeGreaterThanOrEqual(4);
        expect(dur).toBeLessThanOrEqual(15);
      }
    }
  });

  it("unknown scout id throws", () => {
    expect(() => requireScoutClip("no-such-clip")).toThrow(/unknown --scout-id/);
  });

  it("matches youtube urls by video id", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=tqp5XQPpTxY")).toBe(
      "tqp5XQPpTxY",
    );
    expect(
      urlsReferToSameSource(
        "https://youtu.be/tqp5XQPpTxY",
        "https://www.youtube.com/watch?v=tqp5XQPpTxY",
      ),
    ).toBe(true);
    const clip = requireScoutClip("glute-bridge-side-01");
    expect(() =>
      assertScoutMatches(clip, { exercise: "lunge" }),
    ).toThrow(/does not match/);
    expect(() =>
      assertScoutMatches(clip, { url: "https://youtu.be/tqp5XQPpTxY" }),
    ).not.toThrow();
  });

  it("Phase G：作废片跳过，手持下拉只作示范", () => {
    const reg = loadScoutRegistry();
    const rejected = reg.clips.filter((c) => c.status === "rejected");
    expect(rejected.length).toBeGreaterThan(0);
    for (const clip of rejected) {
      expect(ingestSkipReason(clip)).toBe("status=rejected");
      expect(poseSkipReason(clip)).toBe("status=rejected");
    }
    const demoOnly = requireScoutClip("lat-pulldown-side-01");
    expect(demoOnly.cameraStability).toBe("handheld");
    expect(demoOnly.trajectorySource).toBe(false);
    expect(ingestSkipReason(demoOnly)).toBeNull();
    expect(poseSkipReason(demoOnly)).toMatch(/trajectorySource=false/);
    const front = requireScoutClip("lat-pulldown-front-01");
    const calf = requireScoutClip("calf-raise-front-01");
    expect(front.timeNote).toMatch(/背面|背后/);
    expect(calf.timeNote).toMatch(/背后/);
    expect(poseSkipReason(front)).toBeNull();
    expect(poseSkipReason(requireScoutClip("dip-front-01"))).toMatch(/moving/);
  });

  it("resolves local: scout urls inside the repo", () => {
    const p = resolveScoutUrl("local:media/trajectory-source/squat/squat-side-01.mp4");
    expect(p.endsWith("media/trajectory-source/squat/squat-side-01.mp4")).toBe(
      true,
    );
  });
});
