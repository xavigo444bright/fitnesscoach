# 会话交接：转向方案 C（2026-08-12）

> 供**新对话**粘贴/阅读。旧对话 context 已挤满轨迹对齐与 A 方案绘制，不适合继续做 C。

## 用户决策

- **A 方案（丰满 2D anatomy guide）真机否决**：仍「太离谱 / 太差」
- **改走 C**：样片驱动的 **3D 骨骼 + 肌肉** 动画叠训练（或等价观感）
- **须改 PRD**：当前 FR-068 明文是 2D 非解剖；FR-064 预渲染 3D 详情为 P2。C = 新产品范围

## 已完成（可保留）

| 块 | 状态 | 说明 |
|----|------|------|
| M0–M4 App 壳 / Core / Pose | done | 深蹲+俯卧撑 coachable、计次、语音、目录 |
| RULE-BOUNDARY | done | 含俯卧撑矩阵 |
| APP-TRAJECTORY T7-1 | done | 轨迹格式 + 离线提取工具 |
| T7-2 | 逻辑 done | 轨迹→参考骨叠加；**观感未过用户验收** |
| T7-3 | 逻辑 done | calibrate；正侧提议冲突未改运行时阈值 |
| 深蹲轨迹 | 真片 | side-v1 默认；front-v1；v2 举手过多备查 |
| 俯卧撑轨迹 | 真片 | side 27–29s；front 2:44–2:49（纠错演示片，质量一般） |
| 垂臂站立门禁 | done | `assertCanonicalStandQuality` / ingest `armsDownStand` |
| A 方案代码 | landed | `anatomyGuide.ts` + Overlay guides；**用户否决观感** |

## 未过 / 阻塞

- **VT-P7-003** 仍 `paused_human`（轨迹对照真机抽测）
- 2D 参考骨（火柴人 / anatomy guide）用户认定不可作为产品方向
- 小程序 MP-FPS parked；FR-064 详情解剖片仍无素材

## C 方案新对话应先做

1. 通读 `docs/PRD.md` → 起草 FR-068/064/065 修订（训练页要什么：实时 skinned mesh？预渲染同步播？）
2. 技术选型短评：Expo + Filament / three.js / 预渲染序列帧 / 外部 DCC 烘焙
3. MVP 范围：仅 squat side + pushup side，肌肉可先简化
4. **轨迹管线可复用**（相位/进度驱动）；绘制层替换，勿推倒 core 规则引擎

## 关键路径

- 轨迹：`packages/core/src/trajectory/`、`packages/core/trajectories/`
- 对齐/参考：`packages/render/src/ghost.ts`、`referenceSkeleton.ts`、`anatomyGuide.ts`
- App：`apps/mobile/src/screens/DevPoseScreen.tsx`、`SkeletonOverlay.tsx`
- 工具：`tools/trajectory-extract/`、`tools/trajectory-source-ingest/`
- 进度：`docs/progress.json`（loop=`paused_human`）
- 片源：`media/trajectory-source/`（**勿 commit 大视频**；`.gitignore` 已倾向忽略）

## Metro（若验旧包）

手机同 Wi‑Fi：`http://<LAN_IP>:8081`（上次 `192.168.10.21:8081`）
