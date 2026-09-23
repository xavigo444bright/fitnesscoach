/**
 * @fitness-coach/ui — 设计令牌（MU-T2/T3 + T10-1）
 * 真源：docs/design-tokens.md v0.3.0
 */

export const colors = {
  correct: "#22C55E",
  warning: "#EAB308",
  error: "#EF4444",
  ghost: "rgba(255, 255, 255, 0.4)",
  ref3d: "#38BDF8",
  /** OLED 壳层底，非 slate */
  bg: "#000000",
  surface: "#121212",
  surfaceRaised: "#1A1A1A",
  overlayScrim: "rgba(0, 0, 0, 0.55)",
  overlayText: "#FFFFFF",
  /** 历史训练页按钮蓝；壳层与训练铬主 CTA 用 cta / onCta */
  primary: "#3B82F6",
  cta: "#FFFFFF",
  onCta: "#000000",
  border: "#2A2A2A",
  tabBar: "rgba(10, 10, 10, 0.92)",
  tabActive: "#FFFFFF",
  tabInactive: "#737373",
  textPrimary: "#FFFFFF",
  textSecondary: "#A3A3A3",
  /** 示范窗骨骼模式：非主动肌（FR-085） */
  muscleRest: "rgba(148, 163, 184, 0.34)",
  muscleChest: "rgba(244, 114, 182, 0.36)",
  muscleChestActive: "rgba(244, 114, 182, 0.62)",
  musclePelvis: "rgba(251, 146, 60, 0.36)",
  musclePelvisActive: "rgba(251, 146, 60, 0.62)",
  muscleThigh: "rgba(45, 212, 191, 0.32)",
  muscleThighActive: "rgba(45, 212, 191, 0.58)",
  muscleArm: "rgba(129, 140, 248, 0.30)",
  muscleArmActive: "rgba(129, 140, 248, 0.56)",
} as const;

export const fontSize = {
  title: 20,
  display: 28,
  feedback: 18,
  body: 16,
  caption: 14,
  meta: 12,
  rep: 28,
  hugeStat: 40,
} as const;

export const fontWeight = {
  regular: "400",
  semibold: "600",
  bold: "700",
} as const;

/** 逻辑名；App 未装字体前用 System。禁止在本包 require 字体文件。 */
export const fontFamily = {
  display: "BarlowCondensed-SemiBold",
  body: "Barlow-Regular",
  bodyMedium: "Barlow-Medium",
  fallback: "System",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  pill: 999,
  tabBar: 28,
} as const;

export const layout = {
  feedbackBarMinHeight: 56,
  feedbackBarMaxLines: 2,
  bottomBarHeight: 64,
  /** 历史值；站位框已铺满预览（FR-022），不再按此宽高比裁安全区。 */
  placementGuideAspect: 0.48,
  ghostOpacity: 0.4,
  ref3dOpacity: 0.82,
  /** PG-004 示范窗（逻辑点）。相对 v0.2.4 的 132×220 约 +35% 高度，宽同比放大以便参考人变大。 */
  refPersonPipWidth: 178,
  refPersonPipHeight: 297,
  /** 收起后留在屏内的拉开手柄（FR-084）。 */
  refPersonPipTabWidth: 44,
  refPersonPipTabHeight: 56,
  /** 浮动底栏距 Home Indicator（app-ia §4） */
  tabBarInset: 12,
  /** 页内分段下划线到内容（MASTER 8pt × 3，避免贴死） */
  pageSectionGap: 24,
  touchMin: 44,
} as const;

/** 动效时长（ms），对齐 UI.md UX-* */
export const motion = {
  feedbackEnterMs: 200,
  jointColorMs: 150,
  repBumpMs: 300,
  /** UX-007：有效 rep 绿色打勾 */
  correctCheckMs: 700,
  feedbackRecoveredMs: 1800,
} as const;

export type Theme = {
  colors: typeof colors;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  fontFamily: typeof fontFamily;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  motion: typeof motion;
};

export const theme: Theme = {
  colors,
  fontSize,
  fontWeight,
  fontFamily,
  space,
  radius,
  layout,
  motion,
};

/** 无 React 依赖的 theme 访问（平台 adapter 可包一层 hook）。 */
export function getTheme(): Theme {
  return theme;
}
