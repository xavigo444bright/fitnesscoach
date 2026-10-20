/**
 * 纠错按当前机位和关键点是否看得见开关。
 * 没写进规格的规则（含祖父 10 条）只看三点是否在画面里。
 * 日志 C06-02，见 docs/count-change-log.md。
 */

import type { CuePlane, CuePlaneRow } from "./cuePlanes.data.js";
import { landmarkReliable } from "./landmarks.js";
import type { JointTriplet, Pose } from "./types.js";

const CUE_VIS = 0.5;

export type ObservedCamera = "front" | "side" | 0;

export function ruleAllowedOnPlane(
  planes: readonly CuePlane[] | undefined,
  observed: ObservedCamera,
): boolean {
  if (!planes || planes.length === 0) return true;
  if (observed === "front") return planes.includes("front");
  if (observed === "side") return planes.includes("side");
  return (
    planes.includes("three_quarter") ||
    (planes.includes("front") && planes.includes("side"))
  );
}

function jointsVisible(pose: Pose, joints: JointTriplet): boolean {
  return (
    landmarkReliable(pose[joints.a], { minVis: CUE_VIS }) &&
    landmarkReliable(pose[joints.b], { minVis: CUE_VIS }) &&
    landmarkReliable(pose[joints.c], { minVis: CUE_VIS })
  );
}

/** 关掉当前机位看不清、或三点里有点出画的纠错。计次不走这里。 */
export function filterRulesForView<T extends { id: string; joints: JointTriplet }>(
  rules: readonly T[],
  pose: Pose,
  observed: ObservedCamera,
  cuePlanes: readonly CuePlaneRow[] | undefined,
): T[] {
  const byId = new Map<string, readonly CuePlane[]>();
  for (const row of cuePlanes ?? []) byId.set(row.ruleId, row.planes);
  return rules.filter(
    (rule) =>
      jointsVisible(pose, rule.joints) &&
      ruleAllowedOnPlane(byId.get(rule.id), observed),
  );
}
