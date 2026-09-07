# 交接：T9-3 肌群收口（2026-08-21）

> **新对话入口**。先读：`docs/PRD.md`（**0.6.14**）→ 本文 → `docs/3d-human-figure-plan.md` → `docs/progress.json`。  
> 真机 **VT-P9-002 通过**（2026-08-21，G4B / Dev Client `com.fitnesscoach.mobile`）。

## 产品形态（已冻结）

| 层 | 做什么 | 不做什么 |
|----|--------|----------|
| **身上 2D 骨骼** | 用户实时 MediaPipe Pose；细绿/黄/红线 + 白边圆点；含踝/踵/脚尖 | 不播样片、不换成示范姿势、不叠青色 3D 胶囊 / xbot.glb、**不画肌群色块** |
| **示范窗「样片」** | 循环播参考库原片（`source.label`）；随 side/front 换片后仍循环；点画面暂停/播放；倍速 0.5/1/1.5/2 | 不用轨迹骨骼冒充原片。切「骨骼」时**不停掉** AVPlayer（隐藏层暂停） |
| **示范窗「骨骼」** | `canonicalPoseFromUser`：窗内拟合用户当前 Pose；浅灰人体底 + catalog 主动肌小色块；绿骨在上 | 不跟样片初始姿势；侧面只画近镜头一侧肢体 |

窗：178×297，可拖全屏（不吸边）；收起折出屏外，留「示」拉开。

## 关键实现（T9-3）

| 点 | 位置 |
|----|------|
| 主动肌登记 | `packages/core` `catalog.activeMuscles`；coachable 必填；未填按 `bodyPart` 兜底 |
| 近侧过滤 / 绘制倍率 | `packages/render/src/muscleTint.ts` → `pipVolumesToPaint` |
| 着色 | `packages/ui` `muscleFill`（rest=浅灰；active 才分色） |
| PIP | `ReferencePersonPip`：色块缩小；绿骨 `zIndex` 压过 |
| 样片不卸载 | `ReferenceDemoWindow` 骨骼模式隐藏 clip 层；`clipShouldPlay`；`PipSampleVideo` 同一 Video `unload→loadAsync` |

改 `packages/render` / `pose-native` / `ui` / `core` 源码后必须 **build**（Metro 走 dist）。

## 硬约束

- 业务相位/计数只在 `packages/core`
- 不要 Expo Go；Dev Client `http://<LAN>:8081`（现网 `192.168.10.21:8081`）
- 真机返工：先 `pnpm --filter @fitness-coach/mobile check:reference`
- 后续动作禁止把参考库整库打进包（NFR-010）

## 不要做

- 把样片/示范 Pose 叠回摄像头上的用户身上
- 再叠青色 3D 胶囊或把 GLB 当训练主路径
- 把校验阈值降到 0.5 以下（只放宽绘制）
- 未要求就 arm loop / 没讨论完 ASSET-SCOUT 就实现臀桥

## 下一任务

**M13-GATE 已通过（2026-08-21）**。见 `docs/session-compression-M13-GATE.md`。新对话先讨论 ASSET-SCOUT，再臀桥。
