/**
 * Ghost 相位插值（M3-T6 / VT-P3B-001,002 / FR-064,065）
 * 支持深蹲 / 俯卧撑等多动作关键帧。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  ghostKeyframesFor,
  ghostPhaseConfigFor,
  LandmarkIndex,
  type GhostExerciseId,
  type Landmark,
  type Phase,
  type Pose,
} from "@fitness-coach/core";
import {
  inferSideFacing,
  orientPoseToFacing,
  type SideFacing,
} from "./sideFacing.js";

export {
  inferSideFacing,
  inferSideFacingDetailed,
  mirrorPoseX,
  orientPoseToFacing,
  SideFacingLatch,
  type SideFacing,
  type SideFacingInference,
  type SideFacingLatchUpdate,
} from "./sideFacing.js";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpLandmark(
  a: Landmark | undefined,
  b: Landmark | undefined,
  t: number,
): Landmark | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  const out: Landmark = {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
  if (a.z != null || b.z != null) {
    out.z = lerp(a.z ?? 0, b.z ?? 0, t);
  }
  if (a.visibility != null || b.visibility != null) {
    out.visibility = lerp(a.visibility ?? 1, b.visibility ?? 1, t);
  }
  return out;
}

/** 两帧 Pose 按索引 lerp（t∈[0,1]）。 */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const tt = Math.min(1, Math.max(0, t));
  const n = Math.max(a.length, b.length);
  const out: Pose = [];
  for (let i = 0; i < n; i += 1) {
    out[i] = lerpLandmark(a[i], b[i], tt);
  }
  return out;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * 由相位 + 驱动角生成 Ghost Pose（膝角或肘角）。
 */
export function ghostPoseForExercise(
  exerciseId: GhostExerciseId,
  phase: Phase,
  driveDeg: number | null,
  standAboveDeg?: number,
  bottomBelowDeg?: number,
): Pose {
  const cfg = ghostPhaseConfigFor(exerciseId);
  const standAbove = standAboveDeg ?? cfg.standAboveDeg;
  const bottomBelow = bottomBelowDeg ?? cfg.bottomBelowDeg;
  const kf = ghostKeyframesFor(exerciseId);
  const span = standAbove - bottomBelow || 1;

  switch (phase) {
    case "stand":
      return kf.stand;
    case "bottom":
      return kf.bottom;
    case "descend": {
      if (driveDeg == null) return kf.descend_mid;
      const t = clamp01((standAbove - driveDeg) / span);
      if (t <= 0.5) return lerpPose(kf.stand, kf.descend_mid, t * 2);
      return lerpPose(kf.descend_mid, kf.bottom, (t - 0.5) * 2);
    }
    case "ascend": {
      if (driveDeg == null) return kf.ascend_mid;
      const t = clamp01((driveDeg - bottomBelow) / span);
      if (t <= 0.5) return lerpPose(kf.bottom, kf.ascend_mid, t * 2);
      return lerpPose(kf.ascend_mid, kf.stand, (t - 0.5) * 2);
    }
    default:
      return kf.stand;
  }
}

/**
 * @deprecated 等价于 ghostPoseForExercise('squat', …)；保留兼容旧测试。
 */
export function ghostPoseForPhase(
  phase: Phase,
  kneeDeg: number | null,
  standAboveDeg: number = DEFAULT_SQUAT_PHASE_CONFIG.standAboveDeg,
  bottomBelowDeg: number = DEFAULT_SQUAT_PHASE_CONFIG.bottomBelowDeg,
): Pose {
  return ghostPoseForExercise(
    "squat",
    phase,
    kneeDeg,
    standAboveDeg,
    bottomBelowDeg,
  );
}

function midPoint(
  a: Landmark | undefined,
  b: Landmark | undefined,
): { x: number; y: number } | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

