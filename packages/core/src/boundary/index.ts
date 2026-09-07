/** RULE-BOUNDARY：边界矩阵 + 阈值扫描 */

export type {
  BoundaryCase,
  BoundaryKind,
  SweepSample,
  SweepSpec,
} from "./types.js";
export { runBoundaryCase, runSweepSample } from "./runCase.js";
export { SQUAT_BOUNDARY_CASES, SQUAT_SWEEPS } from "./squatMatrix.js";
export { PUSHUP_BOUNDARY_CASES, PUSHUP_SWEEPS } from "./pushupMatrix.js";
export {
  GLUTE_BRIDGE_BOUNDARY_CASES,
  GLUTE_BRIDGE_SWEEPS,
} from "./gluteBridgeMatrix.js";
export { LUNGE_BOUNDARY_CASES, LUNGE_SWEEPS } from "./lungeMatrix.js";
export {
  PLANK_BOUNDARY_CASES,
  PLANK_SWEEPS,
  DB_ROW_BOUNDARY_CASES,
  DB_ROW_SWEEPS,
  OHP_BOUNDARY_CASES,
  OHP_SWEEPS,
  BENCH_PRESS_BOUNDARY_CASES,
  BENCH_PRESS_SWEEPS,
  RDL_BOUNDARY_CASES,
  RDL_SWEEPS,
  PULLUP_BOUNDARY_CASES,
  PULLUP_SWEEPS,
  DB_FLY_BOUNDARY_CASES,
  DB_FLY_SWEEPS,
  DIP_BOUNDARY_CASES,
  DIP_SWEEPS,
  INCLINE_PUSHUP_BOUNDARY_CASES,
  INCLINE_PUSHUP_SWEEPS,
  CABLE_CROSSOVER_BOUNDARY_CASES,
  CABLE_CROSSOVER_SWEEPS,
  CHEST_PRESS_MACHINE_BOUNDARY_CASES,
  CHEST_PRESS_MACHINE_SWEEPS,
  LATERAL_RAISE_BOUNDARY_CASES,
  LATERAL_RAISE_SWEEPS,
  FRONT_RAISE_BOUNDARY_CASES,
  FRONT_RAISE_SWEEPS,
  REAR_DELT_FLY_BOUNDARY_CASES,
  REAR_DELT_FLY_SWEEPS,
  FACE_PULL_BOUNDARY_CASES,
  FACE_PULL_SWEEPS,
  PIKE_PUSHUP_BOUNDARY_CASES,
  PIKE_PUSHUP_SWEEPS,
} from "./batchMatrix.js";
export {
  buildSquatNearKneeMeasured,
  buildSquatNearLeanMeasured,
  buildPushupNearElbowMeasured,
  buildPushupNearBodyLineMeasured,
  buildPlankNearPikeLineMeasured,
  buildGluteBridgeNearHipMeasured,
  buildRdlNearHipMeasured,
  buildDbFlyNearDriveMeasured,
  buildRaiseNearDriveMeasured,
} from "./poseTune.js";
