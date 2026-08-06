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
  buildSquatNearKneeMeasured,
  buildSquatNearLeanMeasured,
  buildPushupNearElbowMeasured,
  buildPushupNearBodyLineMeasured,
} from "./poseTune.js";
