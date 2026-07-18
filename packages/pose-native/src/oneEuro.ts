/**
 * @fitness-coach/pose-native — One Euro Filter（M2A-T2，VT-P2-003）
 *
 * 对 landmark 坐标做自适应低通滤波：慢速抑抖动，快速减滞后。
 * 参考：Casiez et al. CHI 2012 / gery.casiez.net/1euro/
 */

import type { Landmark, Pose } from "@fitness-coach/core";

export interface OneEuroParams {
  /** 估计采样频率 Hz（无时间戳时用）。 */
  freq: number;
  /** 最小截止频率 Hz；越小越稳、越滞后。 */
  minCutoff: number;
  /** 速度响应系数；越大高速滞后越小。 */
  beta: number;
  /** 导数滤波截止频率 Hz。 */
  dCutoff: number;
}

export const DEFAULT_ONE_EURO: OneEuroParams = {
  freq: 30,
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
};

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;
  private alpha: number;

  constructor(alpha: number) {
    this.alpha = alpha;
  }

  setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1) return;
    this.alpha = alpha;
  }

  filter(value: number, alpha?: number): number {
    if (alpha != null) this.setAlpha(alpha);
    let s: number;
    if (this.y == null || this.s == null) {
      s = value;
    } else {
      s = this.alpha * value + (1 - this.alpha) * this.s;
    }
    this.y = value;
    this.s = s;
    return s;
  }

  lastValue(): number | null {
    return this.y;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

function alpha(cutoff: number, freq: number): number {
  const te = 1 / freq;
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / te);
}

/** 单通道 One Euro Filter。 */
export class OneEuroFilter1D {
  private x: LowPassFilter;
  private dx: LowPassFilter;
  private lastTimeSec: number | null = null;
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(params: OneEuroParams = DEFAULT_ONE_EURO) {
    this.freq = params.freq;
    this.minCutoff = params.minCutoff;
    this.beta = params.beta;
    this.dCutoff = params.dCutoff;
    this.x = new LowPassFilter(alpha(this.minCutoff, this.freq));
    this.dx = new LowPassFilter(alpha(this.dCutoff, this.freq));
  }

  filter(value: number, timestampMs?: number): number {
    if (timestampMs != null && this.lastTimeSec != null) {
      const dt = timestampMs / 1000 - this.lastTimeSec;
      if (dt > 0) this.freq = 1 / dt;
    }
    if (timestampMs != null) this.lastTimeSec = timestampMs / 1000;

    const prev = this.x.lastValue();
    const dx = prev == null ? 0 : (value - prev) * this.freq;
    const edx = this.dx.filter(dx, alpha(this.dCutoff, this.freq));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alpha(cutoff, this.freq));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastTimeSec = null;
  }
}

/** 对整帧 Pose 的每个关键点 x/y(/z) 独立滤波。 */
export class PoseSmoother {
  private filters = new Map<string, OneEuroFilter1D>();
  private params: OneEuroParams;

  constructor(params: OneEuroParams = DEFAULT_ONE_EURO) {
    this.params = params;
  }

  private channel(key: string): OneEuroFilter1D {
    let f = this.filters.get(key);
    if (!f) {
      f = new OneEuroFilter1D(this.params);
      this.filters.set(key, f);
    }
    return f;
  }

  smooth(pose: Pose, timestampMs?: number): Pose {
    const out: Pose = [];
    for (let i = 0; i < pose.length; i += 1) {
      const lm = pose[i];
      if (!lm) {
        out[i] = undefined;
        continue;
      }
      const next: Landmark = {
        x: this.channel(`${i}:x`).filter(lm.x, timestampMs),
        y: this.channel(`${i}:y`).filter(lm.y, timestampMs),
        visibility: lm.visibility,
      };
      if (lm.z != null) {
        next.z = this.channel(`${i}:z`).filter(lm.z, timestampMs);
      }
      out[i] = next;
    }
    return out;
  }

  reset(): void {
    for (const f of this.filters.values()) f.reset();
    this.filters.clear();
  }
}

/** 方差（总体）。 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
}
