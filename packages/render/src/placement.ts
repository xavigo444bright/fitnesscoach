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
    exerciseId === "face-pull"
  ) {
    return UPPER_BODY_PLACEMENT_CONFIG;
  }
  return {};
}

/**
 * FR-022：能算出驱动角则允许计数。机位正面误判只出文案，不冻计数。
 */
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
  /** 规格只允许正面计次时，侧面提示面对镜头 */
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

function sidePresent(
  pose: Pose,
  hip: LandmarkIndex,
  ankle: LandmarkIndex,
  minVisibility: number,
): boolean {
  return (
    isPresent(pose, hip, minVisibility) &&
    isPresent(pose, ankle, minVisibility)
  );
}

function sideInPicture(
  pose: Pose,
  hip: LandmarkIndex,
  ankle: LandmarkIndex,
  epsilon: number,
): boolean {
  const h = pose[hip];
  const a = pose[ankle];
  if (!h || !a) return false;
  return inPicture(h.x, h.y, epsilon) && inPicture(a.x, a.y, epsilon);
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

  const leftP = sidePresent(
    pose,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftAnkle,
    vis,
  );
  const rightP = sidePresent(
    pose,
    LandmarkIndex.RightHip,
    LandmarkIndex.RightAnkle,
    vis,
  );
  const presentOk =
    merged.hipAnkleMode === "either_side" ? leftP || rightP : leftP && rightP;

  const ankleCount = [
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.RightAnkle,
  ].filter((i) => isPresent(pose, i, vis)).length;

  if (!presentOk) {
    if (ankleCount === 0 && shoulderVisible(pose, vis)) {
      return {
        visible: true,
        hint: "请把手机放远，让髋和脚踝入画，勿挡住镜头",
        reason: "too_close",
      };
    }
    return {
      visible: true,
      hint: "请让髋和脚踝入画，勿挡住镜头",
      reason: "missing_keypoints",
    };
  }

  const leftF =
    leftP &&
    sideInPicture(
      pose,
      LandmarkIndex.LeftHip,
      LandmarkIndex.LeftAnkle,
      eps,
    );
  const rightF =
    rightP &&
    sideInPicture(
      pose,
      LandmarkIndex.RightHip,
      LandmarkIndex.RightAnkle,
      eps,
    );
  const frameOk =
    merged.hipAnkleMode === "either_side" ? leftF || rightF : leftF && rightF;
  if (!frameOk) {
    return {
      visible: true,
      hint: "请把手机放远，让髋与脚踝入画",
      reason: "out_of_frame",
    };
  }

  const hipsY: number[] = [];
  const anklesY: number[] = [];
  if (leftF) {
    hipsY.push(pose[LandmarkIndex.LeftHip]!.y);
    anklesY.push(pose[LandmarkIndex.LeftAnkle]!.y);
  }
  if (rightF) {
    hipsY.push(pose[LandmarkIndex.RightHip]!.y);
    anklesY.push(pose[LandmarkIndex.RightAnkle]!.y);
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
 * 把站位原因 + 推荐机位合成一条提示（FR-022）。
 * 仅有侧片的动作正对镜头时，示范窗仍播侧面；文案改叫用户侧对手机。
 * 趴地动作用「把手机放远」，不用「后退」。
 */
export function composePlacementHint(
  result: PlacementGuideResult,
  ctx: PlacementHintContext,
): string | null {
  const needSide =
    ctx.recommendedCamera === "side" && ctx.observedCamera === "front";
  const needFront =
    Boolean(ctx.requireFrontPlane) && ctx.observedCamera === "side";
  const needBack =
    result.reason === "missing_keypoints" ||
    result.reason === "too_close" ||
    result.reason === "out_of_frame";

  if (!needSide && !needFront && !needBack) return result.hint;

  const move =
    ctx.floorHold || ctx.holdSecond ? "请把手机放远" : "请后退";
  const bits: string[] = [];
  if (needFront) bits.push("请面对镜头");
  if (needSide) bits.push("请把手机放到身体侧面");
  if (needBack) {
    bits.push(
      ctx.holdSecond
        ? `${move}，让${ctx.jointsCue}入画后再计秒`
        : `${move}，让${ctx.jointsCue}入画`,
    );
  }
  return bits.join("；");
}

/** 站位条展示文案：动作引导，禁止写成「示范窗」。 */
export function formatPlacementCoachHint(hint: string | null): string | null {
  if (hint == null || hint.trim().length === 0) return null;
  const body = hint.replace(/^示范窗\s*[·•]?\s*/, "").trim();
  if (body.startsWith("请调整姿势")) return body;
  return `请调整姿势 · ${body}`;
}
