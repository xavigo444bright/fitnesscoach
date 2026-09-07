import { LandmarkIndex } from "../types.js";
import { describe, expect, it } from "vitest";
import {
  dbRowWorkingElbowAngle,
  meanVisibleElbowAngle,
  plankDriveDeg,
  pullupWorkingElbowAngle,
  rdlHipAngle,
  dbFlyDriveDeg,
  lateralRaiseDriveDeg,
  shoulderRaiseDriveDeg,
} from "../phase.js";
import {
  BENCH_PRESS_GHOST_KEYFRAMES,
  BENCH_PRESS_GHOST_SEQUENCE,
  DB_ROW_GHOST_KEYFRAMES,
  DB_ROW_GHOST_SEQUENCE,
  OHP_GHOST_KEYFRAMES,
  OHP_GHOST_SEQUENCE,
  PLANK_GHOST_KEYFRAMES,
  PLANK_GHOST_SEQUENCE,
  PULLUP_GHOST_KEYFRAMES,
  PULLUP_GHOST_SEQUENCE,
  RDL_GHOST_KEYFRAMES,
  RDL_GHOST_SEQUENCE,
  DB_FLY_GHOST_KEYFRAMES,
  DB_FLY_GHOST_SEQUENCE,
  DIP_GHOST_KEYFRAMES,
  DIP_GHOST_SEQUENCE,
  INCLINE_PUSHUP_GHOST_KEYFRAMES,
  INCLINE_PUSHUP_GHOST_SEQUENCE,
  CABLE_CROSSOVER_GHOST_KEYFRAMES,
  CABLE_CROSSOVER_GHOST_SEQUENCE,
  CHEST_PRESS_MACHINE_GHOST_KEYFRAMES,
  CHEST_PRESS_MACHINE_GHOST_SEQUENCE,
  LATERAL_RAISE_GHOST_KEYFRAMES,
  LATERAL_RAISE_GHOST_SEQUENCE,
  FRONT_RAISE_GHOST_KEYFRAMES,
  FRONT_RAISE_GHOST_SEQUENCE,
  REAR_DELT_FLY_GHOST_KEYFRAMES,
  REAR_DELT_FLY_GHOST_SEQUENCE,
  FACE_PULL_GHOST_KEYFRAMES,
  FACE_PULL_GHOST_SEQUENCE,
  PIKE_PUSHUP_GHOST_KEYFRAMES,
  PIKE_PUSHUP_GHOST_SEQUENCE,
} from "./batch-keyframes.js";

