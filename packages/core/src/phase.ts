/**
 * @fitness-coach/core — 相位状态机（M1-T5，VT-P1-004）
 *
 * 由驱动角（深蹲=膝角，俯卧撑=肘角）驱动 stand → descend → bottom → ascend → stand。
 * 相位切换需连续 confirmFrames 帧满足条件（防抖）。
 */

import {
  angleBetween,
  angleBetween3d,
  hasWorldPoint,
  jointAngle,
  tiltFromVerticalDeg,
} from "./angles.js";
import { landmarkHorizontallyOut, landmarkReliable } from "./landmarks.js";
import {
  LandmarkIndex,
  type Landmark,
  type Phase,
  type PhaseState,
  type Pose,
} from "./types.js";

/** 相位阈值（驱动角，度）与确认帧数。 */
export interface PhaseConfig {
  standAboveDeg: number;
  bottomBelowDeg: number;
  confirmFrames: number;
}

export const DEFAULT_SQUAT_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};

/** 俯卧撑：肘角阈值，见 pushup-rules.md。 */
export const DEFAULT_PUSHUP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 120,
  confirmFrames: 5,
};

/**
 * 臀桥：驱动角 = 180 − 肩-髋-膝。
 * 静息（髋贴地）≈ 高 drive；顶髋锁髋 ≈ 低 drive。相位名沿用 stand/bottom。
 * 阈值按侧摄 2D 放宽，不是示范片单帧 179°。见 glute-bridge-rules.md。
 */
export const DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 48,
  bottomBelowDeg: 40,
  confirmFrames: 5,
};

/**
 * 弓步：工作腿膝角（两侧更弯的一侧）。分腿站起常停在 150°–155°，
 * 故 standAbove 低于深蹲的 160°。见 lunge-rules.md。
 */
export const DEFAULT_LUNGE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 150,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};

/**
 * 平板：drive = 180 − 肩髋踝一线。撑稳（一线高）→ drive 低 = bottom；
 * 塌/跪起 → drive 高 = stand。见 plank-rules.md。
 */
export const DEFAULT_PLANK_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 32,
  bottomBelowDeg: 22,
  confirmFrames: 5,
};

/** 哑铃划船：工作肘角。悬垂高、拉至髋侧低。 */
export const DEFAULT_DB_ROW_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 125,
  bottomBelowDeg: 95,
  confirmFrames: 5,
};

/**
 * 站姿推举：肘角。锁肘高 = stand，肩侧托铃低 = bottom。
 * 样片锁肘约 147°–160°，standAbove 取 145 而非 160。
 */
export const DEFAULT_OHP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 145,
  bottomBelowDeg: 105,
  confirmFrames: 5,
};

/** 卧推：肘角，阈值与俯卧撑同量级（FR-088 不抄样片单帧）。 */
export const DEFAULT_BENCH_PRESS_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 120,
  confirmFrames: 5,
};

/**
 * 罗马尼亚硬拉：髋角（肩-髋-膝）。锁髋高 = stand，铰链低 = bottom。
 * 样片锁髋约 174°、最深约 50°；进底线用消费级 115°（FR-088）。
 */
export const DEFAULT_RDL_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 115,
  confirmFrames: 5,
};

/**
 * 引体：工作肘角。悬垂高 = stand，过杆低 = bottom。
 * 样片悬垂约 170°；顶点 2D 可折到噪声级。standAbove 150 / bottomBelow 100。
 */
export const DEFAULT_PULLUP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 150,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};

/**
 * 哑铃飞鸟：画面开合与手臂相对竖直取更打开的。合拢高 = stand，打开低 = bottom。
 * 进底线 145（FR-088 不抄最大打开角）。
 */
export const DEFAULT_DB_FLY_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 145,
  confirmFrames: 5,
};

/**
 * 双杠臂屈伸：肘角。锁肘高 = stand，沉肩屈肘低 = bottom。
 * 样片锁肘约 160°、最深约 58°；standAbove 150 / bottomBelow 110（FR-088）。
 */
export const DEFAULT_DIP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 150,
  bottomBelowDeg: 110,
  confirmFrames: 5,
};

/** 上斜俯卧撑：与标准俯卧撑同量级肘角。撑起高，胸口近支撑面低。 */
export const DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 160,
  bottomBelowDeg: 120,
  confirmFrames: 5,
};

/**
 * 绳索夹胸：drive = 180 − 双腕三维夹角。交汇高 = stand，打开低 = bottom。
 * standAbove 120 / bottomBelow 80（FR-088）。
 */
export const DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 120,
  bottomBelowDeg: 80,
  confirmFrames: 5,
};

/**
 * 坐姿推胸器：可见肘均值。侧面远臂 2D 常折叠，不用单侧高 vis。
 * 样片均值锁约 140°、收到约 45°。standAbove 130 / bottomBelow 95（FR-088）。
 */
export const DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 130,
  bottomBelowDeg: 95,
  confirmFrames: 5,
};

