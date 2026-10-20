/**
 * 站位引导逻辑（M3-T5 / VT-P3A-006 / FR-022）
 *
 * 产品共识：预览整幅画面都可用。虚线框铺满预览；判定与 [0,1] 画面一致。
 * 禁止用内缩安全区冻计次/计秒。髋踝缺失才引导放远。
 * 侧摄（平板）远侧踝常被挡：允许同一侧髋+踝。贴镜头 → too_close。
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";

export type PlacementReason =
  | "ok"
  | "missing_keypoints"
  | "out_of_frame"
  | "too_close";

export interface PlacementGuideResult {
  /** 是否显示站位框/文案。 */
  visible: boolean;
  hint: string | null;
  reason: PlacementReason;
}

export type HipAnkleMode = "both" | "either_side" | "hips_only";

export interface PlacementConfig {
  /**
   * 历史字段：曾表示身体安全区内缩。FR-022 共识后忽略，全画面判定。
   */
  margin?: number;
  /** visibility 低于此视为缺失。默认对齐绘制阈值（看见即入画）。 */
  minVisibility: number;
  /**
   * 髋-踝竖直跨度超过此值视为过近。
   * 全身铺满画幅约 0.7–0.9；过大说明裁切过紧。
   */
  maxBodySpanY: number;
/**
   * both：左右髋踝四点都要（深蹲默认）。
   * either_side：同一侧髋+踝即可（侧摄平板，远侧常遮挡）。
   * hips_only：有髋即可，不要求踝（划船/推举/卧推近景腿常出画）。
   */
  hipAnkleMode: HipAnkleMode;
  /**
   * 模型贴边时坐标可略越出 [0,1]，仍算入画（不是内缩安全区）。
   */
  edgeEpsilon: number;
}

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  minVisibility: 0.2,
  maxBodySpanY: 0.98,
  hipAnkleMode: "both",
  edgeEpsilon: 0.08,
};

/** 平板：侧摄远侧遮挡，同一侧髋踝即可。全画面判定走默认。 */
export const PLANK_PLACEMENT_CONFIG: Partial<PlacementConfig> = {
  hipAnkleMode: "either_side",
};

/** 划船/推举/卧推：近景常见脚出画，不拿踝点冻计数。 */
export const UPPER_BODY_PLACEMENT_CONFIG: Partial<PlacementConfig> = {
  hipAnkleMode: "hips_only",
};

export function placementConfigFor(exerciseId: string): Partial<PlacementConfig> {
  if (exerciseId === "plank") return PLANK_PLACEMENT_CONFIG;
  if (
    exerciseId === "db-row" ||
    exerciseId === "ohp" ||
    exerciseId === "bench-press" ||
    exerciseId === "pullup" ||
    exerciseId === "db-fly" ||
    exerciseId === "dip" ||
    exerciseId === "chest-press-machine" ||
    exerciseId === "lateral-raise" ||
    exerciseId === "front-raise" ||
    exerciseId === "rear-delt-fly" ||
    exerciseId === "face-pull" ||
    exerciseId === "lat-pulldown" ||
    exerciseId === "seated-row" ||
    exerciseId === "band-row"
  ) {
    return UPPER_BODY_PLACEMENT_CONFIG;
  }
  return {};
}

/**
 * FR-022：能算出驱动角则允许计数。机位正面误判只出文案，不冻计数。
 */
/** 日志 C06-02。尝试动作的站位提示另见 C07-08。 */
export function allowSessionCount(
  placement: PlacementGuideResult,
  driveLive: number | null,
): boolean {
  return placement.reason === "ok" || driveLive != null;
}

export interface PlacementHintContext {
  recommendedCamera: "side" | "front";
  observedCamera?: "side" | "front" | 0;
  /** 如「肩、髋、踝」 */
  jointsCue: string;
  /** 静力计时（平板） */
  holdSecond?: boolean;
  /** 趴地动作不能「后退」，改口「把手机放远」 */
  floorHold?: boolean;
  /**
   * 保留给调用方。机位不对不再写成提示；纠错是否开启见 cueView。
   */
  requireFrontPlane?: boolean;
}

function isPresent(
  pose: Pose,
  index: number,
  minVisibility: number,
): boolean {
  const lm = pose[index];
  if (!lm) return false;
  if (lm.visibility != null && lm.visibility < minVisibility) return false;
  return true;
}

