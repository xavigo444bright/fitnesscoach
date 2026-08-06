/**
 * @fitness-coach/pose-mp — 姿态检测接口契约（与 M2A pose-native 对齐）
 *
 * 输出 Landmark 复用 @fitness-coach/core，保证与 validate/phase 输入对齐。
 * MoveNet 实现见 M2B-T2。
 */

import type { Landmark, Pose } from "@fitness-coach/core";

export type { Landmark, Pose };

/** 输入帧（平台无关抽象）；小程序侧由 camera 帧转成此结构再喂 detect。 */
export interface PoseFrame {
  width: number;
  height: number;
  timestampMs: number;
  data?: ArrayBuffer | Uint8Array;
}

/**
 * 姿态检测器契约：帧 → 关键点数组。
 *
 * - 返回值按 MediaPipe 33 点索引排列（与 core LandmarkIndex 对齐）
 * - MoveNet 17 点需映射到该索引后再交给 core
 */
export interface PoseDetector {
  detect(frame: PoseFrame): Pose | Promise<Pose>;
  dispose?(): void | Promise<void>;
}

export type DetectFn = (frame: PoseFrame) => Pose | Promise<Pose>;
