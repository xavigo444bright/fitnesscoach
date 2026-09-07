/**
 * @fitness-coach/core — 动作校验（M1-T4，VT-P1-003）
 *
 * 平台无关：吃 Pose + 当前相位，产出 ValidationResult。
 * 深蹲规则暂内联于此（评估器 + 阈值），M1-T7 抽到 exercises/squat.ts。
 * 真源：docs/exercises/squat-rules.md。
 */

import { jointAngle } from "./angles.js";
import {
  dbFlyDriveDeg,
  dbRowWorkingElbowAngle,
  gluteBridgeHipAngle,
  lungeWorkingKneeAngle,
  meanVisibleElbowAngle,
  preferredVisibleElbowAngle,
  plankBodyLineDeg,
  pullupWorkingElbowAngle,
  rdlHipAngle,
  lateralRaiseDriveDeg,
  shoulderRaiseDriveDeg,
} from "./phase.js";
import {
  LandmarkIndex,
  type Phase,
  type Pose,
  type RuleDefinition,
  type RuleResult,
  type ValidationResult,
  type ValidationStatus,
} from "./types.js";

/** 可评估规则：静态定义 + 单帧判定函数。 */
export interface EvaluableRule extends RuleDefinition {
  evaluate(pose: Pose): { triggered: boolean; measuredDeg?: number };
}

/** 该规则是否在当前相位生效（phases 为空表示所有相位）。 */
function ruleAppliesToPhase(rule: RuleDefinition, phase: Phase): boolean {
  return rule.phases.length === 0 || rule.phases.includes(phase);
}

/**
 * 汇总状态：任一 error → error；否则任一 warning → warning；否则 correct。
 */
export function summarizeValidationStatus(
  results: RuleResult[],
): ValidationStatus {
  let hasWarning = false;
  for (const r of results) {
    if (!r.triggered) continue;
    if (r.severity === "error") return "error";
    if (r.severity === "warning") hasWarning = true;
  }
  return hasWarning ? "warning" : "correct";
}

/** 用一侧的髋-膝-踝求膝角。 */
function kneeAngle(pose: Pose, side: "left" | "right"): number | null {
  const idx =
    side === "left"
      ? {
          a: LandmarkIndex.LeftHip,
          b: LandmarkIndex.LeftKnee,
          c: LandmarkIndex.LeftAnkle,
        }
      : {
          a: LandmarkIndex.RightHip,
          b: LandmarkIndex.RightKnee,
          c: LandmarkIndex.RightAnkle,
        };
  return jointAngle(pose, idx);
}

/**
 * 躯干相对竖直的前倾角（度），0 = 直立。
 * 用肩-髋向量相对画面竖直（y 向下）的夹角；侧蹲正常会有 15–40° 前倾，
 * 切勿用「肩-髋-膝」三点角（深蹲底部该角本就会变小，会误报前倾）。
 */
export function torsoLeanFromVertical(pose: Pose): number | null {
  const shoulder =
    pose[LandmarkIndex.RightShoulder] ?? pose[LandmarkIndex.LeftShoulder];
  const hip = pose[LandmarkIndex.RightHip] ?? pose[LandmarkIndex.LeftHip];
  if (!shoulder || !hip) return null;
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y; // 肩在髋上方时 > 0
  if (dy <= 1e-6) return 90; // 躯干接近水平
  return (Math.atan2(Math.abs(dx), dy) * 180) / Math.PI;
}

/**
 * 冠状面 valgus 近似：膝相对「踝的竖直线」的水平偏移，用小腿竖直长度换算成角度。
 * 只对膝向内/外的横向位移敏感，不把矢状面「膝前移」误判为内扣。
 * 正面机位下髋与踝的 x 近似相等，此度量与髋-踝线一致。
 * 侧摄 MVP 不启用（见 SQUAT_RULES evaluate），本函数供正面机位 / 单测预留。
 */
export function valgusDeg(pose: Pose, side: "left" | "right"): number | null {
  const knee =
    pose[side === "left" ? LandmarkIndex.LeftKnee : LandmarkIndex.RightKnee];
  const ankle =
    pose[side === "left" ? LandmarkIndex.LeftAnkle : LandmarkIndex.RightAnkle];
  if (!knee || !ankle) return null;
  const dev = Math.abs(knee.x - ankle.x);
  const shin = Math.abs(ankle.y - knee.y) || 0.2;
  return (Math.atan2(dev, shin) * 180) / Math.PI;
}