/**
 * 侧平举 / 前平举：下垂高，抬至肩高低。
 * 侧平举 drive = 180 − max(肩到肘或腕相对竖直向下)；前平举仍用髋-肩-肘。
 * 样片顶点外展可到 90°+；standAbove 155 / bottomBelow 115（FR-088）。
 */
export const DEFAULT_LATERAL_RAISE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 115,
  confirmFrames: 5,
};

/** 侧平举单次周期 drive 峰谷差下限，挡摆动/半程晃过阈值。 */
export const LATERAL_RAISE_MIN_ROM_DEG = 50;

export const DEFAULT_FRONT_RAISE_PHASE_CONFIG: PhaseConfig =
  DEFAULT_LATERAL_RAISE_PHASE_CONFIG;

/**
 * 俯身飞鸟：drive = 180 − 手臂相对竖直。下垂高，打开低。
 * standAbove 155 / bottomBelow 125（FR-088）。侧机位靠深度。
 */
export const DEFAULT_REAR_DELT_FLY_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 125,
  confirmFrames: 5,
};

/**
 * 面拉：可见肘均值。伸向绳索高，拉至面部低。
 * 样片最弯可到噪声；standAbove 130 / bottomBelow 100（FR-088）。
 */
export const DEFAULT_FACE_PULL_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 130,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};

/** 派克俯卧撑：与上斜俯卧撑同量级肘角。撑起高，头近地面低。 */
export const DEFAULT_PIKE_PUSHUP_PHASE_CONFIG: PhaseConfig =
  DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG;

/** 高位下拉：三维工作肘。伸直 ≳145，收到上胸 ≲105。侧面也计。 */
export const DEFAULT_LAT_PULLDOWN_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 145,
  bottomBelowDeg: 105,
  confirmFrames: 5,
};

/** Phase G：与各自 *-rules.md 一致。高位下拉为 0.2.0，其余这条仍是 0.1.0。 */
export const DEFAULT_SEATED_ROW_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 130,
  bottomBelowDeg: 95,
  confirmFrames: 5,
};
export const DEFAULT_SUPERMAN_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 168,
  bottomBelowDeg: 152,
  confirmFrames: 5,
};
export const DEFAULT_BAND_ROW_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 130,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};
export const DEFAULT_LEG_PRESS_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 105,
  confirmFrames: 5,
};
export const DEFAULT_CALF_RAISE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 85,
  bottomBelowDeg: 60,
  confirmFrames: 5,
};
export const DEFAULT_GOBLET_SQUAT_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 100,
  confirmFrames: 5,
};
export const DEFAULT_DEAD_BUG_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 70,
  bottomBelowDeg: 35,
  confirmFrames: 5,
};
export const DEFAULT_BIRD_DOG_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 65,
  /** 宽于 26° 偏离，髋水平规则才能在 bottom 里报。 */
  bottomBelowDeg: 40,
  confirmFrames: 5,
};
export const DEFAULT_CRUNCH_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 165,
  bottomBelowDeg: 148,
  confirmFrames: 5,
};
export const DEFAULT_SIDE_PLANK_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 35,
  bottomBelowDeg: 22,
  confirmFrames: 5,
};
export const DEFAULT_HANGING_KNEE_RAISE_PHASE_CONFIG: PhaseConfig = {
  standAboveDeg: 155,
  bottomBelowDeg: 105,
  confirmFrames: 5,
};

export function initialPhaseState(): PhaseState {
  return { phase: "stand", pendingPhase: null, pendingFrames: 0 };
}

/** 取两侧膝角均值；单侧缺失用另一侧；都缺返回 null。 */
export function squatKneeAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftHip,
    b: LandmarkIndex.LeftKnee,
    c: LandmarkIndex.LeftAnkle,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightHip,
    b: LandmarkIndex.RightKnee,
    c: LandmarkIndex.RightAnkle,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

/** 取两侧肘角（肩-肘-腕）均值；俯卧撑相位驱动。 */
export function pushupElbowAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftElbow,
    c: LandmarkIndex.LeftWrist,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightElbow,
    c: LandmarkIndex.RightWrist,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

/** 肩-髋-膝均值：髋伸。贴地较小，顶髋锁髋接近 180°。RDL 锁髋大、铰链小。 */
export function gluteBridgeHipAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftHip,
    c: LandmarkIndex.LeftKnee,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightHip,
    c: LandmarkIndex.RightKnee,
  });
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

/**
 * 臀桥相位驱动角：180 − 髋伸角。静息高、顶髋低，复用 squat 状态机。
 */
export function gluteBridgeDriveDeg(pose: Pose): number | null {
  const hip = gluteBridgeHipAngle(pose);
  return hip == null ? null : 180 - hip;
}

/** RDL 相位驱动：髋角本身（锁髋高、铰链低）。 */
export function rdlHipAngle(pose: Pose): number | null {
  return gluteBridgeHipAngle(pose);
}

export function kneeAngleOf(pose: Pose, side: "left" | "right"): number | null {
  return jointAngle(
    pose,
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
        },
  );
}

