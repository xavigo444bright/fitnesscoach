/**
 * @fitness-coach/ui — 设计令牌（MU-T2/T3）
 * 真源：docs/design-tokens.md v0.2.0
 */

export const colors = {
  correct: "#22C55E",
  warning: "#EAB308",
  error: "#EF4444",
  ghost: "rgba(255, 255, 255, 0.4)",
  bg: "#0F172A",
  surface: "#1E293B",
  overlayScrim: "rgba(0, 0, 0, 0.55)",
  overlayText: "#FFFFFF",
  primary: "#3B82F6",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
} as const;

export const fontSize = {
  title: 20,
  feedback: 18,
  body: 16,
  caption: 14,
  rep: 28,
} as const;

export const fontWeight = {
  regular: "400",
  semibold: "600",
  bold: "700",
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
} as const;

export const layout = {
  feedbackBarMinHeight: 56,
  feedbackBarMaxLines: 2,
  bottomBarHeight: 64,
  /** 站位参考区偏竖向全身；实际框用百分比贴底，此值供文档对齐。 */
  placementGuideAspect: 0.48,
  ghostOpacity: 0.4,
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
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  motion: typeof motion;
};

export const theme: Theme = {
  colors,
  fontSize,
  fontWeight,
  space,
  radius,
  layout,
  motion,
};

/** 无 React 依赖的 theme 访问（平台 adapter 可包一层 hook）。 */
export function getTheme(): Theme {
  return theme;
}