/** 深蹲规则集合（与 squat-rules.md 一一对应）。 */
export const SQUAT_RULES: EvaluableRule[] = [
  {
    id: "squat-depth",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "蹲得不够深，臀部再下沉一些",
    evaluate(pose) {
      const deg = kneeAngle(pose, "right");
      if (deg == null) return { triggered: false };
      // 目标 <100°；容差 10° → ≥110° 才报不够深
      return { triggered: deg >= 110, measuredDeg: deg };
    },
  },
  {
    id: "knee-valgus-l",
    joints: {
      a: LandmarkIndex.LeftHip,
      b: LandmarkIndex.LeftKnee,
      c: LandmarkIndex.LeftAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 35,
    message: "左膝内扣，向外推开膝盖",
    evaluate(pose) {
      // 侧摄 MVP：矢状面膝前移会被当成内扣，恒不触发（正面机位再启）
      void pose;
      return { triggered: false };
    },
  },
  {
    id: "knee-valgus-r",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 35,
    message: "右膝内扣，向外推开膝盖",
    evaluate(pose) {
      void pose;
      return { triggered: false };
    },
  },
  {
    id: "torso-upright",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "warning",
    // 仅站立评估：bottom 自然前倾常 >55°，会误锁黄骨并破坏计次体验
    phases: ["stand"],
    toleranceDeg: 10,
    message: "躯干前倾过多，挺胸收紧核心",
    evaluate(pose) {
      const lean = torsoLeanFromVertical(pose);
      if (lean == null) return { triggered: false };
      // 理想前倾 ≤45°；容差 10° → 仅 >55° 才 warning（站立弯腰）
      return { triggered: lean > 55, measuredDeg: lean };
    },
  },
];

/** 肩-髋-踝夹角（度）；俯卧撑身体一线。两侧取均值。 */
export function pushupBodyLineDeg(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftHip,
    c: LandmarkIndex.LeftAnkle,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightHip,
    c: LandmarkIndex.RightAnkle,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

function pushupElbowDegSide(pose: Pose, side: "left" | "right"): number | null {
  return jointAngle(
    pose,
    side === "left"
      ? {
          a: LandmarkIndex.LeftShoulder,
          b: LandmarkIndex.LeftElbow,
          c: LandmarkIndex.LeftWrist,
        }
      : {
          a: LandmarkIndex.RightShoulder,
          b: LandmarkIndex.RightElbow,
          c: LandmarkIndex.RightWrist,
        },
  );
}

/** 俯卧撑规则（与 pushup-rules.md 一致）。 */
export const PUSHUP_RULES: EvaluableRule[] = [
  {
    id: "elbow-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "手臂未弯到位，胸口再靠近地面",
    evaluate(pose) {
      const left = pushupElbowDegSide(pose, "left");
      const right = pushupElbowDegSide(pose, "right");
      const deg =
        left != null && right != null
          ? (left + right) / 2
          : (left ?? right);
      if (deg == null) return { triggered: false };
      // 目标 <110°；容差 10° → ≥120° 才报
      return { triggered: deg >= 120, measuredDeg: deg };
    },
  },
  {
    id: "body-line",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: [], // all
    toleranceDeg: 10,
    message: "臀部翘起或下沉，保持身体一条直线",
    evaluate(pose) {
      const deg = pushupBodyLineDeg(pose);
      if (deg == null) return { triggered: false };
      // 理想 ≥170°；容差 10° → <160° 才报
      return { triggered: deg < 160, measuredDeg: deg };
    },
  },
];

/** 臀桥规则（与 glute-bridge-rules.md 一致）。lumbar-extension 为 P2，本版不报。 */
export const GLUTE_BRIDGE_RULES: EvaluableRule[] = [
  {
    id: "hip-extension",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "髋没顶够，推到肩膝一线并收臀",
    evaluate(pose) {
      const deg = gluteBridgeHipAngle(pose);
      if (deg == null) return { triggered: false };
      // 目标 ≥140°；容差 10° → <130° 才报没顶够（侧摄 2D 常低估锁髋）
      return { triggered: deg < 130, measuredDeg: deg };
    },
  },
];

/** 弓步规则（与 lunge-rules.md 一致）。膝内扣侧摄 P2 不报。 */
export const LUNGE_RULES: EvaluableRule[] = [
  {
    id: "lunge-depth",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "蹲得不够深，前膝再弯一些",
    evaluate(pose) {
      const deg = lungeWorkingKneeAngle(pose);
      if (deg == null) return { triggered: false };
      // 目标 <100°；容差 10° → ≥110° 才报不够深
      return { triggered: deg >= 110, measuredDeg: deg };
    },
  },
  {
    id: "torso-upright",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "warning",
    phases: ["stand"],
    toleranceDeg: 10,
    message: "躯干前倾过多，挺胸收紧核心",
    evaluate(pose) {
      const deg = torsoLeanFromVertical(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg > 55, measuredDeg: deg };
    },
  },
];

/** 平板规则（与 plank-rules.md 一致）。侧支撑另开 id。 */
export const PLANK_RULES: EvaluableRule[] = [
  {
    id: "body-line",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "撅臀了，把腰放平",
    evaluate(pose) {
      const deg = plankBodyLineDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg < 160, measuredDeg: deg };
    },
  },
];

/** 哑铃划船（与 db-row-rules.md 一致）。 */
export const DB_ROW_RULES: EvaluableRule[] = [
  {
    id: "row-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "拉得不够高，肘再往髋后收",
    evaluate(pose) {
      const deg = dbRowWorkingElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 110, measuredDeg: deg };
    },
  },
];

