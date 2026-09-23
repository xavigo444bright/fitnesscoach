/** @fitness-coach/core — 规则引擎、角度、相位、计数（平台无关） */

export const CORE_VERSION = "0.0.0";

export * from "./types.js";
export * from "./landmarks.js";
export * from "./poseUpright.js";
export * from "./angles.js";
export * from "./validate.js";
export * from "./phase.js";
export * from "./repCounter.js";
export * from "./feedback.js";
export * from "./exercises/squat.js";
export * from "./exercises/squat-keyframes.js";
export * from "./exercises/pushup.js";
export * from "./exercises/pushup-keyframes.js";
export * from "./exercises/glute-bridge.js";
export * from "./exercises/glute-bridge-keyframes.js";
export * from "./exercises/lunge.js";
export * from "./exercises/lunge-keyframes.js";
export * from "./exercises/plank.js";
export * from "./exercises/db-row.js";
export * from "./exercises/ohp.js";
export * from "./exercises/bench-press.js";
export * from "./exercises/rdl.js";
export * from "./exercises/pullup.js";
export * from "./exercises/db-fly.js";
export * from "./exercises/dip.js";
export * from "./exercises/incline-pushup.js";
export * from "./exercises/cable-crossover.js";
export * from "./exercises/chest-press-machine.js";
export * from "./exercises/lateral-raise.js";
export * from "./exercises/front-raise.js";
export * from "./exercises/rear-delt-fly.js";
export * from "./exercises/face-pull.js";
export * from "./exercises/pike-pushup.js";
export * from "./exercises/batch-keyframes.js";
export * from "./exercises/ghostKeyframes.js";
export * from "./exercises/catalog.js";
export * from "./exercises/exerciseIcons.js";
export * from "./exercises/exerciseSearch.js";
export {
  BODY_PART_ACTIVE_MUSCLES,
  activeMusclesFromBodyPart,
  type ActiveMuscleId,
} from "./exercises/activeMuscles.js";
export * from "./fixtures/index.js";
export * from "./fixtures/pushup.js";
export * from "./fixtures/gluteBridge.js";
export * from "./fixtures/dbFly.js";
export * from "./fixtures/raise.js";
export * from "./boundary/index.js";
export * from "./trajectory/index.js";
export * from "./subjectSelect.js";
export * from "./workoutLog/index.js";
export * from "./account/index.js";
