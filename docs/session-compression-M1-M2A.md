# Session Compression — M0 收尾 + M1 全绿 + M2A 起步（至 2026-07-17）

> 压缩策略：Anchored Iterative Summarization（context-compression skill）  
> 用途：后续对话优先读本文件 + `docs/progress.json`，避免重扫整段聊天。  
> 真源仍以 `docs/PRD.md` / `docs/MODULES.md` / `docs/VERIFICATION.md` 为准。

## Session Intent

按模块 Loop（20min tick）推进：M0-GATE → 完成 **M1 Core** → 开始 **M2A pose-native**。本 tick 按用户要求：**停 loop + summarize**。

## Current State

| 模块 | 状态 | 证据 |
|------|------|------|
| M0 | ✅ done + GATE | App MediaPipe 33点/20FPS；小程序方案 A MoveNet WebGL ~4FPS/350ms |
| M1 | ✅ done + GATE | core **83/83** 测试；coverage ~98%；`squat.ts≡squat-rules.md` |
| M2A | 🔄 in_progress | T1–T3 ✅；**next = M2A-T4（真机）** |
| MU / M2B | ready | 未开做；MU-T1 需人工确认线框 |

**`progress.json`**：`status=in_progress`，`current_module=M2A`，`loop.mode=stopped`，`next_task=M2A-T4`（`human_required`）。

## Decisions Made

1. 小程序方案 **A（端侧 TFJS MoveNet / WebGL）**；PRD **0.2.0** §5.3；OQ-002=否（不云端）。
2. Spike FPS ~4 记实值过 VT-P0B-004；≥15 FPS 优化推迟到 **M2B**。
3. M1 优先于 MU（纯逻辑可无人值守）。
4. WebGL 需手动 `registerBackend`（微信 `isBrowser()===false`）。
5. Loop 本 tick 后停止；续跑需用户再 `/loop`。

## Artifact Index（路径 verbatim）

**M1 core（新建/关键）**
- `packages/core/src/types.ts` — Landmark/Pose/Phase/Rule*/Rep*/Fixture
- `packages/core/src/angles.ts` + `angles.test.ts` — VT-P1-002
- `packages/core/src/fixtures/` — 六组 FX-*；VT-P1-010
- `packages/core/src/validate.ts` — SQUAT_RULES + validate；VT-P1-003
- `packages/core/src/phase.ts` — 5 帧确认状态机；VT-P1-004
- `packages/core/src/repCounter.ts` — squat-depth 不计入；VT-P1-005
- `packages/core/src/exercises/squat.ts` + 契约测试；VT-P1-006
- `packages/core/src/feedback.ts` — 防抖 300ms / 冷却 2s；VT-P1-007/008
- `packages/core/vitest.config.ts` + `test:coverage`；VT-P1-009
- `packages/core/src/tools/dev-cli.ts` — 夹具调试报告

**M2A pose-native**
- `packages/pose-native/src/types.ts` — `PoseDetector.detect(frame)`；VT-P2-001
- `packages/pose-native/src/mock.ts` — MockPoseDetector
- `packages/pose-native/src/oneEuro.ts` — PoseSmoother；VT-P2-003
- `packages/pose-native/src/visibility.ts` — `filterByVisibility`；VT-P2-004 / FR-032

**文档**
- `docs/PRD.md` 0.2.0 §5.3
- `docs/spike-report.md` 小程序实测 + 方案 A
- `docs/progress.json` 状态机真源
- `docs/session-compression-M0.md`（早期）；**本文件**覆盖至 M2A-T3

## Bug → Fix Trail（本阶段精炼）

| 现象 | 修复 |
|------|------|
| validate LEAN 误触发 valgus | valgus 改用膝-踝横向偏移 / 小腿竖直长 |
| rep「半蹲」测试用 115° | 改为 95°（进 bottom 且 depth 不足） |
| phase.test 未用 `frames` 致 tsc 失败 | 删除未用变量 |
| pose-native detect 返回 Pose\|Promise 索引报错 | 测试里 `Awaited<ReturnType<…>>` |

## Next Steps

1. **M2A-T4** DevPoseScreen 接 core → **human_required / 真机**（未确认勿开做）
2. 可选：先人工 **MU-T1** 线框确认；或 `/loop` 再启（仍会卡在 T4）
3. 大量未提交改动（M0 文档 + M1 全量 + M2A）；remote 仍未配置，需用户给 URL 再 push

## Probe Cheatsheet

- 当前模块？→ **M2A**，next **M2A-T4**（真机）
- M2A-T3？→ **done**（visibility 过滤，pose-native 10/10）
- M1 是否过 GATE？→ **是**（83/83 + coverage + 契约）
- 小程序方案？→ **A WebGL MoveNet**；FPS 优化在 M2B
- Loop？→ **已停止**（2026-07-17 23:57）
- 不要再用？→ CPU backend 跑 MoveNet；跳过 GATE；未同意不 commit/push；未确认不启 T4

---

*Compression cycle: 2026-07-18 · covers M0-GATE → M1 全绿 → M2A-T1/T2/T3；停在 T4 前*
