---
document: design-tokens
product: fitness-coach
version: 0.3.0
status: confirmed
confirmed_at: 2026-07-18
confirmed_by: product (MU-T2)
note: M3/M4/M5 必须引用本文件 / packages/ui theme，禁止硬编码语义色
depends_on:
  - docs/UI.md
  - docs/PRD.md
---

# Design Tokens

> MU-T2 定稿（UI-001 / UI-012）。语义色与 FR-061、`docs/UI.md` §2 对齐。  
> 代码同步目标：`packages/ui`（MU-T3）。

## 1. Colors

### 1.1 语义色（校验 / 反馈，FR-061）

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-correct` | `#22C55E` | 关节正确；FeedbackBar `recovered` |
| `--color-warning` | `#EAB308` | 注意 |
| `--color-error` | `#EF4444` | 错误；FeedbackBar `correcting` |
| `--color-ghost` | `rgba(255, 255, 255, 0.4)` | 历史 Ghost token；训练页 2D 骨骼用 `--color-correct` |
| `--color-ref-3d` | `#38BDF8` | 历史 3D 参考色；训练页身上不再用青色胶囊 |

### 1.2 壳层 OLED（T10-1 / MASTER）

训练叠加层仍用 1.1 绿黄红。壳层底与 CTA 走本组。`--color-primary` 仅为历史训练钮蓝，**新壳 CTA 用 `--color-cta`**。

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-bg` | `#000000` | OLED 真黑页底 |
| `--color-surface` | `#121212` | 卡片、sheet |
| `--color-surface-raised` | `#1A1A1A` | 嵌套行 |
| `--color-overlay-scrim` | `rgba(0, 0, 0, 0.55)` | 反馈条底衬 |
| `--color-overlay-text` | `#FFFFFF` | 叠加层主文案 |
| `--color-cta` | `#FFFFFF` | 白胶囊主按钮底 |
| `--color-on-cta` | `#000000` | 白胶囊上的字 |
| `--color-primary` | `#3B82F6` | 历史训练钮；T16 再迁 |
| `--color-border` | `#2A2A2A` | 发丝边 |
| `--color-tab-bar` | `rgba(10, 10, 10, 0.92)` | 浮动底栏 |
| `--color-tab-active` | `#FFFFFF` | 选中 Tab |
| `--color-tab-inactive` | `#737373` | 未选中 Tab |
| `--color-text-primary` | `#FFFFFF` | 壳层正文 |
| `--color-text-secondary` | `#A3A3A3` | 辅助 / 表头 |

### 1.3 示范窗肌群色（FR-085 / T9-3）

