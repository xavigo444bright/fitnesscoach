/**
 * 画内部位是否可信。出画/贴边的远端点（尤其膝踝）常是模型瞎猜，
 * 不参与重合度、机位、驱动角。
 */

import type { Landmark } from "./types.js";

/** 贴边视为出画：近景腕顶到左右边、脚贴底边。 */
export const LANDMARK_FRAME_INSET = 0.04;
/** 低于此可见度不当作可靠点（visibility 缺省则放行）。 */
export const LANDMARK_MIN_VIS = 0.25;

export function landmarkInFrame(
  lm: Landmark | undefined,
  inset = LANDMARK_FRAME_INSET,
): boolean {
  if (!lm) return false;
  return (
    lm.x >= inset &&
    lm.x <= 1 - inset &&
    lm.y >= inset &&
    lm.y <= 1 - inset
  );
}

/** 顶到或超出左右画幅边（侧平举近景哑铃出画）。 */
export function landmarkHorizontallyOut(
  lm: Landmark | undefined,
  inset = LANDMARK_FRAME_INSET,
): boolean {
  if (!lm) return false;
  return lm.x < inset || lm.x > 1 - inset;
}

export function landmarkReliable(
  lm: Landmark | undefined,
  opts?: { minVis?: number; inset?: number },
): lm is Landmark {
  if (!lm) return false;
  const minVis = opts?.minVis ?? LANDMARK_MIN_VIS;
  if (lm.visibility != null && lm.visibility < minVis) return false;
  return landmarkInFrame(lm, opts?.inset);
}
