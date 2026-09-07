# 交接：T9-2 示范窗收口（2026-08-19）

> **新对话入口**。先读：`docs/PRD.md`（**0.6.11**）→ 本文 → `docs/3d-human-figure-plan.md` → `docs/progress.json`。  
> 真机 **VT-P9-003 通过**（2026-08-19，G4B / Dev Client `com.fitnesscoach.mobile`）。

## 产品形态（已冻结，后者覆盖前者）

| 层 | 做什么 | 不做什么 |
|----|--------|----------|
| **身上 2D 骨骼** | 用户实时 MediaPipe Pose；细绿/黄/红线 + 白边圆点；含踝/踵/脚尖 | 不播样片、不换成示范姿势、不叠青色 3D 胶囊 / xbot.glb |
| **示范窗「样片」** | 循环播参考库原片（`source.label`）；随 side/front 换片后**仍循环**；点画面暂停/播放；倍速 0.5/1/1.5/2 | 不用轨迹骨骼冒充原片 |
| **示范窗「骨骼」** | `canonicalPoseFromUser`：窗内拟合**用户当前 Pose** | 不跟样片初始姿势、不取样片相位 |

窗：178×297，可拖全屏（不吸边）；收起折出屏外，留「示」拉开。

## 关键实现

| 点 | 位置 |
|----|------|
| 绘制 vis **0.2** / 校验 vis **0.5** | `packages/pose-native/src/visibility.ts` → `DevPoseScreen`：`smooth(detected)` 后拆 `forDraw` / `forRules` |
| 脚骨 27–29/31、28–30/32 | `packages/core` `LandmarkIndex`；`packages/render/src/bones.ts`；`BODY_LANDMARK_INDEXES` |
| 小窗跟人 | `canonicalPoseFromUser`（`packages/render/src/referenceSkeleton.ts`） |
| 原片 | `apps/mobile/assets/samples/*-01.mp4` + `sampleClips.ts`；`PipSampleVideo` 落到 `file://` 再播 |
| 换片循环 | `PipSampleVideo`：load 时 `setStatusAsync({ isLooping: true })`；`didJustFinish` 且未暂停则 `replayAsync`；`shouldRestartClipLoop` 在 `packages/ui/src/clipPlayback.ts` |
| 播放器探测 | `requireOptionalNativeModule('ExponentAV')`（不要 `NativeModules.ExponentAV`） |
| 钩子顺序 | `PipClipPane` 钩子写死；播放器不放 `useState` |

改 `packages/render` / `pose-native` / `ui` / `core` 源码后必须 **build**（Metro 走 dist）。

## 硬约束

- 业务相位/计数只在 `packages/core`
- 不要 Expo Go；Dev Client `http://<LAN>:8081`（现网 `192.168.10.21:8081`）
- 真机返工：先 Node 自检（`pnpm --filter @fitness-coach/mobile check:reference`），自检不过不请开手机
- Overlay 网格空/贴角必须回退，禁止藏胶囊留空白
- 后续动作**禁止**把参考库整库打进包（NFR-010）；运行时只解码当前一条

## 不要做

- 把样片/示范 Pose 叠回摄像头上的用户身上
- 再叠青色 3D 胶囊或把 GLB 当训练主路径
- 把校验阈值降到 0.5 以下（只放宽**绘制**）
- 未要求就 arm loop / 推进 T9-3 以外的第三动作

## 下一任务

**T9-3 已完成（2026-08-21）**。见 `docs/session-compression-T9-3.md`。下一 **M13-GATE**。
