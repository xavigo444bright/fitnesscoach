# 交接：Plan C — 训练页 3D 骨骼+肌肉（2026-08-12）

> **新对话入口**。先读：`docs/PRD.md`（**0.5.0**）→ 本文 → `docs/3d-stack-oq-005.md` → `docs/progress.json`。

## 决策（已定）

| 项 | 结论 |
|----|------|
| 2D 火柴人 / Plan A anatomy guide | **否决**（代码已删） |
| 产品参考层 | **Plan C**：示范轨迹驱动的 **3D 骨骼 + 简化肌肉** |
| 轨迹管线 FR-067 | **保留复用**（相位/进度/对齐） |
| FR-069 / VT-P7-003 | **不阻塞** C；阈值未改运行时 |
| 详情页 FR-064 | 仍 **P2** |

## 已完成（可依赖）

- M0–M6 GATE；App：深蹲 + 俯卧撑 coachable、计次、语音、分层动作库
- RULE-BOUNDARY（含俯卧撑矩阵）
- 轨迹：`packages/core/src/trajectory/` + `packages/core/trajectories/`（squat/pushup side+front 真片）
- 驱动：`referencePoseFromTrajectory`、ghost 对齐、机位/朝向 latch
- 工具：`tools/trajectory-extract/`、`tools/trajectory-source-ingest/`
- 文档：PRD **0.5.0**、OQ-005、ROADMAP Phase 8、MODULES M12、VT-P8-*

## 下一任务（按序）

1. **T8-1**：✅ VT-P8-001；选型 expo-gl + three.js  
2. **T8-2**：squat side：轨迹 → 3D rig  
3. **T8-3**：简化肌肉/体积 + 画幅对齐；用户目视验收  
4. **T8-4**：pushup side + 开关/性能（VT-P8-003/004）

**评估动作**：仅 squat + pushup（先 side）。

**硬约束**：业务校验仍在 `packages/core`；勿推倒规则引擎；MVP 先 side。

## 关键路径

| 用途 | 路径 |
|------|------|
| 轨迹 | `packages/core/src/trajectory/`、`packages/core/trajectories/` |
| 对齐 | `packages/render/src/ghost.ts`、`referenceSkeleton.ts` |
| 训练页 | `apps/mobile/src/screens/DevPoseScreen.tsx`、`SkeletonOverlay.tsx`（绘制层待换） |
| 进度 | `docs/progress.json`（`next_task=T8-2`） |
| 片源 | `media/trajectory-source/`（大视频勿 commit） |

## 不要做

- 复活 anatomyGuide / 继续打磨 2D 观感当产品
- 未改 PRD 就另起一套「像素直接出解剖片」热路径
- 在 UI 层写相位/计数规则
