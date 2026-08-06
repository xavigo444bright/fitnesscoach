# Session Compression — M2A 收尾 → MU/M3/M4 GATE（至 2026-07-22）

> 压缩策略：Anchored Iterative Summarization（context-compression skill）  
> 用途：新会话优先读 **本文件** + `docs/progress.json`，勿重扫长聊天。  
> 真源：`docs/PRD.md` / `docs/MODULES.md` / `docs/VERIFICATION.md` / `docs/UI.md` / `docs/design-tokens.md`  
> 更早压缩：`docs/session-compression-M0.md`、`docs/session-compression-M1-M2A.md`

## Session Intent

按模块推进 App 端完整训练闭环：M2A 自适应质量 → MU 设计令牌 → M3 渲染/反馈 → M4 App 壳；真机验收 M4-GATE；下一焦点 **M2B 小程序 Pose**。

## Current State（2026-07-22）

| 模块 | 状态 | 要点 |
|------|------|------|
| M0 / M1 / M2A / MU / M3 / **M4** | ✅ **done + GATE** | App 深蹲全流程真机通过 |
| **M2B** | 🔄 **in_progress** | **next = M2B-T1**（小程序构建接入 monorepo） |
| M5 | pending | 依赖 M2B-GATE |
| M6 | pending | 依赖 M4-GATE ✅ + M5-GATE |

**`progress.json`**：`status=in_progress`，`current_module=M2B`，`next_task=M2B-T1`，`blocker=null`，`loop.mode` 见文件（压缩时建议停 loop 开新会话）。

**Git**：本地 commit `bcaba39`（M3/M4 大包）；分支 `cursor/miniprogram-movenet-wechat-spike`；**无 `origin` remote，push 未完成**。

## Decisions Made（产品/工程）

1. **业务逻辑只在 `packages/core`**；UI 只消费 render/ui。
2. **侧摄 MVP 关闭膝内扣**（`knee-valgus-*` evaluate 恒 false）；正面机位后再开。
3. **躯干规则**：用 `torsoLeanFromVertical`（肩–髋 vs 竖直），前倾 **>55°** 才 warning；勿用肩-髋-膝角。
4. **反馈缓冲**：debounce **800ms** / cooldown **3000ms**（曾从更短值加严，减误报）。
5. **站位框**：大框贴底（~94%×88%），髋膝踝入画即可；显示有迟滞防闪。
6. **Ghost**：关键帧几何小；运行时用 `alignGhostToUser`（髋锚点 + 髋–踝缩放）。
7. **半蹲不计次**：`descend→stand` → `lastOutcome=rejected/shallow` → 文案「蹲得不够深，未计入次数」。
8. **UX-007**：有效 rep → 中央绿色 ✓（`CorrectCheckBurst`）。
9. **UX-008**：上一不标准 rep 固化错误 → 「查看上次问题」；下次有效 rep → recovered 正反馈后清空（`lastFault.ts`）。
10. **准备页**：翻转 + 质量档写入 `sessionCameraPrefs`，训练页带入（MediaPipe 默认前置，后置则 `switchCamera`）。
11. **弱光**：关键点 mean visibility &lt;0.4 →「请改善光线」（`evaluateLowLight`）；须 **build pose-native** 否则 dist 缺导出。
12. **质量档** 改 `inputScale` 会缩小相机 View（居中）；训练/准备均可手动切档。

## Artifact Index（关键路径）

**packages/ui** — theme / CMP props；`motion.correctCheckMs=700`

**packages/render**
- `buildSkeleton.ts` / `bones.ts` / `colorJoints.ts`
- `feedbackBar.ts` / `wireFeedback.ts`
- `placement.ts` / `ghost.ts`（含 `alignGhostToUser`）
- `lastFault.ts` — UX-008
- `repDisplay.ts`

**packages/pose-native**
- `mediapipe.ts` / `adaptiveQuality.ts` / `lowLight.ts`
- 入口导出须同步 `dist`（`pnpm --filter @fitness-coach/pose-native build`）

**packages/core**
- `validate.ts` — 躯干前倾、侧摄 valgus 关
- `repCounter.ts` — `lastOutcome` + `messageForRepReject`
- `feedback.ts` — 800/3000
- `exercises/squat-keyframes.ts`

**apps/mobile**
- 流：`ExerciseLibrary` → `Detail` → `Prepare` → `Training`(=DevPose training) → `SessionSummary`
- `DevPoseScreen.tsx` — 管线总装；调试入口仍在动作库
- `sessionCameraPrefs.ts` — 机位/质量会话偏好
- 组件：`FeedbackBar` / `PlacementGuide` / `CorrectCheckBurst` / `LastFaultReview` / `SkeletonOverlay` / …

## Bug → Fix Trail（本阶段）

| 现象 | 修复 |
|------|------|
| `evaluateLowLight is not a function` | rebuild `pose-native` dist |
| 训练页无法翻转/选质量 | 顶栏恒显；准备页补控件 + prefs 带入 |
| Ghost 远小于真人 | `alignGhostToUser` |
| 站位框闪/偏小 | 加大框 + ok 迟滞 |
| 半蹲不计次无文案 | `rejected/shallow` + FeedbackBar 置顶 |
| 站起后红点变绿丢原因 | UX-008 lastFault 回看 + 下次 recovered |
| 躯干误报 | 改竖直前倾角 |
| 侧摄内扣误报 | MVP 禁用 valgus |

## Deferred（勿偷做进 M2B）

- 正面机位重开膝内扣 + 机位示意图（用户曾要求）
- FR-062 角度弧（P1）
- 语音反馈（P2）
- 录屏证据 `docs/evidence/M2.mp4` 若未落盘可后补
- 配置 git `origin` 后再 push

## Next Steps

1. **M2B-T1** 小程序构建接入 monorepo（VT-P5-001/002）
2. M2B-T2 pose-mp → T3 夹具一致 → **M2B-GATE**（微信真机）
3. 然后 **M5** 小程序壳 → **M6** 交付
4. 需要时：`git remote add origin <url>` + `git push -u origin HEAD`

## Probe Cheatsheet

- 当前模块？→ **M2B**，next **M2B-T1**
- M4 过了吗？→ **是**（用户确认 GATE）
- App 训练流？→ 库→详情→准备→训练→总结
- 半蹲提示？→ 「蹲得不够深，未计入次数」+ 可「查看上次问题」
- Ghost 为何对齐？→ `alignGhostToUser`
- Loop？→ 压缩开新会话前应 **停止**；续跑需用户再 `/loop`
- 不要？→ 跳 GATE；未同意不 commit/push；逻辑写进 UI；侧摄强开 valgus

## 新会话开场白（可粘贴）

```
继续 Fitness Coach。先读 docs/session-compression-M3-M4.md 与 docs/progress.json，
执行 next_task（M2B-T1）。真源 docs/PRD.md / MODULES.md / VERIFICATION.md。
```

---

*Compression cycle: 2026-07-22 · covers M2A 收尾 → MU → M3 → M4-GATE；停在 M2B-T1 前*
