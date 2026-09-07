import { describe, expect, it } from "vitest";
import {
  assertCameraPlaneCoverage,
  loadCameraPlaneRegistry,
  parseCameraPlaneRegistry,
  poseCameraHint,
  type CameraPlaneRegistry,
} from "./cameraPlanes.js";
import { loadScoutRegistry } from "./scout.js";

const emptyRegistry = (): CameraPlaneRegistry =>
  parseCameraPlaneRegistry({
    schemaVersion: "1.0",
    grandfatheredExerciseIds: ["squat"],
    exercises: {},
  });

const latFrontSpec = {
  evaluation: "front",
  countPlanes: ["front"],
  defaultHint: "front",
  requiredClipCameras: ["front"],
  optionalClipCameras: ["side"],
  placementNote: "器械前",
  rationale: "计数看肘，默认正面摆机。",
};

describe("camera-planes (FR-089)", () => {
  it("loads repo spec; current scout 10 are grandfathered", () => {
    const planes = loadCameraPlaneRegistry();
    expect(planes.schemaVersion).toBe("1.0");
    expect(planes.grandfatheredExerciseIds).toContain("pullup");
    expect(Object.keys(planes.exercises).sort()).toEqual(
      [
        "cable-crossover",
        "chest-press-machine",
        "db-fly",
        "dip",
        "face-pull",
        "front-raise",
        "incline-pushup",
        "lateral-raise",
        "pike-pushup",
        "rear-delt-fly",
      ].sort(),
    );
    expect(() => loadScoutRegistry()).not.toThrow();
    expect(planes.exercises["db-fly"].evaluation).toBe("dual_or_three_quarter");
    expect(planes.exercises["db-fly"].requiredClipCameras).toEqual([
      "three_quarter",
      "front",
    ]);
    expect(planes.exercises["incline-pushup"].evaluation).toBe(
      "dual_or_three_quarter",
    );
    expect(planes.exercises["incline-pushup"].requiredClipCameras).toEqual([
      "side",
      "front",
    ]);
    expect(planes.exercises["cable-crossover"].evaluation).toBe("front");
    expect(planes.exercises["cable-crossover"].requiredClipCameras).toEqual([
      "front",
    ]);
    expect(planes.exercises["dip"].requiredClipCameras).toEqual([
      "three_quarter",
      "front",
    ]);
    expect(planes.exercises["chest-press-machine"].requiredClipCameras).toEqual([
      "side",
      "three_quarter",
    ]);
    expect(planes.exercises["lateral-raise"].evaluation).toBe("front");
    expect(planes.exercises["lateral-raise"].requiredClipCameras).toEqual([
      "front",
    ]);
    expect(planes.exercises["front-raise"].evaluation).toBe("side");
    expect(planes.exercises["pike-pushup"].evaluation).toBe("side");
    expect(planes.exercises["rear-delt-fly"].requiredClipCameras).toEqual([
      "three_quarter",
    ]);
    expect(planes.exercises["face-pull"].requiredClipCameras).toEqual([
      "three_quarter",
    ]);
  });

  it("maps three_quarter to side for Pose extract", () => {
    expect(poseCameraHint("three_quarter")).toBe("side");
    expect(poseCameraHint("side")).toBe("side");
    expect(poseCameraHint("front")).toBe("front");
  });

  it("allows new clips only after a spec covers required cameras", () => {
    const registry = parseCameraPlaneRegistry({
      schemaVersion: "1.0",
      grandfatheredExerciseIds: ["squat"],
      exercises: { "lat-pulldown": latFrontSpec },
    });
    expect(() =>
      assertCameraPlaneCoverage(
        [
          {
            exerciseId: "lat-pulldown",
            camera: "front",
            status: "proposed",
          },
        ],
        registry,
      ),
    ).not.toThrow();
  });

  it("rejects clips.json rows without a spec", () => {
    expect(() =>
      assertCameraPlaneCoverage(
        [{ exerciseId: "lat-pulldown", camera: "side", status: "proposed" }],
        emptyRegistry(),
      ),
    ).toThrow(/no spec/);
  });

  it("rejects a spec whose required camera is missing", () => {
    const registry = parseCameraPlaneRegistry({
      schemaVersion: "1.0",
      grandfatheredExerciseIds: [],
      exercises: { "lat-pulldown": latFrontSpec },
    });
    expect(() =>
      assertCameraPlaneCoverage(
        [
          {
            exerciseId: "lat-pulldown",
            camera: "side",
            status: "proposed",
          },
        ],
        registry,
      ),
    ).toThrow(/required camera front/);
  });

  it("rejects dual_or_three_quarter without front+side or three_quarter", () => {
    expect(() =>
      parseCameraPlaneRegistry({
        schemaVersion: "1.0",
        grandfatheredExerciseIds: [],
        exercises: {
          ohp: {
            ...latFrontSpec,
            evaluation: "dual_or_three_quarter",
            requiredClipCameras: ["front"],
          },
        },
      }),
    ).toThrow(/dual_or_three_quarter/);
  });
});