describe("batch ghost keyframes", () => {
  it("四套序列含 stand→…→stand", () => {
    for (const seq of [
      PLANK_GHOST_SEQUENCE,
      DB_ROW_GHOST_SEQUENCE,
      OHP_GHOST_SEQUENCE,
      BENCH_PRESS_GHOST_SEQUENCE,
      RDL_GHOST_SEQUENCE,
      PULLUP_GHOST_SEQUENCE,
      DB_FLY_GHOST_SEQUENCE,
      DIP_GHOST_SEQUENCE,
      INCLINE_PUSHUP_GHOST_SEQUENCE,
      CABLE_CROSSOVER_GHOST_SEQUENCE,
      CHEST_PRESS_MACHINE_GHOST_SEQUENCE,
      LATERAL_RAISE_GHOST_SEQUENCE,
      FRONT_RAISE_GHOST_SEQUENCE,
      REAR_DELT_FLY_GHOST_SEQUENCE,
      FACE_PULL_GHOST_SEQUENCE,
      PIKE_PUSHUP_GHOST_SEQUENCE,
    ]) {
      expect(seq[0]).toBe("stand");
      expect(seq.at(-1)).toBe("stand");
      expect(seq).toContain("descend_mid");
    }
  });

  it("平板 stand drive 高于 bottom", () => {
    const stand = plankDriveDeg(PLANK_GHOST_KEYFRAMES.stand.pose)!;
    const bottom = plankDriveDeg(PLANK_GHOST_KEYFRAMES.bottom.pose)!;
    expect(stand).toBeGreaterThan(bottom);
    expect(
      PLANK_GHOST_KEYFRAMES.stand.pose[LandmarkIndex.RightHip],
    ).toBeDefined();
  });

  it("划船 bottom 工作肘小于 stand", () => {
    const stand = dbRowWorkingElbowAngle(DB_ROW_GHOST_KEYFRAMES.stand.pose)!;
    const bottom = dbRowWorkingElbowAngle(DB_ROW_GHOST_KEYFRAMES.bottom.pose)!;
    expect(bottom).toBeLessThan(stand);
    expect(bottom).toBeLessThan(95);
    expect(stand).toBeGreaterThan(125);
  });

  it("推举/卧推 bottom 肘角小于 stand", () => {
    expect(
      meanVisibleElbowAngle(OHP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(meanVisibleElbowAngle(OHP_GHOST_KEYFRAMES.stand.pose)!);
    expect(
      meanVisibleElbowAngle(BENCH_PRESS_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(
      meanVisibleElbowAngle(BENCH_PRESS_GHOST_KEYFRAMES.stand.pose)!,
    );
  });

  it("RDL bottom 髋角低于 stand；引体 bottom 肘低于 stand", () => {
    expect(rdlHipAngle(RDL_GHOST_KEYFRAMES.bottom.pose)!).toBeLessThan(
      rdlHipAngle(RDL_GHOST_KEYFRAMES.stand.pose)!,
    );
    expect(rdlHipAngle(RDL_GHOST_KEYFRAMES.bottom.pose)!).toBeLessThan(115);
    expect(rdlHipAngle(RDL_GHOST_KEYFRAMES.stand.pose)!).toBeGreaterThan(155);
    expect(
      pullupWorkingElbowAngle(PULLUP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(
      pullupWorkingElbowAngle(PULLUP_GHOST_KEYFRAMES.stand.pose)!,
    );
    expect(dbFlyDriveDeg(DB_FLY_GHOST_KEYFRAMES.bottom.pose)!).toBeLessThan(
      dbFlyDriveDeg(DB_FLY_GHOST_KEYFRAMES.stand.pose)!,
    );
    expect(dbFlyDriveDeg(DB_FLY_GHOST_KEYFRAMES.bottom.pose)!).toBeLessThan(145);
    expect(dbFlyDriveDeg(DB_FLY_GHOST_KEYFRAMES.stand.pose)!).toBeGreaterThan(
      155,
    );
    expect(
      meanVisibleElbowAngle(DIP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(meanVisibleElbowAngle(DIP_GHOST_KEYFRAMES.stand.pose)!);
    expect(meanVisibleElbowAngle(DIP_GHOST_KEYFRAMES.bottom.pose)!).toBeLessThan(
      110,
    );
    expect(
      meanVisibleElbowAngle(DIP_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(150);
    expect(
      meanVisibleElbowAngle(INCLINE_PUSHUP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(
      meanVisibleElbowAngle(INCLINE_PUSHUP_GHOST_KEYFRAMES.stand.pose)!,
    );
    expect(
      meanVisibleElbowAngle(INCLINE_PUSHUP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(120);
    expect(
      meanVisibleElbowAngle(INCLINE_PUSHUP_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(160);
    expect(
      dbFlyDriveDeg(CABLE_CROSSOVER_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(dbFlyDriveDeg(CABLE_CROSSOVER_GHOST_KEYFRAMES.stand.pose)!);
    expect(
      dbFlyDriveDeg(CABLE_CROSSOVER_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(80);
    expect(
      dbFlyDriveDeg(CABLE_CROSSOVER_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(120);
    expect(
      meanVisibleElbowAngle(CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(
      meanVisibleElbowAngle(CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.stand.pose)!,
    );
    expect(
      meanVisibleElbowAngle(CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(95);
    expect(
      meanVisibleElbowAngle(CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(130);
    expect(
      lateralRaiseDriveDeg(LATERAL_RAISE_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(
      lateralRaiseDriveDeg(LATERAL_RAISE_GHOST_KEYFRAMES.bottom.pose)!,
    );
    expect(
      lateralRaiseDriveDeg(LATERAL_RAISE_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(155);
    expect(
      lateralRaiseDriveDeg(LATERAL_RAISE_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(115);
    expect(
      shoulderRaiseDriveDeg(FRONT_RAISE_GHOST_KEYFRAMES.stand.pose)!,
    ).toBeGreaterThan(
      shoulderRaiseDriveDeg(FRONT_RAISE_GHOST_KEYFRAMES.bottom.pose)!,
    );
    expect(
      dbFlyDriveDeg(REAR_DELT_FLY_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(dbFlyDriveDeg(REAR_DELT_FLY_GHOST_KEYFRAMES.stand.pose)!);
    expect(
      dbFlyDriveDeg(REAR_DELT_FLY_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(125);
    expect(
      meanVisibleElbowAngle(FACE_PULL_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(meanVisibleElbowAngle(FACE_PULL_GHOST_KEYFRAMES.stand.pose)!);
    expect(
      meanVisibleElbowAngle(FACE_PULL_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(100);
    expect(
      meanVisibleElbowAngle(PIKE_PUSHUP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(meanVisibleElbowAngle(PIKE_PUSHUP_GHOST_KEYFRAMES.stand.pose)!);
    expect(
      meanVisibleElbowAngle(PIKE_PUSHUP_GHOST_KEYFRAMES.bottom.pose)!,
    ).toBeLessThan(120);
  });
});
