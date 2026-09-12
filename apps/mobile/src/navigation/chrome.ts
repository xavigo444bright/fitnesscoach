import { layout } from '@fitness-coach/ui';

/** 药丸条本体高度（不含 inset / Home Indicator）。 */
export const FLOATING_TAB_BAR_HEIGHT = 56;

export function tabBarContentPadding(safeBottom: number): number {
  return layout.tabBarInset + FLOATING_TAB_BAR_HEIGHT + safeBottom;
}
