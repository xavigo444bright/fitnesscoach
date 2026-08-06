/**
 * 测试用 mock 检测器：返回固定 Pose，验证契约可被实现。
 */

import type { Pose } from "@fitness-coach/core";
import type { PoseDetector, PoseFrame } from "./types.js";

export class MockPoseDetector implements PoseDetector {
  constructor(private readonly pose: Pose = []) {}

  detect(_frame: PoseFrame): Pose {
    return this.pose;
  }

  dispose(): void {
    // no-op
  }
}