function hipAnkleAnchors(pose: Pose): {
  hip: { x: number; y: number };
  ankle: { x: number; y: number };
} | null {
  const hip = midPoint(
    pose[LandmarkIndex.LeftHip],
    pose[LandmarkIndex.RightHip],
  );
  const ankle = midPoint(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  if (!hip || !ankle) return null;
  return { hip, ankle };
}

function shoulderWidth(pose: Pose): number | null {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  if (!ls || !rs) return null;
  return Math.abs(ls.x - rs.x);
}

function shoulderWristAnchors(pose: Pose): {
  shoulder: { x: number; y: number };
  wrist: { x: number; y: number };
} | null {
  const shoulder = midPoint(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  const wrist = midPoint(
    pose[LandmarkIndex.LeftWrist],
    pose[LandmarkIndex.RightWrist],
  );
  if (!shoulder || !wrist) return null;
  return { shoulder, wrist };
}

/** 仅作防爆；真人近景常见 scale>1.5 */
const SCALE_MIN = 0.35;
const SCALE_MAX = 3.0;
const MIN_HIP_ANKLE = 0.1;
const MIN_SHOULDER_W = 0.08;

/**
 * upright：深蹲等站立动作，髋–踝尺度 + 钉踝。
 * support：俯卧撑（尤正面）踝点缺失/透视压缩，肩宽尺度 + 钉肩。
 */
export type GhostAlignMode = "upright" | "support";

export type AlignScaleEstimate = {
  scale: number;
  samples: number;
  mode: GhostAlignMode;
};

export type AlignEstimateOptions = {
  /** 显式指定；默认 auto 探测 */
  mode?: GhostAlignMode | "auto";
};

function hipAnkleLen(pose: Pose): number {
  const a = hipAnkleAnchors(pose);
  if (!a) return 0;
  return Math.hypot(a.ankle.x - a.hip.x, a.ankle.y - a.hip.y);
}

/**
 * 对齐模式只看示范骨几何（+显式 preferred），不看用户腿长。
 * 否则正面俯卧撑用户（透视腿短）会把侧面示范误判成 support，
 * 再用「肩宽≈0」去放大侧面骨 → 青骨完全不像样片。
 */
export function resolveAlignMode(
  demo: Pose,
  _user: Pose,
  preferred: GhostAlignMode | "auto" = "auto",
): GhostAlignMode {
  if (preferred === "upright" || preferred === "support") return preferred;
  const gLeg = hipAnkleLen(demo);
  const gShW = shoulderWidth(demo) ?? 0;
  const demoSupport =
    (gLeg < MIN_HIP_ANKLE || !hipAnkleAnchors(demo)) && gShW >= MIN_SHOULDER_W;
  if (demoSupport) return "support";
  if (gLeg >= MIN_HIP_ANKLE) return "upright";
  // 示范也缺可靠尺度时，有肩宽才走 support
  if (gShW >= MIN_SHOULDER_W) return "support";
  return "upright";
}

function estimateSupportScale(
  demo: Pose,
  user: Pose,
): AlignScaleEstimate | null {
  const gShW = shoulderWidth(demo);
  const uShW = shoulderWidth(user);
  if (gShW != null && uShW != null && gShW >= MIN_SHOULDER_W && uShW >= MIN_SHOULDER_W) {
    return {
      scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, uShW / gShW)),
      samples: 2,
      mode: "support",
    };
  }
  const g = shoulderWristAnchors(demo);
  const u = shoulderWristAnchors(user);
  if (!g || !u) return null;
  const gLen = Math.hypot(g.wrist.x - g.shoulder.x, g.wrist.y - g.shoulder.y);
  const uLen = Math.hypot(u.wrist.x - u.shoulder.x, u.wrist.y - u.shoulder.y);
  if (gLen < 0.06 || uLen < 0.06) return null;
  return {
    scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, uLen / gLen)),
    samples: 1,
    mode: "support",
  };
}

