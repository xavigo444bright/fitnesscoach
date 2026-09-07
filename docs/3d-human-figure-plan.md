---
document: 3d-human-figure-plan
product: fitness-coach
version: 2.0.0
last_updated: 2026-08-21
depends_on:
  - docs/PRD.md
status: done
---

# 训练参考：身上用户骨骼 + 示范窗（M13）

> 产品决定（PRD **0.6.16**）：**M13-GATE 通过**。ASSET-SCOUT 清单已落。等你确认新片授权后再臀桥。交接 `docs/session-compression-M13-GATE.md`、`docs/exercises/asset-scout.md`。

## 两层

| 层 | 位置 | 驱动 | 画法 |
|----|------|------|------|
| **用户 2D 骨骼** | 叠在用户身上 | 实时 Pose | 细绿/黄/红线 + 白边圆点；始终贴合自己；含踝/踵/脚尖。**不画肌群色块** |
| **示范窗** | 屏幕右下默认、可拖全屏、可收起 | 默认循环 `source.label` 原片；「骨骼」= `canonicalPoseFromUser` | 原片，或浅灰人体底 + 主动肌小色块 + 用户 2D 骨骼；窗约 178×297 |

## T9-3 肌群（FR-085，done）

- 几何：`buildRig3d` 体积含 chest / pelvis / thigh / upperArm。
- **登记**：`ExerciseCatalogEntry.activeMuscles`。coachable 必填（单测卡住）。catalog 未填则按 `bodyPart` 兜底。加新可训练动作时只改 catalog 一行，不必改 PIP 绘制。
- 当前：深蹲 `pelvis+thigh`；俯卧撑 `chest+upperArm`。
- 侧面：只画近镜头一侧肢体，避免左右大腿叠成一团。
- 着色：rest=浅灰；active 才用粉/橙/青绿/靛。绿骨 `zIndex` 压过色块。
- 小窗禁止 expo-gl。

### 加一个动作的主动肌

1. 升级 coachable 时在 `packages/core/src/exercises/catalog.ts` 写上 `activeMuscles: ["pelvis", …]`。
2. 可选体积 kind：`chest` / `pelvis` / `thigh` / `upperArm`（扩体积时再加 id）。
3. 跑 `pnpm --filter core test`：漏登记会红。

## 硬约束

1. 禁止把样片/示范 Pose 画到摄像头上的用户身上。  
2. 小窗禁止 expo-gl `drawingBuffer` 视口。  
3. 业务相位/计数只在 `packages/core`。
4. 「样片」必须是参考库原片，禁止用轨迹骨骼动画冒充；无 `ExponentAV` 时占位，禁止红屏。  
5. 原片打进安装包会增大包体，运行时只解码当前一条（NFR-010）；禁止把参考库整库打进包。
6. 肌群色块只出现在示范窗骨骼模式，禁止叠回摄像头身上。
