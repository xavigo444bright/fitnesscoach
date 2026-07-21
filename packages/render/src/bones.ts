/**
 * MediaPipe Pose 33 点常用连线（躯干+四肢）。
 * 索引与 @fitness-coach/core LandmarkIndex 一致。
 */

export type BonePair = readonly [number, number];

/** 绘制用连接表（无面部细节，保证深蹲机位清晰）。 */
export const POSE_BONES: readonly BonePair[] = [
  // 肩带 / 躯干
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // 左臂
  [11, 13],
  [13, 15],
  // 右臂
  [12, 14],
  [14, 16],
  // 左腿
  [23, 25],
  [25, 27],
  // 右腿
  [24, 26],
  [26, 28],
] as const;