/** 直立尺度长度：髋–踝与肩–踝取更长且双方都有效的一档（侧面俯卧撑肩–踝更稳） */
function uprightSpanPair(
  demo: Pose,
  user: Pose,
): { gLen: number; uLen: number; samples: number } | null {
  const gHa = hipAnkleAnchors(demo);
  const uHa = hipAnkleAnchors(user);
  const gSh = midPoint(
    demo[LandmarkIndex.LeftShoulder],
    demo[LandmarkIndex.RightShoulder],
  );
  const uSh = midPoint(
    user[LandmarkIndex.LeftShoulder],
    user[LandmarkIndex.RightShoulder],
  );
  const gAn = gHa?.ankle ?? null;
  const uAn = uHa?.ankle ?? null;

  let gHipAnk = 0;
  let uHipAnk = 0;
  if (gHa && uHa) {
    gHipAnk = Math.hypot(gHa.ankle.x - gHa.hip.x, gHa.ankle.y - gHa.hip.y);
    uHipAnk = Math.hypot(uHa.ankle.x - uHa.hip.x, uHa.ankle.y - uHa.hip.y);
  }
  let gShAnk = 0;
  let uShAnk = 0;
  if (gSh && uSh && gAn && uAn) {
    gShAnk = Math.hypot(gAn.x - gSh.x, gAn.y - gSh.y);
    uShAnk = Math.hypot(uAn.x - uSh.x, uAn.y - uSh.y);
  }

  const hipOk = gHipAnk >= MIN_HIP_ANKLE && uHipAnk >= MIN_HIP_ANKLE;
  const shOk = gShAnk >= MIN_HIP_ANKLE && uShAnk >= MIN_HIP_ANKLE;
  if (hipOk && shOk && gSh && gAn) {
    // 仅示范骨呈水平 plank（肩–踝更偏横向）时改用肩–踝；站立深蹲仍用髋–踝
    const demoPlank =
      Math.abs(gAn.x - gSh.x) > Math.abs(gAn.y - gSh.y) * 1.15;
    if (
      demoPlank &&
      gShAnk > gHipAnk * 1.12 &&
      uShAnk > uHipAnk * 0.85
    ) {
      return { gLen: gShAnk, uLen: uShAnk, samples: 2 };
    }
    return { gLen: gHipAnk, uLen: uHipAnk, samples: 2 };
  }
  if (hipOk) return { gLen: gHipAnk, uLen: uHipAnk, samples: 2 };
  if (shOk) return { gLen: gShAnk, uLen: uShAnk, samples: 1 };
  return null;
}

/**
 * 体型尺度。站立/侧卧：髋–踝或肩–踝；支撑/正面俯卧撑：肩宽。
 * preferred=upright 时不回退 support（避免侧面样片被肩宽比拉爆）。
 */
export function estimateAlignScaleDetailed(
  demo: Pose,
  user: Pose,
  opts: AlignEstimateOptions = {},
): AlignScaleEstimate | null {
  const preferred = opts.mode ?? "auto";
  const mode = resolveAlignMode(demo, user, preferred);
  if (mode === "support") {
    return estimateSupportScale(demo, user);
  }

  const span = uprightSpanPair(demo, user);
  if (span) {
    return {
      scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, span.uLen / span.gLen)),
      samples: span.samples,
      mode: "upright",
    };
  }

  // 仅 auto 才回退 support；显式 upright 失败则 null（由上层用上次尺度）
  if (preferred === "auto") {
    return estimateSupportScale(demo, user);
  }
  return null;
}

export function estimateAlignScale(
  demo: Pose,
  user: Pose,
  opts: AlignEstimateOptions = {},
): number | null {
  return estimateAlignScaleDetailed(demo, user, opts)?.scale ?? null;
}

export type GhostAlignTransform = {
  scale: number;
  /** 保留字段；对齐不再施加旋转（旋转易把正面骨拧成斜畸形态） */
  rot: number;
  mode: GhostAlignMode;
};

/** 由站立/支撑参考帧求尺度（rot 恒为 0）。 */
export function estimateAlignTransform(
  demoStand: Pose,
  user: Pose,
  opts: AlignEstimateOptions = {},
): GhostAlignTransform | null {
  const est = estimateAlignScaleDetailed(demoStand, user, opts);
  if (!est) return null;
  return { scale: est.scale, rot: 0, mode: est.mode };
}

/**
 * 对齐尺度平滑：站立更新，行程冻结。
 */
export class GhostScaleSmoother {
  private scale = 0;
  private mode: GhostAlignMode = "upright";

  get value(): number {
    return this.scale;
  }

  get rotation(): number {
    return 0;
  }

  get transform(): GhostAlignTransform | null {
    if (this.scale <= 0) return null;
    return { scale: this.scale, rot: 0, mode: this.mode };
  }

  reset(): void {
    this.scale = 0;
    this.mode = "upright";
  }