/** 全画面 [0,1]；仅容忍模型贴边越界。 */
function inPicture(x: number, y: number, epsilon: number): boolean {
  return (
    x >= -epsilon &&
    x <= 1 + epsilon &&
    y >= -epsilon &&
    y <= 1 + epsilon
  );
}

function shoulderVisible(pose: Pose, minVisibility: number): boolean {
  return (
    isPresent(pose, LandmarkIndex.LeftShoulder, minVisibility) ||
    isPresent(pose, LandmarkIndex.RightShoulder, minVisibility)
  );
}

function jointInPicture(
  pose: Pose,
  index: LandmarkIndex,
  minVisibility: number,
  epsilon: number,
): boolean {
  if (!isPresent(pose, index, minVisibility)) return false;
  const lm = pose[index];
  if (!lm) return false;
  return inPicture(lm.x, lm.y, epsilon);
}

/**
 * 踝缺失，或只从画面下沿出去。左右出画不算，那种要提示。
 */
function ankleBottomCropped(
  pose: Pose,
  ankle: LandmarkIndex,
  minVisibility: number,
  epsilon: number,
): boolean {
  const a = pose[ankle];
  if (!a) return true;
  if (a.visibility != null && a.visibility < minVisibility) return true;
  return a.y > 1 + epsilon && a.x >= -epsilon && a.x <= 1 + epsilon;
}

function missingLegLabel(
  pose: Pose,
  vis: number,
  eps: number,
  eitherSide: boolean,
): string {
  const sides = [
    {
      label: "左",
      hip: LandmarkIndex.LeftHip,
      knee: LandmarkIndex.LeftKnee,
      ankle: LandmarkIndex.LeftAnkle,
    },
    {
      label: "右",
      hip: LandmarkIndex.RightHip,
      knee: LandmarkIndex.RightKnee,
      ankle: LandmarkIndex.RightAnkle,
    },
  ] as const;
  const bits: string[] = [];
  for (const side of sides) {
    if (sideReady(pose, side.hip, side.knee, side.ankle, vis, eps)) continue;
    if (!jointInPicture(pose, side.hip, vis, eps)) bits.push(`${side.label}髋`);
    else if (!jointInPicture(pose, side.knee, vis, eps)) {
      bits.push(`${side.label}膝`);
    } else bits.push(`${side.label}踝`);
  }
  if (bits.length === 0) return eitherSide ? "一侧髋、膝" : "髋、膝";
  return bits.join("、");
}

/**
 * 髋在画面里，并且踝也在；或者踝贴在下沿之外、但膝还在。
 * 深蹲脚靠近底边时继续计次。
 */
function sideReady(
  pose: Pose,
  hip: LandmarkIndex,
  knee: LandmarkIndex,
  ankle: LandmarkIndex,
  minVisibility: number,
  epsilon: number,
): boolean {
  if (!jointInPicture(pose, hip, minVisibility, epsilon)) return false;
  if (jointInPicture(pose, ankle, minVisibility, epsilon)) return true;
  return (
    jointInPicture(pose, knee, minVisibility, epsilon) &&
    ankleBottomCropped(pose, ankle, minVisibility, epsilon)
  );
}

/**
 * 评估站位。坐标假定为归一化 0–1（MediaPipe）。
 * `cfg.margin` 忽略：不以内部矩形为安全区。
 */