仅用于示范窗「骨骼」模式人体底，**不是**校验绿/黄/红，也**不叠到摄像头身上**。胸/骨盆/大腿用不同色相；主动肌提高不透明度。

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-muscle-rest` | `rgba(148, 163, 184, 0.34)` | 头/腰/手足等非强调体积 |
| `--color-muscle-chest` / `-active` | 粉 `rgba(244, 114, 182, …)` | 胸；俯卧撑主动 |
| `--color-muscle-pelvis` / `-active` | 橙 `rgba(251, 146, 60, …)` | 骨盆/臀；深蹲主动 |
| `--color-muscle-thigh` / `-active` | 青绿 `rgba(45, 212, 191, …)` | 大腿；深蹲主动 |
| `--color-muscle-arm` / `-active` | 靛 `rgba(129, 140, 248, …)` | 上臂；俯卧撑轻强调 |

```css
:root {
  --color-correct: #22C55E;
  --color-warning: #EAB308;
  --color-error: #EF4444;
  --color-ghost: rgba(255, 255, 255, 0.4);
  --color-ref-3d: #38BDF8;
  --color-bg: #000000;
  --color-surface: #121212;
  --color-surface-raised: #1A1A1A;
  --color-overlay-scrim: rgba(0, 0, 0, 0.55);
  --color-overlay-text: #FFFFFF;
  --color-cta: #FFFFFF;
  --color-on-cta: #000000;
  --color-primary: #3B82F6;
  --color-border: #2A2A2A;
  --color-tab-bar: rgba(10, 10, 10, 0.92);
  --color-tab-active: #FFFFFF;
  --color-tab-inactive: #737373;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A3A3A3;
  --color-muscle-rest: rgba(148, 163, 184, 0.34);
  --color-muscle-chest: rgba(244, 114, 182, 0.36);
  --color-muscle-chest-active: rgba(244, 114, 182, 0.62);
  --color-muscle-pelvis: rgba(251, 146, 60, 0.36);
  --color-muscle-pelvis-active: rgba(251, 146, 60, 0.62);
  --color-muscle-thigh: rgba(45, 212, 191, 0.32);
  --color-muscle-thigh-active: rgba(45, 212, 191, 0.58);
  --color-muscle-arm: rgba(129, 140, 248, 0.30);
  --color-muscle-arm-active: rgba(129, 140, 248, 0.56);
}
```

## 2. Typography

单位：App 用 sp/dp 等价数字。壳层字族 **Barlow Condensed / Barlow**（逻辑名）；未装字体前 RN 用 System。

| Token | App | 用途 |
|-------|-----|------|
| `--font-family-display` | BarlowCondensed-SemiBold | 壳层标题 |
| `--font-family-body` | Barlow-Regular | 正文 / 数字 |
| `--font-family-fallback` | System | 字体未进包前 |
| `--font-title` | 20 bold | 页面标题（训练铬仍用） |
| `--font-display` | 28 | 壳层屏标题 |
| `--font-feedback` | 18 semibold | FeedbackBar |
| `--font-body` | 16 regular | 正文 |
| `--font-caption` | 14 regular | 辅助 / Rep 旁注 |
| `--font-rep` | 28 bold | Rep 大数字 |

```css
:root {
  --font-family-display: BarlowCondensed-SemiBold;
  --font-family-body: Barlow-Regular;
  --font-family-fallback: System;
  --font-title-size: 20;
  --font-display-size: 28;
  --font-feedback-size: 18;
  --font-body-size: 16;
  --font-caption-size: 14;
  --font-rep-size: 28;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

## 3. Spacing & Radius

```css
:root {
  --space-xs: 4;
  --space-sm: 8;
  --space-md: 16;
  --space-lg: 24;
  --space-xl: 32;
  --radius-sm: 8;
  --radius-md: 16;
  --radius-pill: 999;
  --radius-tab-bar: 28;
  --tab-bar-inset: 12;
  --touch-min: 44; /* pt/dp，主按钮触控下限 */
}
```

## 4. Layout（PG-004 训练页）

```css
:root {
  --feedback-bar-min-height: 56;
  --feedback-bar-max-lines: 2;
  --bottom-bar-height: 64;
  --placement-guide-aspect: 0.48; /* 历史值；框已铺满预览，不再按此裁安全区 */
  --ghost-opacity: 0.4;
  --ref-3d-opacity: 0.82;
  --ref-person-pip-width: 178;
  --ref-person-pip-height: 297;
  --ref-person-pip-tab-width: 44;
  --ref-person-pip-tab-height: 56;
  --joint-color-ms: 150;         /* UX-002 */
  --rep-bump-ms: 300;            /* UX-003 */
  --correct-check-ms: 700;       /* UX-007 */
  --feedback-recovered-ms: 1800; /* UX-005 */
  --feedback-enter-ms: 200;      /* UX-001 */
}
```

## 5. Motion（MVP）

| Token / ID | 时长 | 说明 |
|------------|------|------|
| UX-001 | 200ms | 反馈条 slide-in |
| UX-002 | 150ms | 关节色过渡 |
| UX-003 | 300ms | Rep +1 scale |
| UX-005 | 1800ms | `recovered` 正反馈后清空 |
| UX-007 | 700ms | 有效 rep 绿色打勾弹出/淡出 |

## 6. 引用约定

1. **禁止**在 M3/M4/M5 写死 `#22C55E` 等语义色；从 `packages/ui` 的 theme 导出读取。  
2. 校验状态映射：`correct` → `--color-correct`；`warning` → `--color-warning`；`error` → `--color-error`。  
3. FeedbackBar：`correcting` 用 error/warning；`recovered` 用 correct；文案色一律 `--color-overlay-text`。  
4. 改 token 须升本文件版本，并同步 `packages/ui`。

## 7. 变更

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-07-07 | 初稿占位 |
| 0.2.0 | 2026-07-18 | MU-T2 定稿：去占位、UI-012 深色训练主题、FeedbackBar recovered 时长、确认日期 |
| 0.2.1 | 2026-07-20 | 站位框 aspect 调整；允许更近机位可读反馈 |
| 0.2.2 | 2026-07-20 | 站位框改为大框贴底（勿小框居中逼用户后退） |
| 0.2.3 | 2026-07-22 | UX-007 有效 rep 绿色打勾时长 |
| 0.2.4 | 2026-08-16 | 固定位参考人小窗宽高（PG-004 B2） |
| 0.2.5 | 2026-08-18 | 示范窗 178×297（约 +35% 高）；可拖动 |
| 0.2.6 | 2026-08-18 | 示范窗收起手柄 44×56 |
| 0.2.8 | 2026-08-26 | 站位框铺满预览（FR-022）；`--placement-guide-aspect` 不再裁安全区 |
| 0.3.0 | 2026-09-10 | T10-1：OLED 真黑、白胶囊 CTA、Barlow 字族名；pose 绿黄红不变 |