  update(
    raw: GhostAlignTransform | number,
    allowUpdate = true,
    reliable = true,
  ): GhostAlignTransform {
    const nextScale = typeof raw === "number" ? raw : raw.scale;
    const nextMode =
      typeof raw === "number" ? this.mode : (raw.mode ?? this.mode);
    if (!(nextScale > 0) || !Number.isFinite(nextScale)) {
      return {
        scale: this.scale > 0 ? this.scale : 1,
        rot: 0,
        mode: this.mode,
      };
    }
    if (this.scale <= 0) {
      this.scale = nextScale;
      this.mode = nextMode;
      return { scale: this.scale, rot: 0, mode: this.mode };
    }
    if (!allowUpdate || !reliable) {
      return { scale: this.scale, rot: 0, mode: this.mode };
    }
    this.mode = nextMode;
    const blended = this.scale * 0.85 + nextScale * 0.15;
    const maxStep = Math.max(0.02, this.scale * 0.06);
    const delta = blended - this.scale;
    this.scale += Math.max(-maxStep, Math.min(maxStep, delta));
    return { scale: this.scale, rot: 0, mode: this.mode };
  }
}

/**
 * 侧面：按用户朝向镜像示范骨。
 * 传入 latched=0 时不镜像（等锁定），避免帧间抖翻。
 */
export function matchSideFacing(
  demo: Pose,
  user: Pose,
  latchedUserFacing?: SideFacing | 0,
): Pose {
  if (latchedUserFacing !== undefined) {
    if (latchedUserFacing === 0) return demo;
    return orientPoseToFacing(
      demo,
      latchedUserFacing,
      inferSideFacing(demo),
    );
  }
  const uFace = inferSideFacing(user);
  if (uFace === 0) return demo;
  return orientPoseToFacing(demo, uFace, inferSideFacing(demo));
}

export type AlignGhostOptions = {
  scale?: number;
  /** @deprecated 忽略；不再旋转 */
  rot?: number;
  mode?: GhostAlignMode | "auto";
};

/** 参考骨只保留躯干+四肢（去掉面部/手指点，避免颈前一团） */
export const BODY_LANDMARK_INDEXES: readonly number[] = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftElbow,
  LandmarkIndex.RightElbow,
  LandmarkIndex.LeftWrist,
  LandmarkIndex.RightWrist,
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.RightKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
  LandmarkIndex.LeftHeel,
  LandmarkIndex.RightHeel,
  LandmarkIndex.LeftFootIndex,
  LandmarkIndex.RightFootIndex,
];

export function bodyOnlyPose(pose: Pose): Pose {
  const out: Pose = [];
  for (const i of BODY_LANDMARK_INDEXES) {
    const lm = pose[i];
    if (lm) out[i] = lm;
  }
  return out;
}

/** 上半身：腿对齐后再按用户躯干长微调 */
const UPPER_BODY: ReadonlySet<number> = new Set([
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftElbow,
  LandmarkIndex.RightElbow,
  LandmarkIndex.LeftWrist,
  LandmarkIndex.RightWrist,
]);

function copyLm(
  lm: Landmark,
  x: number,
  y: number,
): Landmark {
  return {
    x,
    y,
    ...(lm.z != null ? { z: lm.z } : {}),
    ...(lm.visibility != null ? { visibility: lm.visibility } : {}),
  };
}

/**
 * 支撑式对齐（俯卧撑正面）：
 * 1) 肩宽 → 均匀尺度，钉用户肩中点
 * 2) 再按用户肩–腕垂直跨度做 Y 向微调，使手落在接近用户手的高度
 * 缺踝时绝不返回未对齐原坐标。
 */