export function evaluatePlacement(
  pose: Pose,
  cfg: Partial<PlacementConfig> = {},
): PlacementGuideResult {
  const merged: PlacementConfig = { ...DEFAULT_PLACEMENT_CONFIG, ...cfg };
  const vis = merged.minVisibility;
  const eps = merged.edgeEpsilon;

  if (merged.hipAnkleMode === "hips_only") {
    const leftHip = isPresent(pose, LandmarkIndex.LeftHip, vis);
    const rightHip = isPresent(pose, LandmarkIndex.RightHip, vis);
    if (!leftHip && !rightHip) {
      if (shoulderVisible(pose, vis)) {
        return {
          visible: true,
          hint: "请后退，让肩、肘、髋入画",
          reason: "too_close",
        };
      }
      return {
        visible: true,
        hint: "请让肩、肘、髋入画",
        reason: "missing_keypoints",
      };
    }
    const leftIn =
      leftHip &&
      pose[LandmarkIndex.LeftHip] != null &&
      inPicture(
        pose[LandmarkIndex.LeftHip]!.x,
        pose[LandmarkIndex.LeftHip]!.y,
        eps,
      );
    const rightIn =
      rightHip &&
      pose[LandmarkIndex.RightHip] != null &&
      inPicture(
        pose[LandmarkIndex.RightHip]!.x,
        pose[LandmarkIndex.RightHip]!.y,
        eps,
      );
    if (!leftIn && !rightIn) {
      return {
        visible: true,
        hint: "请后退，让肩、肘、髋入画",
        reason: "out_of_frame",
      };
    }
    return { visible: false, hint: null, reason: "ok" };
  }

  const leftReady = sideReady(
    pose,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.LeftAnkle,
    vis,
    eps,
  );
  const rightReady = sideReady(
    pose,
    LandmarkIndex.RightHip,
    LandmarkIndex.RightKnee,
    LandmarkIndex.RightAnkle,
    vis,
    eps,
  );
  const frameOk =
    merged.hipAnkleMode === "either_side"
      ? leftReady || rightReady
      : leftReady && rightReady;

  const kneeIn =
    jointInPicture(pose, LandmarkIndex.LeftKnee, vis, eps) ||
    jointInPicture(pose, LandmarkIndex.RightKnee, vis, eps);
  const ankleIn =
    jointInPicture(pose, LandmarkIndex.LeftAnkle, vis, eps) ||
    jointInPicture(pose, LandmarkIndex.RightAnkle, vis, eps);

  if (!frameOk) {
    if (!kneeIn && !ankleIn && shoulderVisible(pose, vis)) {
      return {
        visible: true,
        hint: "请把手机放远，让髋和脚踝入画，勿挡住镜头",
        reason: "too_close",
      };
    }
    const named = missingLegLabel(
      pose,
      vis,
      eps,
      merged.hipAnkleMode === "either_side",
    );
    return {
      visible: true,
      hint: `请让${named}入画`,
      reason: "missing_keypoints",
    };
  }

  const hipsY: number[] = [];
  const anklesY: number[] = [];
  const pushSpan = (ready: boolean, hip: LandmarkIndex, knee: LandmarkIndex, ankle: LandmarkIndex) => {
    if (!ready) return;
    const hipLm = pose[hip];
    if (!hipLm) return;
    hipsY.push(hipLm.y);
    const ankleLm = pose[ankle];
    const kneeLm = pose[knee];
    if (ankleLm && inPicture(ankleLm.x, ankleLm.y, eps)) {
      anklesY.push(ankleLm.y);
    } else if (kneeLm && inPicture(kneeLm.x, kneeLm.y, eps)) {
      anklesY.push(kneeLm.y);
    }
  };
  pushSpan(
    leftReady,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.LeftAnkle,
  );
  pushSpan(
    rightReady,
    LandmarkIndex.RightHip,
    LandmarkIndex.RightKnee,
    LandmarkIndex.RightAnkle,
  );
  if (hipsY.length === 0 || anklesY.length === 0) {
    return { visible: false, hint: null, reason: "ok" };
  }
  const span = Math.max(...anklesY) - Math.min(...hipsY);
  if (span > merged.maxBodySpanY) {
    return {
      visible: true,
      hint: "请把手机放远，让髋膝踝入画，勿挡住镜头",
      reason: "too_close",
    };
  }

  return { visible: false, hint: null, reason: "ok" };
}

/**
 * 站位提示只在关键点出画时出现，并点明是哪一处（FR-022）。
 * 机位不理想不再要求换到侧面或正面；计次照常，纠错按看得到的关节关掉。
 * 趴地动作用「把手机放远」，不用「后退」。
 */
export function composePlacementHint(
  result: PlacementGuideResult,
  ctx: PlacementHintContext,
): string | null {
  const needJoints =
    result.reason === "missing_keypoints" ||
    result.reason === "too_close" ||
    result.reason === "out_of_frame";

  if (!needJoints) return result.hint;
  if (result.hint) {
    if (ctx.holdSecond && !result.hint.includes("计秒")) {
      return `${result.hint}后再计秒`;
    }
    return result.hint;
  }

  const move =
    ctx.floorHold || ctx.holdSecond ? "请把手机放远" : "请后退";
  return ctx.holdSecond
    ? `${move}，让${ctx.jointsCue}入画后再计秒`
    : `${move}，让${ctx.jointsCue}入画`;
}

/** 站位条展示文案：动作引导，禁止写成「示范窗」。 */
export function formatPlacementCoachHint(hint: string | null): string | null {
  if (hint == null || hint.trim().length === 0) return null;
  const body = hint.replace(/^示范窗\s*[·•]?\s*/, "").trim();
  if (body.startsWith("请调整姿势")) return body;
  return `请调整姿势 · ${body}`;
}