/** 弓步工作腿膝角：两侧髋-膝-踝中更弯的一侧。 */
export function lungeWorkingKneeAngle(pose: Pose): number | null {
  const left = kneeAngleOf(pose, "left");
  const right = kneeAngleOf(pose, "right");
  if (left != null && right != null) return Math.min(left, right);
  return left ?? right;
}

const COLLAPSED_ELBOW_DEG = 15;

function elbowAngle(pose: Pose, side: "left" | "right"): number | null {
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

function visibleElbows(pose: Pose): number[] {
  const out: number[] = [];
  for (const side of ["left", "right"] as const) {
    const deg = elbowAngle(pose, side);
    if (deg != null && deg >= COLLAPSED_ELBOW_DEG) out.push(deg);
  }
  return out;
}

/** 划船/引体工作肘：两侧可见肘中更弯的一侧（忽略 2D 折叠噪声）。 */
export function dbRowWorkingElbowAngle(pose: Pose): number | null {
  const vals = visibleElbows(pose);
  if (vals.length === 0)
    return elbowAngle(pose, "right") ?? elbowAngle(pose, "left");
  return Math.min(...vals);
}

/** 引体工作肘：与划船同一度量。 */
export function pullupWorkingElbowAngle(pose: Pose): number | null {
  return dbRowWorkingElbowAngle(pose);
}

function elbowAngle3d(pose: Pose, side: "left" | "right"): number | null {
  const shoulder =
    pose[
      side === "left"
        ? LandmarkIndex.LeftShoulder
        : LandmarkIndex.RightShoulder
    ];
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  if (!shoulder || !elbow || !wrist) return null;
  return angleBetween3d(shoulder, elbow, wrist);
}

/**
 * 高位下拉工作肘：两侧三维肘角里更弯的一侧。
 * 朝镜头折的臂，画面夹角会显得过直；有深度时把 z 算进去。
 * 短于叠点或小于 15° 的折叠不算。
 */
export function latPulldownWorkingElbowAngle(pose: Pose): number | null {
  const vals: number[] = [];
  for (const side of ["left", "right"] as const) {
    const deg = elbowAngle3d(pose, side);
    if (deg != null && deg >= COLLAPSED_ELBOW_DEG) vals.push(deg);
  }
  if (vals.length === 0) return null;
  return Math.min(...vals);
}

function midLandmark(
  a: Landmark | undefined,
  b: Landmark | undefined,
): Landmark | undefined {
  if (a && b) {
    const z =
      a.z != null && b.z != null ? (a.z + b.z) / 2 : (a.z ?? b.z);
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      ...(z != null ? { z } : {}),
      visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
    };
  }
  return a ?? b;
}

