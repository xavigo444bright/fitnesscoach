import { describe, expect, it } from "vitest";
import { angleBetween3d } from "./angles.js";
import { initialScaleWatch, readAttemptRegion, stepScaleWatch } from "./attemptRegions.js";
import { latPulldownHandsOut, shortMessageFor } from "./countingRule.js";
import { initialSquatDepthState } from "./squatDepth.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";

function pose(points: Partial<Record<number, Landmark>>): Pose {
  const out: Pose = [];
  for (const [index, lm] of Object.entries(points)) out[Number(index)] = lm;
  return out;
}

function pt(x: number, y: number): Landmark {
  return { x, y, z: 0, visibility: 0.9 };
}

/** 把腕放到指定肘角。below 为真时腕在肩的画面下方。 */
function wristFor(
  shoulder: Landmark,
  elbow: Landmark,
  deg: number,
  below: boolean,
): Landmark {
  const base = Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
  const len = 0.2;
  const delta = (deg * Math.PI) / 180;
  for (const rad of [base + delta, base - delta]) {
    const wrist = pt(elbow.x + Math.cos(rad) * len, elbow.y + Math.sin(rad) * len);
    if (wrist.y >= shoulder.y - 1e-4 === below) return wrist;
  }
  throw new Error(`放不下 ${deg}°`);
}