function alignGhostSupport(
  ghost: Pose,
  user: Pose,
  scaleIn: number | undefined,
): Pose {
  const gSh = midPoint(
    ghost[LandmarkIndex.LeftShoulder],
    ghost[LandmarkIndex.RightShoulder],
  );
  const uSh = midPoint(
    user[LandmarkIndex.LeftShoulder],
    user[LandmarkIndex.RightShoulder],
  );
  if (!gSh || !uSh) return bodyOnlyPose(ghost);

  let scale = scaleIn;
  if (scale == null || !(scale > 0) || !Number.isFinite(scale)) {
    scale = estimateSupportScale(ghost, user)?.scale ?? 1;
  }
  scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));

  let scaleY = scale;
  const gSw = shoulderWristAnchors(ghost);
  const uSw = shoulderWristAnchors(user);
  if (gSw && uSw) {
    const gDy = (gSw.wrist.y - gSw.shoulder.y) * scale;
    const uDy = uSw.wrist.y - uSw.shoulder.y;
    if (Math.abs(gDy) >= 0.04 && Math.abs(uDy) >= 0.04) {
      const yFix = Math.min(1.9, Math.max(0.45, uDy / gDy));
      scaleY = scale * yFix;
    }
  }

  const out: Pose = [];
  for (let i = 0; i < ghost.length; i += 1) {
    const lm = ghost[i];
    if (!lm) continue;
    out[i] = copyLm(
      lm,
      uSh.x + (lm.x - gSh.x) * scale,
      uSh.y + (lm.y - gSh.y) * scaleY,
    );
  }

  return out;
}

/**
 * 对齐到用户。
 * upright：髋–踝尺度 + 钉踝；上半身按肩–髋微调。
 * support：肩宽 + 钉肩（正面俯卧撑缺踝时用）。
 * 不做旋转（避免正面骨被拧斜）。
 */
export function alignGhostToUser(
  ghost: Pose,
  user: Pose,
  opts: AlignGhostOptions = {},
): Pose {
  const mode = resolveAlignMode(ghost, user, opts.mode ?? "auto");
  if (mode === "support") {
    return alignGhostSupport(ghost, user, opts.scale);
  }

  const g = hipAnkleAnchors(ghost);
  const u = hipAnkleAnchors(user);
  if (!g || !u) {
    // 缺踝时回退支撑对齐，禁止返回未缩放原坐标（真机青骨缩在胸口的根因）
    return alignGhostSupport(ghost, user, opts.scale);
  }

  let scale = opts.scale;
  if (scale == null || !(scale > 0) || !Number.isFinite(scale)) {
    scale = estimateAlignScale(ghost, user, { mode: "upright" }) ?? 1;
  }
  scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));

  const out: Pose = [];
  for (let i = 0; i < ghost.length; i += 1) {
    const lm = ghost[i];
    if (!lm) continue;
    out[i] = copyLm(
      lm,
      u.ankle.x + (lm.x - g.ankle.x) * scale,
      u.ankle.y + (lm.y - g.ankle.y) * scale,
    );
  }

  const gSh = midPoint(
    ghost[LandmarkIndex.LeftShoulder],
    ghost[LandmarkIndex.RightShoulder],
  );
  const uSh = midPoint(
    user[LandmarkIndex.LeftShoulder],
    user[LandmarkIndex.RightShoulder],
  );
  if (gSh && uSh) {
    const gTorso = Math.hypot(g.hip.x - gSh.x, g.hip.y - gSh.y) * scale;
    const uTorso = Math.hypot(u.hip.x - uSh.x, u.hip.y - uSh.y);
    if (gTorso >= 0.06 && uTorso >= 0.06) {
      const torsoFix = Math.min(1.8, Math.max(0.55, uTorso / gTorso));
      if (Math.abs(torsoFix - 1) > 0.03) {
        for (const i of UPPER_BODY) {
          const lm = out[i];
          if (!lm) continue;
          out[i] = copyLm(
            lm,
            u.hip.x + (lm.x - u.hip.x) * torsoFix,
            u.hip.y + (lm.y - u.hip.y) * torsoFix,
          );
        }
      }
    }
  }

  // 侧面 plank：肩–踝更偏水平时，整体平移使肩中点贴用户肩（避免只钉踝导致肩线飘）
  const outSh = midPoint(
    out[LandmarkIndex.LeftShoulder],
    out[LandmarkIndex.RightShoulder],
  );
  if (outSh && uSh && gSh) {
    const spanX = Math.abs(u.ankle.x - uSh.x);
    const spanY = Math.abs(u.ankle.y - uSh.y);
    if (spanX > spanY * 1.25) {
      const ox = uSh.x - outSh.x;
      const oy = uSh.y - outSh.y;
      if (Math.hypot(ox, oy) > 0.01) {
        for (let i = 0; i < out.length; i += 1) {
          const lm = out[i];
          if (!lm) continue;
          out[i] = copyLm(lm, lm.x + ox, lm.y + oy);
        }
      }
    }
  }

  return out;
}
