/**
 * @fitness-coach/pose-native — 姿态检测接口契约（M2A-T1，VT-P2-001）
 *
 * 输出 Landmark 复用 @fitness-coach/core，保证与 validate/phase 输入对齐。
 * 本文件只定义契约；具体 MediaPipe 实现在后续 Task。
 */

import type { Landmark, Pose } from "@fitness-coach/core";

export type { Landmark, Pose };

/**
 * 输入帧（平台无关抽象）。
 * App 侧由 camera 适配层把原生帧转成此结构再喂 detect。
 */
export interface PoseFrame {
  /** 像素宽。 */
  width: number;
  /** 像素高。 */
  height: number;
  /** 时间戳（ms），用于滤波时间常数。 */
  timestampMs: number;
  /**
   * 可选像素缓冲（RGBA 等）；具体布局由实现约定。
   * Spike/单测可不填，仅用 mock landmarks。
   */
  data?: ArrayBuffer | Uint8Array;
}

/**
 * 姿态检测器契约：帧 → 关键点数组。
 *
 * - 返回值按 MediaPipe 33 点索引排列（与 core LandmarkIndex 对齐）
 * - 缺失/低置信度点可为 undefined，或由实现填 visibility
 * - 平滑（PoseSmoother）与 visibility 过滤（filterByVisibility）叠在此接口之上
 */
export interface PoseDetector {
  detect(frame: PoseFrame): Pose | Promise<Pose>;
  /** 释放原生资源（可选）。 */
  dispose?(): void | Promise<void>;
}

/** detect 函数签名（函数式等价物，便于测试与 mock）。 */
export type DetectFn = (frame: PoseFrame) => Pose | Promise<Pose>;