function shoulderMid(pose: Pose): Landmark | undefined {
  return midLandmark(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
}

function wristApartFromShoulder(
  pose: Pose,
  side: "left" | "right",
): Landmark | undefined {
  const shoulder =
    pose[
      side === "left"
        ? LandmarkIndex.LeftShoulder
        : LandmarkIndex.RightShoulder
    ];
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  if (!shoulder || !wrist) return undefined;
  if (tiltFromVerticalDeg(shoulder, wrist) == null) return undefined;
  return wrist;
}

/**
 * 飞鸟开合角：双腕相对肩中点的画面夹角（合拢小、打开大）。
 * 缺一侧腕，或腕叠在自己肩上，则 null。
 */
export function dbFlyWristIncludedDeg(pose: Pose): number | null {
  const mid = shoulderMid(pose);
  const lw = wristApartFromShoulder(pose, "left");
  const rw = wristApartFromShoulder(pose, "right");
  if (!mid || !lw || !rw) return null;
  return angleBetween(lw, mid, rw);
}

/** 双腕相对肩中点的三维夹角。缺腕、叠在肩上或叠在肩中点上则 null。 */
export function dbFlyWristIncluded3dDeg(pose: Pose): number | null {
  const mid = shoulderMid(pose);
  const lw = wristApartFromShoulder(pose, "left");
  const rw = wristApartFromShoulder(pose, "right");
  if (!mid || !lw || !rw) return null;
  return angleBetween3d(lw, mid, rw);
}

function sideArmTiltDeg(pose: Pose, side: "left" | "right"): number | null {
  const shoulder =
    pose[
      side === "left"
        ? LandmarkIndex.LeftShoulder
        : LandmarkIndex.RightShoulder
    ];
  if (!shoulder) return null;
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  if (wrist) {
    const tilt = tiltFromVerticalDeg(shoulder, wrist);
    if (tilt != null) return tilt;
  }
  if (!elbow) return null;
  return tiltFromVerticalDeg(shoulder, elbow);
}

/**
 * 两侧里更水平的手臂。0° 顺着重力，90° 水平。
 * 手腕与肩叠点则改看肘；两侧都叠点则 null。
 */
export function armTiltFromVerticalDeg(pose: Pose): number | null {
  const vals: number[] = [];
  for (const side of ["left", "right"] as const) {
    const tilt = sideArmTiltDeg(pose, side);
    if (tilt != null) vals.push(tilt);
  }
  if (vals.length === 0) return null;
  return Math.max(...vals);
}

/** 180 − 相对竖直。下垂/朝上高，抬到水平低。 */
export function armTiltDriveDeg(pose: Pose): number | null {
  const tilt = armTiltFromVerticalDeg(pose);
  if (tilt == null) return null;
  return 180 - tilt;
}

/** 画面双腕夹角的 drive。缺一侧腕则 null，不看肘弯。 */
export function dbFlyPlanarDriveDeg(pose: Pose): number | null {
  const included = dbFlyWristIncludedDeg(pose);
  if (included == null) return null;
  return 180 - included;
}

/**
 * 胸飞鸟驱动：画面开合与相对竖直都算，取更打开的（更小的 drive）。
 * 远侧腕丢失时只剩看得见的手臂相对竖直。
 */
export function dbFlyDriveDeg(pose: Pose): number | null {
  const planar = dbFlyPlanarDriveDeg(pose);
  const tilt = armTiltDriveDeg(pose);
  if (planar == null) return tilt;
  if (tilt == null) return planar;
  return Math.min(planar, tilt);
}

/** 俯身飞鸟：只看手臂相对竖直。侧机位朝镜头打开时深度把夹角抬起来。 */
export function rearDeltFlyDriveDeg(pose: Pose): number | null {
  return armTiltDriveDeg(pose);
}

/** 夹胸：双腕三维开合。两端都在身前，不用相对竖直。 */
export function cableCrossoverDriveDeg(pose: Pose): number | null {
  const included = dbFlyWristIncluded3dDeg(pose);
  if (included == null) return null;
  return 180 - included;
}

function hipShoulderElbowDeg(
  pose: Pose,
  side: "left" | "right",
): number | null {
  return jointAngle(
    pose,
    side === "left"
      ? {
          a: LandmarkIndex.LeftHip,
          b: LandmarkIndex.LeftShoulder,
          c: LandmarkIndex.LeftElbow,
        }
      : {
          a: LandmarkIndex.RightHip,
          b: LandmarkIndex.RightShoulder,
          c: LandmarkIndex.RightElbow,
        },
  );
}

function armTipVerticalAbductionDeg(
  pose: Pose,
  side: "left" | "right",
): number | null {
  const shoulder =
    pose[
      side === "left"
        ? LandmarkIndex.LeftShoulder
        : LandmarkIndex.RightShoulder
    ];
  if (!shoulder) return null;
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  let best: number | null = null;
  for (const tip of [elbow, wrist]) {
    if (!tip) continue;
    const deg = tipAbductionFromVerticalDeg(shoulder, tip);
    if (best == null || deg > best) best = deg;
  }
  return best;
}

function armRaiseAbductionDeg(
  pose: Pose,
  side: "left" | "right",
): number | null {
  const hip =
    pose[side === "left" ? LandmarkIndex.LeftHip : LandmarkIndex.RightHip];
  const hse = landmarkReliable(hip) ? hipShoulderElbowDeg(pose, side) : null;
  const vertical = armTipVerticalAbductionDeg(pose, side);
  if (hse != null && vertical != null) return Math.max(hse, vertical);
  return hse ?? vertical;
}

/**
 * 前平举驱动：180 − 两侧可见外展的较大值。
 * 每侧取髋-肩-肘与肩到肘/腕相对竖直的较大值：近侧透视时髋-肩-肘会偏小，
 * 只信它会把完整前抬判成半程；远侧髋常缺失则只剩竖直外展。
 */
export function shoulderRaiseDriveDeg(pose: Pose): number | null {
  const vals: number[] = [];
  for (const side of ["left", "right"] as const) {
    const deg = armRaiseAbductionDeg(pose, side);
    if (deg != null) vals.push(deg);
  }
  if (vals.length === 0) return null;
  return 180 - Math.max(...vals);
}

/** 前平举单侧。读不到的一侧交给行程引擎丢掉，不拦另一侧。 */
export function frontRaiseSideDriveDeg(
  pose: Pose,
  side: "left" | "right",
): number | null {
  const abd = armRaiseAbductionDeg(pose, side);
  return abd == null ? null : 180 - abd;
}

/** 腕贴左右边时视为至少抬到约肩高（外展 70° → drive 110，能进 bottom）。 */
export const LATERAL_RAISE_SIDE_EXIT_ABD_DEG = 70;

export type LateralRaiseWristMemory = {
  left: number | null;
  right: number | null;
};

export function initialLateralRaiseWristMemory(): LateralRaiseWristMemory {
  return { left: null, right: null };
}

/**
 * 肩到肘/腕相对重力向下的夹角。世界坐标 Y 朝上，向下是 (0,-1,0)。
 * 弯腰但手臂垂着时这个角仍接近 0，不会被画面里的上下移动当成抬臂。
 */
function worldAbductionFromDownDeg(
  shoulder: Landmark,
  tip: Landmark,
): number | null {
  if (!hasWorldPoint(shoulder) || !hasWorldPoint(tip)) return null;
  const vx = tip.wx - shoulder.wx;
  const vy = tip.wy - shoulder.wy;
  const vz = tip.wz - shoulder.wz;
  const n = Math.hypot(vx, vy, vz);
  if (n < 0.02) return null;
  const cos = Math.min(1, Math.max(-1, -vy / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

function tipAbductionFromVerticalDeg(
  shoulder: Landmark,
  tip: Landmark,
): number {
  const world = worldAbductionFromDownDeg(shoulder, tip);
  if (world != null) return world;
  const down: Landmark = { x: shoulder.x, y: shoulder.y + 1 };
  return angleBetween(down, shoulder, tip);
}

function armAbductionFromVerticalDeg(
  pose: Pose,
  side: "left" | "right",
  memory?: LateralRaiseWristMemory,
  framePose?: Pose,
): number | null {
  const shoulder =
    pose[
      side === "left"
        ? LandmarkIndex.LeftShoulder
        : LandmarkIndex.RightShoulder
    ];
  if (!shoulder) return null;
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  const wristFrame =
    (framePose ?? pose)[
      side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist
    ] ?? wrist;
  let best: number | null = null;
  const consider = (deg: number) => {
    if (best == null || deg > best) best = deg;
  };
  const worldVals: number[] = [];
  if (elbow) {
    const world = worldAbductionFromDownDeg(shoulder, elbow);
    if (world != null) worldVals.push(world);
  }
  if (wrist) {
    const world = worldAbductionFromDownDeg(shoulder, wrist);
    if (world != null) worldVals.push(world);
  }
  if (worldVals.length > 0) {
    const worldBest = Math.max(...worldVals);
    if (memory) memory[side] = worldBest;
    return worldBest;
  }
  if (elbow) consider(tipAbductionFromVerticalDeg(shoulder, elbow));
  if (wrist && landmarkHorizontallyOut(wristFrame)) {
    // 贴边看相机画面；外展角用抬正后的点。垃圾小角丢掉，偏低 memory
    // 不能盖掉 70° 地板；当前腕角已经像抬到肩高则照用。
    const current = tipAbductionFromVerticalDeg(shoulder, wrist);
    const usable =
      current >= LATERAL_RAISE_SIDE_EXIT_ABD_DEG ? current : 0;
    consider(
      Math.max(
        usable,
        memory?.[side] ?? 0,
        LATERAL_RAISE_SIDE_EXIT_ABD_DEG,
      ),
    );
  } else if (wrist) {
    const deg = tipAbductionFromVerticalDeg(shoulder, wrist);
    if (memory) memory[side] = deg;
    consider(deg);
  }
  return best;
}

/**
 * 侧平举驱动：180 − max(两侧肩到肘或腕相对重力竖直向下)。
 * 不用髋（前景凳会吸走髋点）。取肘/腕较大外展：哑铃在腕上、肘仍低于肩时
 * 只看肘会进不了 bottom（健身房正面抬至肩高仍 Rep 卡死）。
 * 腕顶到左右画幅边：max(可用腕角, memory, 约 70° 地板)，偏低记忆不能盖掉地板。
 * `framePose`：贴边检测用相机画面坐标；缺省与 `pose` 相同。
 */
export function lateralRaiseDriveDeg(
  pose: Pose,
  memory?: LateralRaiseWristMemory,
  framePose?: Pose,
): number | null {
  const vals: number[] = [];
  for (const side of ["left", "right"] as const) {
    const deg = armAbductionFromVerticalDeg(pose, side, memory, framePose);
    if (deg != null) vals.push(deg);
  }
  if (vals.length === 0) return null;
  return 180 - Math.max(...vals);
}

/**
 * 手可以略低于肩，仍算「大约肩高」。限度是这条手臂长度的比例，不是度数。
 * 0.35 ≈ 手还在肩下一小段；再低就是半程。
 * 侧平举的行程和完成都看画面：世界坐标的前后距离不再把平举读成没离开。
 */
const SHOULDER_LINE_SLACK = 0.35;

function segmentReachedShoulder(
  shoulder: Landmark,
  tip: Landmark,
): boolean {
  const dx = tip.x - shoulder.x;
  const dy = tip.y - shoulder.y;
  const seg = Math.hypot(dx, dy);
  if (seg < 0.02) return false;
  const atShoulder = tip.y <= shoulder.y + SHOULDER_LINE_SLACK * seg;
  const outToSide = Math.abs(dx) >= Math.abs(dy);
  return atShoulder && outToSide;
}

/**
 * 侧平举的终点：腕（没有腕就用肘）升到本人肩的高度，并且向两侧打开。
 * 世界坐标的 Y 朝上。往前举、手臂还低于肩，都不是终点。
 * 日志 C06-05，尝试引擎复用此判断（C07-04），见 docs/count-change-log.md。
 */
export function lateralRaiseSideReached(
  pose: Pose,
  side: "left" | "right",
): boolean {
  const shoulder =
    pose[
      side === "left" ? LandmarkIndex.LeftShoulder : LandmarkIndex.RightShoulder
    ];
  if (!shoulder) return false;
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  const tip = wrist ?? elbow;
  if (!tip) return false;
  return segmentReachedShoulder(shoulder, tip);
}

export function lateralRaiseShoulderReached(pose: Pose): boolean {
  return (
    lateralRaiseSideReached(pose, "left") ||
    lateralRaiseSideReached(pose, "right")
  );
}

/** 推举/卧推肘角：两侧可见肘均值。 */
export function meanVisibleElbowAngle(pose: Pose): number | null {
  const vals = visibleElbows(pose);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * 双杠肘角：两侧都可见时取可见度更高的一侧（3/4 近侧）。
 * 远侧 2D 常看起来很直，均值会把相位从 bottom 抬走。
 */
export function preferredVisibleElbowAngle(pose: Pose): number | null {
  const left = elbowAngle(pose, "left");
  const right = elbowAngle(pose, "right");
  const leftOk = left != null && left >= COLLAPSED_ELBOW_DEG;
  const rightOk = right != null && right >= COLLAPSED_ELBOW_DEG;
  if (leftOk && rightOk) {
    const lv = pose[LandmarkIndex.LeftElbow]?.visibility ?? 0;
    const rv = pose[LandmarkIndex.RightElbow]?.visibility ?? 0;
    return lv >= rv ? left : right;
  }
  if (leftOk) return left;
  if (rightOk) return right;
  return left ?? right;
}

function sideOfLine(
  point: Landmark,
  a: Landmark,
  b: Landmark,
): number {
  const c = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  if (Math.abs(c) < 1e-8) return 0;
  return c > 0 ? 1 : -1;
}

function pickLm(
  pose: Pose,
  a: LandmarkIndex,
  b: LandmarkIndex,
): Landmark | undefined {
  return pose[a] ?? pose[b];
}

/**
 * 髋向支撑面偏（衣摆/轮廓拖地）→ 一线视为撑住（180°）。
 * 髋向对侧偏（撅臀）→ 仍用真实肩髋踝角。
 * 2D 无法区分衣摆拖地与真塌髋；计秒优先穿衣可用，撅臀仍能拦住。
 */
function plankLineFromPoints(
  sh: Landmark | undefined,
  hip: Landmark | undefined,
  _knee: Landmark | undefined,
  an: Landmark | undefined,
  support: Landmark | undefined,
): number | null {
  if (!sh || !hip || !an) return null;
  const hipLine = angleBetween(sh, hip, an);
  if (!support) return hipLine;
  const floorSide = sideOfLine(support, sh, an);
  const hipSide = sideOfLine(hip, sh, an);
  if (floorSide !== 0 && hipSide !== 0 && hipSide !== floorSide) {
    return hipLine;
  }
  return 180;
}

function plankLineOnSide(
  pose: Pose,
  sh: LandmarkIndex,
  hip: LandmarkIndex,
  knee: LandmarkIndex,
  an: LandmarkIndex,
  elbow: LandmarkIndex,
  wrist: LandmarkIndex,
  mixSides = false,
): number | null {
  if (mixSides) {
    return plankLineFromPoints(
      pickLm(pose, LandmarkIndex.LeftShoulder, LandmarkIndex.RightShoulder),
      pickLm(pose, LandmarkIndex.LeftHip, LandmarkIndex.RightHip),
      pickLm(pose, LandmarkIndex.LeftKnee, LandmarkIndex.RightKnee),
      pickLm(pose, LandmarkIndex.LeftAnkle, LandmarkIndex.RightAnkle),
      pickLm(pose, LandmarkIndex.LeftElbow, LandmarkIndex.RightElbow) ??
        pickLm(pose, LandmarkIndex.LeftWrist, LandmarkIndex.RightWrist),
    );
  }
  return plankLineFromPoints(
    pose[sh],
    pose[hip],
    pose[knee],
    pose[an],
    pose[elbow] ?? pose[wrist],
  );
}

/** 肩-髋-踝一线（平板）。衣裤拖地把髋拉向支撑面时视为撑住；仅撅臀用真实髋角。 */
export function plankBodyLineDeg(pose: Pose): number | null {
  const left = plankLineOnSide(
    pose,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.LeftElbow,
    LandmarkIndex.LeftWrist,
  );
  const right = plankLineOnSide(
    pose,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.RightHip,
    LandmarkIndex.RightKnee,
    LandmarkIndex.RightAnkle,
    LandmarkIndex.RightElbow,
    LandmarkIndex.RightWrist,
  );
  if (left != null && right != null) return (left + right) / 2;
  if (left != null || right != null) return left ?? right;
  return plankLineOnSide(
    pose,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.LeftElbow,
    LandmarkIndex.LeftWrist,
    true,
  );
}

/** 平板驱动角：180 − 身体一线。撑稳低、撅臀高。 */
export function plankDriveDeg(pose: Pose): number | null {
  const line = plankBodyLineDeg(pose);
  return line == null ? null : 180 - line;
}

/** 点相对髋的仰角：与髋同高 ≈ 0°，朝画面上方抬起变大。 */
function elevationFromHipDeg(hip: Landmark, point: Landmark): number {
  const dx = Math.abs(point.x - hip.x);
  const up = hip.y - point.y;
  return (Math.atan2(up, Math.max(dx, 1e-6)) * 180) / Math.PI;
}

function midOf(
  pose: Pose,
  a: LandmarkIndex,
  b: LandmarkIndex,
): Landmark | undefined {
  return midLandmark(pose[a], pose[b]);
}

/** 超人抬伸角：肩、膝相对髋，取更离开垫面的一侧。 */
export function supermanLiftDeg(pose: Pose): number | null {
  const hip = midOf(pose, LandmarkIndex.LeftHip, LandmarkIndex.RightHip);
  if (!hip) return null;
  const vals: number[] = [];
  for (const idx of [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.RightKnee,
  ]) {
    const p = pose[idx];
    if (p) vals.push(elevationFromHipDeg(hip, p));
  }
  if (vals.length === 0) return null;
  return Math.max(...vals);
}

export function supermanDriveDeg(pose: Pose): number | null {
  const lift = supermanLiftDeg(pose);
  return lift == null ? null : 180 - lift;
}

function ankleOf(pose: Pose, side: "left" | "right"): number | null {
  return jointAngle(
    pose,
    side === "left"
      ? {
          a: LandmarkIndex.LeftKnee,
          b: LandmarkIndex.LeftAnkle,
          c: LandmarkIndex.LeftFootIndex,
        }
      : {
          a: LandmarkIndex.RightKnee,
          b: LandmarkIndex.RightAnkle,
          c: LandmarkIndex.RightFootIndex,
        },
  );
}

/** 提踵踝角：膝-踝-脚尖。两侧都在时取均值。 */
export function calfAnkleDeg(pose: Pose): number | null {
  const vals = [ankleOf(pose, "left"), ankleOf(pose, "right")].filter(
    (v): v is number => v != null,
  );
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function calfRaiseDriveDeg(pose: Pose): number | null {
  const ankle = calfAnkleDeg(pose);
  return ankle == null ? null : 180 - ankle;
}

/** 两侧肩-髋-膝里更直的一条（死虫/鸟狗正在伸的腿）。 */
export function extendingHipAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftHip,
    c: LandmarkIndex.LeftKnee,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightHip,
    c: LandmarkIndex.RightKnee,
  });
  if (left != null && right != null) return Math.max(left, right);
  return left ?? right;
}

export function deadBugDriveDeg(pose: Pose): number | null {
  const hip = extendingHipAngle(pose);
  return hip == null ? null : 180 - hip;
}

export function birdDogDriveDeg(pose: Pose): number | null {
  return deadBugDriveDeg(pose);
}

/** 伸展腿相对 180° 直线的偏离。 */
export function birdDogDeviationDeg(pose: Pose): number | null {
  const hip = extendingHipAngle(pose);
  return hip == null ? null : 180 - hip;
}

/** 肩-髋相对水平的仰角。髋抬离垫面为正。 */
export function lumbarLiftDeg(pose: Pose): number | null {
  const shoulder = midOf(
    pose,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
  );
  const hip = midOf(pose, LandmarkIndex.LeftHip, LandmarkIndex.RightHip);
  if (!shoulder || !hip) return null;
  return elevationFromHipDeg(shoulder, hip);
}

/** 卷腹：肩相对髋离开垫面的仰角。 */
export function crunchFlexionDeg(pose: Pose): number | null {
  const hip = midOf(pose, LandmarkIndex.LeftHip, LandmarkIndex.RightHip);
  const shoulder = midOf(
    pose,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
  );
  if (!hip || !shoulder) return null;
  return Math.max(0, elevationFromHipDeg(hip, shoulder));
}

export function crunchDriveDeg(pose: Pose): number | null {
  const flex = crunchFlexionDeg(pose);
  return flex == null ? null : 180 - flex;
}

/** 悬垂提膝：两侧髋角里更小的一侧（提起的腿）。 */
export function hangingKneeHipAngle(pose: Pose): number | null {
  const left = jointAngle(pose, {
    a: LandmarkIndex.LeftShoulder,
    b: LandmarkIndex.LeftHip,
    c: LandmarkIndex.LeftKnee,
  });
  const right = jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightHip,
    c: LandmarkIndex.RightKnee,
  });
  if (left != null && right != null) return Math.min(left, right);
  return left ?? right;
}

const PHASE_G_CONFIG: Record<string, PhaseConfig> = {
  "lat-pulldown": DEFAULT_LAT_PULLDOWN_PHASE_CONFIG,
  "seated-row": DEFAULT_SEATED_ROW_PHASE_CONFIG,
  superman: DEFAULT_SUPERMAN_PHASE_CONFIG,
  "band-row": DEFAULT_BAND_ROW_PHASE_CONFIG,
  "leg-press": DEFAULT_LEG_PRESS_PHASE_CONFIG,
  "calf-raise": DEFAULT_CALF_RAISE_PHASE_CONFIG,
  "goblet-squat": DEFAULT_GOBLET_SQUAT_PHASE_CONFIG,
  "dead-bug": DEFAULT_DEAD_BUG_PHASE_CONFIG,
  "bird-dog": DEFAULT_BIRD_DOG_PHASE_CONFIG,
  crunch: DEFAULT_CRUNCH_PHASE_CONFIG,
  "side-plank": DEFAULT_SIDE_PLANK_PHASE_CONFIG,
  "hanging-knee-raise": DEFAULT_HANGING_KNEE_RAISE_PHASE_CONFIG,
};

/** Phase G 相位阈值；不是这 12 条时返回 null。 */
export function phaseConfigForExercise(id: string): PhaseConfig | null {
  return PHASE_G_CONFIG[id] ?? null;
}

/**
 * Phase G 驱动角。不是这 12 条时返回 undefined，算不出时返回 null。
 */
export function driveAngleForExercise(
  id: string,
  pose: Pose,
): number | null | undefined {
  switch (id) {
    case "lat-pulldown":
      return latPulldownWorkingElbowAngle(pose);
    case "seated-row":
    case "band-row":
      return dbRowWorkingElbowAngle(pose);
    case "superman":
      return supermanDriveDeg(pose);
    case "leg-press":
    case "goblet-squat":
      return lungeWorkingKneeAngle(pose);
    case "calf-raise":
      return calfRaiseDriveDeg(pose);
    case "dead-bug":
      return deadBugDriveDeg(pose);
    case "bird-dog":
      return birdDogDriveDeg(pose);
    case "crunch":
      return crunchDriveDeg(pose);
    case "side-plank":
      return plankDriveDeg(pose);
    case "hanging-knee-raise":
      return hangingKneeHipAngle(pose);
    default:
      return undefined;
  }
}

/**
 * 由当前相位 + 驱动角，给出「目标相位」（未考虑防抖）。
 * - stand：角 > standAbove
 * - bottom：角 < bottomBelow
 * - 中间区：按上一相位方向判 descend / ascend
 */
function targetPhase(current: Phase, angle: number, cfg: PhaseConfig): Phase {
  if (angle > cfg.standAboveDeg) return "stand";
  if (angle < cfg.bottomBelowDeg) return "bottom";
  // 中间过渡区：依据上一相位推断上升还是下降
  switch (current) {
    case "stand":
    case "descend":
      return "descend";
    case "bottom":
    case "ascend":
      return "ascend";
    default:
      return current;
  }
}

/**
 * 用显式驱动角推进一帧（俯卧撑肘角 / 测试注入）。
 */
export function stepPhaseWithAngle(
  state: PhaseState,
  angle: number | null,
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): { state: PhaseState; changed: boolean } {
  if (angle == null) {
    return { state: { ...state }, changed: false };
  }

  const target = targetPhase(state.phase, angle, cfg);

  // 目标即当前：清空候选
  if (target === state.phase) {
    return {
      state: { phase: state.phase, pendingPhase: null, pendingFrames: 0 },
      changed: false,
    };
  }

  // 过渡相位（descend/ascend）无需 confirmFrames，立即跟随（连续量）
  const isTransient = target === "descend" || target === "ascend";
  if (isTransient) {
    return {
      state: { phase: target, pendingPhase: null, pendingFrames: 0 },
      changed: true,
    };
  }

  // 端点相位（stand/bottom）需连续 confirmFrames 帧确认
  const pendingFrames =
    state.pendingPhase === target ? state.pendingFrames + 1 : 1;
  if (pendingFrames >= cfg.confirmFrames) {
    return {
      state: { phase: target, pendingPhase: null, pendingFrames: 0 },
      changed: true,
    };
  }
  return {
    state: {
      phase: state.phase,
      pendingPhase: target,
      pendingFrames,
    },
    changed: false,
  };
}

/**
 * 推进一帧（默认深蹲膝角）。角缺失则保持原相位。
 */
export function stepPhase(
  state: PhaseState,
  pose: Pose,
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): { state: PhaseState; changed: boolean } {
  return stepPhaseWithAngle(state, squatKneeAngle(pose), cfg);
}

/** 跑完整序列，返回相位转移序列（去重相邻重复）。 */
export function runPhaseSequence(
  poses: Pose[],
  cfg: PhaseConfig = DEFAULT_SQUAT_PHASE_CONFIG,
): Phase[] {
  let state = initialPhaseState();
  const transitions: Phase[] = [state.phase];
  for (const pose of poses) {
    const res = stepPhase(state, pose, cfg);
    state = res.state;
    if (res.changed && transitions[transitions.length - 1] !== state.phase) {
      transitions.push(state.phase);
    }
  }
  return transitions;
}
