/**
 * @fitness-coach/pose-native — 自适应质量 / 分辨率降级（M2A-T5，VT-P2-006）
 *
 * 历史门禁：低端机可按 FPS 降档。2026-08-13 产品决定 App **固定 high**，
 * 训练页不再接线本控制器；保留单测与 API，以备日后低端机回退。
 */

export type QualityTier = "high" | "medium" | "low";

export interface QualityProfile {
  tier: QualityTier;
  /** 传给 RNMediapipe frameLimit（iOS 初始化生效）。 */
  frameLimit: number;
  /** 全管线（smooth+validate）每隔 N 个 detect 回调跑一次。 */
  processEveryN: number;
  /** 未来帧输入缩放（1=全分辨率）；供 PoseDetector 实现使用。 */
  inputScale: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  high: { tier: "high", frameLimit: 30, processEveryN: 1, inputScale: 1 },
  medium: { tier: "medium", frameLimit: 20, processEveryN: 1, inputScale: 0.75 },
  low: { tier: "low", frameLimit: 15, processEveryN: 2, inputScale: 0.5 },
};

const TIER_ORDER: QualityTier[] = ["high", "medium", "low"];

export interface AdaptiveQualityOptions {
  /** KPI 目标 FPS（NFR-001 App ≥15）。 */
  targetFps: number;
  /** 低于此值触发降档。 */
  dropBelowFps: number;
  /** 高于此值可升档。 */
  raiseAboveFps: number;
  /** 档位切换冷却（ms），防抖。 */
  cooldownMs: number;
}

export const DEFAULT_ADAPTIVE_OPTIONS: AdaptiveQualityOptions = {
  targetFps: 15,
  dropBelowFps: 12,
  raiseAboveFps: 22,
  cooldownMs: 3000,
};

export class AdaptiveQualityController {
  private tier: QualityTier = "high";
  private manual = false;
  private lastChangeMs = Number.NEGATIVE_INFINITY;
  private detectCount = 0;
  private readonly opts: AdaptiveQualityOptions;

  constructor(opts: Partial<AdaptiveQualityOptions> = {}) {
    this.opts = { ...DEFAULT_ADAPTIVE_OPTIONS, ...opts };
  }

  profile(): QualityProfile {
    return QUALITY_PROFILES[this.tier];
  }

  isManual(): boolean {
    return this.manual;
  }

  setManualTier(tier: QualityTier, nowMs: number = Date.now()): QualityProfile {
    this.manual = true;
    this.tier = tier;
    this.lastChangeMs = nowMs;
    return this.profile();
  }

  /** 退出手动，恢复自动。 */
  clearManual(nowMs: number = Date.now()): QualityProfile {
    this.manual = false;
    this.lastChangeMs = nowMs;
    return this.profile();
  }

  /** 手动循环 high → medium → low → high。 */
  cycleManual(nowMs: number = Date.now()): QualityProfile {
    const idx = TIER_ORDER.indexOf(this.tier);
    const next = TIER_ORDER[(idx + 1) % TIER_ORDER.length]!;
    return this.setManualTier(next, nowMs);
  }

  /**
   * 根据滚动 FPS 建议档位；手动模式下不改档。
   * 返回当前 profile（可能已变更）。
   */
  observeFps(fps: number, nowMs: number = Date.now()): QualityProfile {
    if (this.manual) return this.profile();
    if (nowMs - this.lastChangeMs < this.opts.cooldownMs) return this.profile();

    const idx = TIER_ORDER.indexOf(this.tier);
    if (fps < this.opts.dropBelowFps && idx < TIER_ORDER.length - 1) {
      this.tier = TIER_ORDER[idx + 1]!;
      this.lastChangeMs = nowMs;
    } else if (fps > this.opts.raiseAboveFps && idx > 0) {
      this.tier = TIER_ORDER[idx - 1]!;
      this.lastChangeMs = nowMs;
    }
    return this.profile();
  }

  /**
   * 每个 detect 回调调用一次；true 表示本帧应跑 filter/smooth/validate。
   */
  shouldProcessFrame(): boolean {
    this.detectCount += 1;
    const n = this.profile().processEveryN;
    return this.detectCount % n === 0;
  }

  reset(): void {
    this.tier = "high";
    this.manual = false;
    this.lastChangeMs = Number.NEGATIVE_INFINITY;
    this.detectCount = 0;
  }
}