/** 站姿推举（与 ohp-rules.md 一致）。 */
export const OHP_RULES: EvaluableRule[] = [
  {
    id: "torso-upright",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "warning",
    phases: ["stand"],
    toleranceDeg: 10,
    message: "腰过度后仰，收紧核心再推",
    evaluate(pose) {
      const deg = torsoLeanFromVertical(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg > 55, measuredDeg: deg };
    },
  },
];

/** 罗马尼亚硬拉（与 rdl-rules.md 一致）。圆背 P2。 */
export const RDL_RULES: EvaluableRule[] = [
  {
    id: "rdl-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "铰链不够深，臀部再往后坐",
    evaluate(pose) {
      const deg = rdlHipAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 125, measuredDeg: deg };
    },
  },
];

/** 引体向上（与 pullup-rules.md 一致）。摆浪 P2。 */
export const PULLUP_RULES: EvaluableRule[] = [
  {
    id: "pull-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "拉得不够高，下巴再过杆",
    evaluate(pose) {
      const deg = pullupWorkingElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 115, measuredDeg: deg };
    },
  },
];

/** 哑铃飞鸟（与 db-fly-rules.md 一致）。甩肩 / 肘打直 P2。 */
export const DB_FLY_RULES: EvaluableRule[] = [
  {
    id: "fly-depth",
    joints: {
      a: LandmarkIndex.LeftWrist,
      b: LandmarkIndex.LeftShoulder,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "打开不够深，手臂再打开一些",
    evaluate(pose) {
      const deg = dbFlyDriveDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 150, measuredDeg: deg };
    },
  },
];

/** 冠状面肩宽。3/4 侧身常 <0.08；正面常 ≳0.18。≥0.12 视为偏正，关掉 torso-lean。 */
function coronalShoulderWidth(pose: Pose): number | null {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  if (!ls || !rs) return null;
  return Math.hypot(ls.x - rs.x, ls.y - rs.y);
}

const FRONTISH_SHOULDER_WIDTH = 0.12;

function isFrontishPose(pose: Pose): boolean {
  const width = coronalShoulderWidth(pose);
  return width != null && width >= FRONTISH_SHOULDER_WIDTH;
}

/** 双杠臂屈伸（与 dip-rules.md 一致）。肩过度下沉 / 凳上变式 P2。 */
export const DIP_RULES: EvaluableRule[] = [
  {
    id: "dip-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "降得不够低，肩再往下沉一些",
    evaluate(pose) {
      const deg = preferredVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 115, measuredDeg: deg };
    },
  },
  {
    id: "torso-lean",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "躯干再往前倾一点，练胸",
    evaluate(pose) {
      const width = coronalShoulderWidth(pose);
      if (width != null && width >= FRONTISH_SHOULDER_WIDTH) {
        return { triggered: false, measuredDeg: width };
      }
      const deg = torsoLeanFromVertical(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg < 10, measuredDeg: deg };
    },
  },
];

/** 上斜俯卧撑（与 incline-pushup-rules.md 一致）。肘外展 P2。 */
export const INCLINE_PUSHUP_RULES: EvaluableRule[] = [
  {
    id: "elbow-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "胸口再靠近支撑面",
    evaluate(pose) {
      if (isFrontishPose(pose)) return { triggered: false };
      const deg = meanVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 120, measuredDeg: deg };
    },
  },
  {
    id: "body-line",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: [],
    toleranceDeg: 10,
    message: "臀部翘起或下沉，保持身体一条直线",
    evaluate(pose) {
      if (isFrontishPose(pose)) return { triggered: false };
      const deg = pushupBodyLineDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg < 160, measuredDeg: deg };
    },
  },
];

