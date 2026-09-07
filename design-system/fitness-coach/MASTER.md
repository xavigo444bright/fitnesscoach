# Fitness Coach — Visual Master

> Source of truth for UI-013.  
> Reference: **MLS: The Official App** (iOS), product link  
> https://mobbin.com/apps/mls-ios-8479c397-465e-4e38-8a14-619ec4252523/24b013c9-6bf2-4a99-b599-76f81631495f/screens  
> Captured 2026-09-08 via Mobbin public splash + App Store screenshots (Mobbin flow URL requires login).  
> Stack: React Native / Expo. Skill: `ui-ux-pro-max` (dark-mode-oled + exaggerated-minimalism + Sports/Fitness type).  
> **Do not copy MLS logo, club crests, soccer scores, Apple TV, or fantasy pitch.** Take layout, density, and contrast only.

## Product mapping

| MLS (sports media) | Our app (coach + log) |
|--------------------|------------------------|
| Home feed of stories | 首页：分段 训练（本节课）\| 动作（库） |
| Match hero + score | Session hero: exercise photo/video + key numbers (sets × reps × kg) |
| Standings table | History / PR / volume table |
| Floating 5-tab bar + center mark | **2-tab** floating pill: 首页 / 记录. In-page segments, no center plus |
| Full-bleed action photo onboarding | Brand / guest login: dark full-bleed, white wordmark, white pill CTA |

Camera follow-along (PG-004) keeps FR-060 skeleton, FR-061 green/yellow/red, demo window. Visual chrome around the camera can go MLS-dark; **do not hide overlay for aesthetics.**

## Style

- **Name:** OLED athletic editorial
- **Mode:** Dark only for v1 shell (camera overlay stays as today)
- **Keywords:** true black, high-contrast white type, large imagery, rounded cards, floating tab bar, sparse chrome
- **Avoid:** orange “gym startup” palette, emoji as icons, gray-on-slate debug chrome, neon cyberpunk, neumorphism, copying MLS branding

## Color tokens (target; replace `docs/design-tokens.md` on implement)

| Role | Hex | Notes |
|------|-----|--------|
| Background | `#000000` | OLED black, not slate `#0F172A` |
| Surface | `#121212` | Cards, sheets |
| Surface raised | `#1A1A1A` | Nested rows |
| Foreground | `#FFFFFF` | Titles, primary stats |
| Muted | `#A3A3A3` | Timestamps, column headers |
| Border | `#2A2A2A` | Hairline only |
| CTA fill | `#FFFFFF` | Primary buttons (MLS Highlights) |
| On CTA | `#000000` | Text on white pills |
| CTA ghost | transparent + `#FFFFFF` 1.5pt stroke | Secondary (Sign up / Watch) |
| Tab bar | `#0A0A0A` ~92% | Floating pill |
| Tab active | `#FFFFFF` | Filled Phosphor weight |
| Tab inactive | `#737373` | Regular outline |
| Center Start | `#2563EB` circle + white glyph | MLS-style center mark; **not** pose-correct green |
| Pose correct / warning / error | keep `#22C55E` / `#EAB308` / `#EF4444` | Training overlay only |

Text contrast ≥ 4.5:1. Do not use `#94A3B8` on `#0F172A` as the new body color.

## Typography

- **Display / titles:** Barlow Condensed 600–700 (sports condensed; not MLS wordmark itself)
- **Body / numbers:** Barlow 400–600; tabular nums for sets/reps/kg
- **Scale (375pt width):** Screen title 28–32; card title 18–20; body 15–16; meta 12; huge stat 40–48
- **RN:** `@expo-google-fonts/barlow-condensed` + `@expo-google-fonts/barlow`. Fallback: San Francisco until fonts ship.

## Layout & components

- **8pt rhythm.** Page gutter 16. Card radius 16. Pill buttons radius 999. Tab bar radius 28, 12pt inset above home indicator.
- **Hero cards:** full-bleed image, 16 radius, title + one meta line under (no clutter).
- **Tabs:** exactly two. No center raised button.
- **Tables:** uppercase muted headers; primary column bold white; secondary muted; row min height 44pt.
- **Segmented tabs:** text + thick white underline (Eastern/Western pattern).
- **Primary CTA:** full-width white pill, black label, ≥44pt height.
- **Icons:** Phosphor only. Outline inactive, fill active. No emoji. Tab: `House`, `Calendar`. Segments may use `Barbell` / `User`.
- **Touch:** 44pt iOS / 48dp Android; 8pt gap between targets; SafeAreaView.

## Motion

Subtle only: 150–200ms opacity/press. No GSAP on native. Honor `reduceMotion`.

## Anti-patterns (from MLS + skill)

- White page background
- Blue `#3B82F6` as every button (old token)
- Crowding the camera with extra chrome
- Bottom nav > 2 items
- Center raised Start button (rejected 2026-09-08)
- Mixing filled and outline icons in the same tab row

## Implementation order

See `docs/app-ia.md` §5. Do not skip to templates or account before the tab shell and log core exist.