describe("完成区域", () => {
  it("深蹲站直是起始，髋靠近脚才是完成", () => {
    let squat = initialSquatDepthState();
    const up = readAttemptRegion(
      "squat",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.25 },
        [LandmarkIndex.LeftHip]: { x: 0.5, y: 0.45 },
        [LandmarkIndex.LeftKnee]: { x: 0.5, y: 0.65 },
        [LandmarkIndex.LeftAnkle]: { x: 0.5, y: 0.85 },
      }),
      squat,
    );
    squat = up.squat;
    expect(up.obs?.atStart).toBe(true);
    expect(up.obs?.atFinish).toBe(false);

    const deep = readAttemptRegion(
      "squat",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.3 },
        [LandmarkIndex.LeftHip]: { x: 0.5, y: 0.55 },
        [LandmarkIndex.LeftKnee]: { x: 0.62, y: 0.7 },
        [LandmarkIndex.LeftAnkle]: { x: 0.5, y: 0.78 },
      }),
      squat,
    );
    expect(deep.obs?.atStart).toBe(false);
    expect(deep.obs!.progress).toBeGreaterThan(deep.obs!.shortTravel);
  });

  it("直臂是起始，腕收到肩附近才是完成", () => {
    const straight = readAttemptRegion(
      "bench-press",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.4, wx: 0, wy: 0, wz: 0 },
        [LandmarkIndex.LeftElbow]: { x: 0.4, y: 0.25, wx: 0, wy: 0.25, wz: 0 },
        [LandmarkIndex.LeftWrist]: { x: 0.4, y: 0.1, wx: 0, wy: 0.5, wz: 0 },
      }),
      initialSquatDepthState(),
    );
    expect(straight.obs?.atStart).toBe(true);
    expect(straight.obs?.atFinish).toBe(false);

    const shoulder = pt(0.5, 0.4);
    const elbow = pt(0.66, 0.4);
    const wrist = wristFor(shoulder, elbow, 90, true);
    expect(angleBetween3d(shoulder, elbow, wrist)!).toBeLessThanOrEqual(105);
    expect(wrist.y).toBeGreaterThanOrEqual(shoulder.y);
    const folded = readAttemptRegion(
      "lat-pulldown",
      pose({
        [LandmarkIndex.RightShoulder]: shoulder,
        [LandmarkIndex.RightElbow]: elbow,
        [LandmarkIndex.RightWrist]: wrist,
      }),
      initialSquatDepthState(),
    );
    expect(folded.obs?.atFinish).toBe(true);
    expect(shortMessageFor("lat-pulldown")).toMatch(/拉低/);
    expect(shortMessageFor("lat-pulldown", pose({
      [LandmarkIndex.RightShoulder]: shoulder,
      [LandmarkIndex.RightElbow]: elbow,
      [LandmarkIndex.RightWrist]: wrist,
    }))).toBe("");
  });

  it("手到肩高但往前，不是侧平举的完成", () => {
    const forward = readAttemptRegion(
      "lateral-raise",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.4, wx: 0, wy: 0, wz: 0 },
        [LandmarkIndex.LeftElbow]: { x: 0.5, y: 0.25, wx: 0, wy: 0.1, wz: -0.2 },
        [LandmarkIndex.LeftWrist]: { x: 0.5, y: 0.12, wx: 0, wy: 0.05, wz: -0.45 },
      }),
      initialSquatDepthState(),
    );
    expect(forward.obs?.atFinish).toBe(false);
    expect(shortMessageFor("lateral-raise", pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.4, wx: 0, wy: 0, wz: 0 },
      [LandmarkIndex.LeftElbow]: { x: 0.5, y: 0.25, wx: 0, wy: 0.1, wz: -0.2 },
      [LandmarkIndex.LeftWrist]: { x: 0.5, y: 0.12, wx: 0, wy: 0.05, wz: -0.45 },
    }))).toMatch(/两侧/);
  });

  it("画面已经向两侧平举时，世界坐标往前也不把行程留在起始", () => {
    const raised = readAttemptRegion(
      "lateral-raise",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.42, y: 0.4, wx: 0, wy: 0, wz: 0 },
        [LandmarkIndex.RightShoulder]: { x: 0.58, y: 0.4, wx: 0.1, wy: 0, wz: 0 },
        [LandmarkIndex.LeftElbow]: { x: 0.22, y: 0.4, wx: -0.05, wy: -0.2, wz: 0.4 },
        [LandmarkIndex.RightElbow]: { x: 0.78, y: 0.4, wx: 0.05, wy: -0.2, wz: 0.4 },
        [LandmarkIndex.LeftWrist]: { x: 0.08, y: 0.42, wx: 0.02, wy: -0.35, wz: 0.55 },
        [LandmarkIndex.RightWrist]: { x: 0.92, y: 0.42, wx: 0.08, wy: -0.35, wz: 0.55 },
      }),
      initialSquatDepthState(),
    );
    expect(raised.obs?.atStart).toBe(false);
    expect(raised.obs?.atFinish).toBe(true);
    expect((raised.obs?.progress ?? 0) > 0.25).toBe(true);
  });

  it("肩宽突然变大时这帧不可信，稳住后重新采纳", () => {
    const narrow = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.3 },
      [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.3 },
    });
    const wide = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.2, y: 0.3 },
      [LandmarkIndex.RightShoulder]: { x: 0.8, y: 0.3 },
    });
    let watch = stepScaleWatch(initialScaleWatch(), narrow);
    expect(watch.trusted).toBe(true);
    watch = stepScaleWatch(watch.state, wide);
    expect(watch.trusted).toBe(false);
    for (let i = 0; i < 8; i += 1) {
      watch = stepScaleWatch(watch.state, wide);
    }
    expect(watch.trusted).toBe(true);
  });

  it("走近镜头时画面肩宽变大，三维肩宽不变，这帧不可信", () => {
    const far = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.45, y: 0.3, wx: -0.2, wy: 0, wz: 0 },
      [LandmarkIndex.RightShoulder]: { x: 0.55, y: 0.3, wx: 0.2, wy: 0, wz: 0 },
    });
    const near = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.3, y: 0.3, wx: -0.2, wy: 0, wz: 0 },
      [LandmarkIndex.RightShoulder]: { x: 0.7, y: 0.3, wx: 0.2, wy: 0, wz: 0 },
    });
    let watch = stepScaleWatch(initialScaleWatch(), far);
    watch = stepScaleWatch(watch.state, near);
    expect(watch.trusted).toBe(false);
  });

  it("画面肩宽稳住时，三维肩宽抖动仍可信", () => {
    const quiet = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.3, wx: -0.2, wy: 0, wz: 0 },
      [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.3, wx: 0.2, wy: 0, wz: 0 },
    });
    const jitter = pose({
      [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.3, wx: -0.35, wy: 0, wz: 0 },
      [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.3, wx: 0.35, wy: 0, wz: 0 },
    });
    let watch = stepScaleWatch(initialScaleWatch(), quiet);
    watch = stepScaleWatch(watch.state, jitter);
    expect(watch.trusted).toBe(true);
  });

  it("下拉更弯的一侧收到上胸就算完成，另一侧伸直不拦", () => {
    const leftShoulder = pt(0.35, 0.4);
    const leftElbow = pt(0.35, 0.25);
    const leftWrist = wristFor(leftShoulder, leftElbow, 170, false);
    const rightShoulder = pt(0.65, 0.4);
    const rightElbow = pt(0.8, 0.4);
    const rightWrist = wristFor(rightShoulder, rightElbow, 90, true);
    const oneFolded = readAttemptRegion(
      "lat-pulldown",
      pose({
        [LandmarkIndex.LeftShoulder]: leftShoulder,
        [LandmarkIndex.LeftElbow]: leftElbow,
        [LandmarkIndex.LeftWrist]: leftWrist,
        [LandmarkIndex.RightShoulder]: rightShoulder,
        [LandmarkIndex.RightElbow]: rightElbow,
        [LandmarkIndex.RightWrist]: rightWrist,
      }),
      initialSquatDepthState(),
    );
    expect(oneFolded.obs?.atFinish).toBe(true);
    expect(oneFolded.obs?.atStart).toBe(false);
  });

  it("肘弯了但腕还在肩上方，不是下拉完成", () => {
    const shoulder = pt(0.5, 0.45);
    const elbow = pt(0.66, 0.4);
    const wrist = wristFor(shoulder, elbow, 80, false);
    expect(wrist.y).toBeLessThan(shoulder.y);
    const curl = readAttemptRegion(
      "lat-pulldown",
      pose({
        [LandmarkIndex.RightShoulder]: shoulder,
        [LandmarkIndex.RightElbow]: elbow,
        [LandmarkIndex.RightWrist]: wrist,
      }),
      initialSquatDepthState(),
    );
    expect(curl.obs?.atFinish).toBe(false);
    expect(curl.obs).not.toBeNull();
  });

  it("短于 15° 的折叠不参加，读不到肘角就没有读数", () => {
    const shoulder = pt(0.5, 0.4);
    const elbow = pt(0.62, 0.4);
    const wrist = wristFor(shoulder, elbow, 8, true);
    const collapsed = readAttemptRegion(
      "lat-pulldown",
      pose({
        [LandmarkIndex.RightShoulder]: shoulder,
        [LandmarkIndex.RightElbow]: elbow,
        [LandmarkIndex.RightWrist]: wrist,
      }),
      initialSquatDepthState(),
    );
    expect(collapsed.obs).toBeNull();
  });

  it("划船要肘靠近髋，引体要腕在肩上", () => {
    const shoulder = pt(0.45, 0.35);
    const hip = pt(0.48, 0.62);
    const elbow = pt(0.55, 0.58);
    const wrist = wristFor(shoulder, elbow, 80, true);
    const row = readAttemptRegion(
      "seated-row",
      pose({
        [LandmarkIndex.RightShoulder]: shoulder,
        [LandmarkIndex.RightElbow]: elbow,
        [LandmarkIndex.RightWrist]: wrist,
        [LandmarkIndex.RightHip]: hip,
      }),
      initialSquatDepthState(),
    );
    expect(row.obs?.atFinish).toBe(true);

    const away = pt(0.78, 0.35);
    const awayWrist = wristFor(shoulder, away, 80, true);
    const notRow = readAttemptRegion(
      "seated-row",
      pose({
        [LandmarkIndex.RightShoulder]: shoulder,
        [LandmarkIndex.RightElbow]: away,
        [LandmarkIndex.RightWrist]: awayWrist,
        [LandmarkIndex.RightHip]: hip,
      }),
      initialSquatDepthState(),
    );
    expect(notRow.obs?.atFinish).toBe(false);

    const upShoulder = pt(0.5, 0.45);
    const upElbow = pt(0.66, 0.4);
    const upWrist = wristFor(upShoulder, upElbow, 80, false);
    const pull = readAttemptRegion(
      "pullup",
      pose({
        [LandmarkIndex.LeftShoulder]: upShoulder,
        [LandmarkIndex.LeftElbow]: upElbow,
        [LandmarkIndex.LeftWrist]: upWrist,
      }),
      initialSquatDepthState(),
    );
    expect(pull.obs?.atFinish).toBe(true);
  });

  it("肩肘在、两侧腕都不在时提示手和杆入画", () => {
    const missingHands = pose({
      [LandmarkIndex.LeftShoulder]: pt(0.4, 0.35),
      [LandmarkIndex.RightShoulder]: pt(0.6, 0.35),
      [LandmarkIndex.LeftElbow]: pt(0.32, 0.48),
      [LandmarkIndex.RightElbow]: pt(0.68, 0.48),
    });
    expect(latPulldownHandsOut(missingHands)).toBe(true);

    const shoulder = pt(0.6, 0.35);
    const elbow = pt(0.68, 0.48);
    const wrist = wristFor(shoulder, elbow, 100, true);
    const oneWrist = pose({
      [LandmarkIndex.LeftShoulder]: pt(0.4, 0.35),
      [LandmarkIndex.RightShoulder]: shoulder,
      [LandmarkIndex.LeftElbow]: pt(0.32, 0.48),
      [LandmarkIndex.RightElbow]: elbow,
      [LandmarkIndex.RightWrist]: wrist,
    });
    expect(latPulldownHandsOut(oneWrist)).toBe(false);
    expect(latPulldownHandsOut(pose({}))).toBe(false);
  });

  it("正面朝镜头、手臂只往深处打开，不算向两侧打开", () => {
    const depthOnly = readAttemptRegion(
      "rear-delt-fly",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.35, y: 0.45, z: 0 },
        [LandmarkIndex.RightShoulder]: { x: 0.65, y: 0.45, z: 0 },
        [LandmarkIndex.LeftWrist]: { x: 0.36, y: 0.45, z: -0.28 },
      }),
      initialSquatDepthState(),
    );
    expect(depthOnly.obs?.atFinish).toBe(true);
    expect(depthOnly.obs?.counts).toBe(false);

    const sideways = readAttemptRegion(
      "rear-delt-fly",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.42, y: 0.45, z: 0 },
        [LandmarkIndex.RightShoulder]: { x: 0.58, y: 0.45, z: 0 },
        [LandmarkIndex.LeftWrist]: { x: 0.12, y: 0.45, z: -0.04 },
        [LandmarkIndex.RightWrist]: { x: 0.88, y: 0.45, z: -0.04 },
      }),
      initialSquatDepthState(),
    );
    expect(sideways.obs?.atFinish).toBe(true);
    expect(sideways.obs?.counts).toBe(true);
  });

  it("整条手臂叠在一起时这一帧没有读数，并标出这些点", () => {
    const stacked = readAttemptRegion(
      "rear-delt-fly",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.4 },
        [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.4 },
        [LandmarkIndex.LeftWrist]: { x: 0.401, y: 0.401 },
        [LandmarkIndex.RightWrist]: { x: 0.601, y: 0.401 },
      }),
      initialSquatDepthState(),
    );
    expect(stacked.obs).toBeNull();
    expect(stacked.unreadJoints).toEqual(
      expect.arrayContaining([
        LandmarkIndex.LeftShoulder,
        LandmarkIndex.LeftWrist,
        LandmarkIndex.RightShoulder,
        LandmarkIndex.RightWrist,
      ]),
    );

    const oneOpen = readAttemptRegion(
      "rear-delt-fly",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.45 },
        [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.45 },
        [LandmarkIndex.LeftWrist]: { x: 0.401, y: 0.451 },
        [LandmarkIndex.RightWrist]: { x: 0.88, y: 0.45 },
      }),
      initialSquatDepthState(),
    );
    expect(oneOpen.obs).not.toBeNull();
    expect(oneOpen.unreadJoints ?? []).toEqual([]);
  });

  it("前平举只读到一侧时仍有读数", () => {
    const one = readAttemptRegion(
      "front-raise",
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.4 },
        [LandmarkIndex.LeftHip]: { x: 0.5, y: 0.62 },
        [LandmarkIndex.LeftElbow]: { x: 0.5, y: 0.55 },
        [LandmarkIndex.LeftWrist]: { x: 0.5, y: 0.7 },
      }),
      initialSquatDepthState(),
    );
    expect(one.obs).not.toBeNull();
  });
});