/** 绳索夹胸（与 cable-crossover-rules.md 一致）。转腰代偿 P2。 */
export const CABLE_CROSSOVER_RULES: EvaluableRule[] = [
  {
    id: "crossover-depth",
    joints: {
      a: LandmarkIndex.LeftWrist,
      b: LandmarkIndex.LeftShoulder,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "打开不够开，手臂再向两侧打开",
    evaluate(pose) {
      const deg = dbFlyDriveDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 90, measuredDeg: deg };
    },
  },
];

/** 坐姿推胸器（与 chest-press-machine-rules.md 一致）。挺腰离垫 P2。 */
export const CHEST_PRESS_MACHINE_RULES: EvaluableRule[] = [
  {
    id: "press-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "没收到胸口，再收回一些",
    evaluate(pose) {
      const deg = meanVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 105, measuredDeg: deg };
    },
  },
];

/** 哑铃侧平举（与 lateral-raise-rules.md 一致）。甩摆 / 耸肩 P2。 */
export const LATERAL_RAISE_RULES: EvaluableRule[] = [
  {
    id: "raise-height",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightShoulder,
      c: LandmarkIndex.RightElbow,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "再抬高一些，到大约肩的高度",
    evaluate(pose) {
      if (!isFrontishPose(pose)) return { triggered: false };
      const deg = lateralRaiseDriveDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 125, measuredDeg: deg };
    },
  },
];

/** 哑铃前平举（与 front-raise-rules.md 一致）。甩摆 P2。 */
export const FRONT_RAISE_RULES: EvaluableRule[] = [
  {
    id: "raise-height",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightShoulder,
      c: LandmarkIndex.RightElbow,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "再抬高一些，到大约肩的高度",
    evaluate(pose) {
      if (isFrontishPose(pose)) return { triggered: false };
      const deg = shoulderRaiseDriveDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 125, measuredDeg: deg };
    },
  },
];

/** 俯身飞鸟（与 rear-delt-fly-rules.md 一致）。起身代偿 P2。 */
export const REAR_DELT_FLY_RULES: EvaluableRule[] = [
  {
    id: "fly-depth",
    joints: {
      a: LandmarkIndex.LeftWrist,
      b: LandmarkIndex.LeftShoulder,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "打开不够开，手臂再向两侧打开",
    evaluate(pose) {
      const deg = dbFlyDriveDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 135, measuredDeg: deg };
    },
  },
];

/** 面拉（与 face-pull-rules.md 一致）。耸肩代偿 P2。 */
export const FACE_PULL_RULES: EvaluableRule[] = [
  {
    id: "pull-height",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "再拉向面部一些",
    evaluate(pose) {
      const deg = meanVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 115, measuredDeg: deg };
    },
  },
];

/** 派克俯卧撑（与 pike-pushup-rules.md 一致）。肘外展 P2。 */
export const PIKE_PUSHUP_RULES: EvaluableRule[] = [
  {
    id: "elbow-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "头再靠近地面一些",
    evaluate(pose) {
      if (isFrontishPose(pose)) return { triggered: false };
      const deg = meanVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 120, measuredDeg: deg };
    },
  },
  {
    id: "pike-line",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: [],
    toleranceDeg: 10,
    message: "把髋再抬高，保持倒 V",
    evaluate(pose) {
      if (isFrontishPose(pose)) return { triggered: false };
      const deg = pushupBodyLineDeg(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg > 100, measuredDeg: deg };
    },
  },
];

/** 杠铃卧推（与 bench-press-rules.md 一致）。塌腰/弹杠 P2。 */
export const BENCH_PRESS_RULES: EvaluableRule[] = [
  {
    id: "elbow-depth",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightElbow,
      c: LandmarkIndex.RightWrist,
    },
    severity: "warning",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "杠没落到胸口，再下放一些",
    evaluate(pose) {
      const deg = meanVisibleElbowAngle(pose);
      if (deg == null) return { triggered: false };
      return { triggered: deg >= 120, measuredDeg: deg };
    },
  },
];

/**
 * 对单帧姿态在给定相位下跑一组规则。
 */
export function validate(
  pose: Pose,
  phase: Phase,
  rules: EvaluableRule[] = SQUAT_RULES,
): ValidationResult {
  const results: RuleResult[] = [];
  for (const rule of rules) {
    if (!ruleAppliesToPhase(rule, phase)) continue;
    const { triggered, measuredDeg } = rule.evaluate(pose);
    results.push({
      id: rule.id,
      triggered,
      severity: rule.severity,
      message: rule.message,
      measuredDeg,
    });
  }
  const status = summarizeValidationStatus(results);
  const messages = results.filter((r) => r.triggered).map((r) => r.message);
  return { status, messages, results };
}
