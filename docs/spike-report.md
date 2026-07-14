# Phase 0 技术 Spike 报告

> 在 Phase 0 完成后填写。结论需回写 `docs/PRD.md` §5.3 与变更记录。

## 测试环境

| 项 | App | 小程序 |
|----|-----|--------|
| 测试日期 | 2026-07-11 | 2026-07-15 |
| 设备型号 | G4B（iPhone 14 Pro） | G4B（iPhone 14 Pro，微信真机预览） |
| 系统版本 | iOS 26.5 | iOS 26.5 |
| 微信基础库 | — | 真机预览（Devtools 2.01.2510250） |
| Expo SDK | 54 + Development Build | — |

## App Spike（T0A）

| 指标 | 结果 | 是否达标 |
|------|------|----------|
| 姿态方案 | MediaPipe Pose（`@thinksys/react-native-mediapipe`） | ✅ |
| 关键点 | 33 | ✅ ≥17（VT-P0A-004） |
| FPS | 20 | ✅ ≥15（VT-P0A-006） |
| 首次加载 | Development Build 冷启动可接受 | ✅ |
| 延迟体感 | 骨骼跟手可接受 | ✅ |

> **说明**：MediaPipe 需 **Development Build**，Expo Go 无法运行原生姿态模块。构建命令见 README。

## 小程序 Spike（T0B）

| 方案 | FPS | 延迟 | 包体 | 结论 |
|------|-----|------|------|------|
| A: TFJS MoveNet（端侧 WebGL） | ~4（实测值） | 稳态 ~350ms/帧 | 主包 <2MB；模型 ~4.5MB 运行时下载至 `USER_DATA_PATH` 缓存 | ✅ **选定** |
| D: 云端 API | — | — | — | 未测（A 已可行，暂不需要） |

**MoveNet Lightning（singlepose）实测（`nhwc-v11`）**：

| 指标 | 结果 | KPI | 是否达标 |
|------|------|-----|----------|
| 关键点（全身入镜） | 14–15 / 17（score>0.15） | VT-P0B-003 全身有点输出 | ✅ |
| FPS | ~4 | VT-P0B-004 ≥10 **或记实值** | ✅（记实值） |
| 稳态推理 | ~350ms/帧（WebGL） | — | ⚠️ 低于后续 ≥15 FPS 目标 |
| backend | `webgl`（手动 `registerBackend` + `wx.createOffscreenCanvas`） | — | — |

**选定方案**：**A（端侧 TFJS MoveNet Lightning，WebGL backend）**，符合 `FR-033`（视频本地处理、不上传云端）。

## 决策

- [x] 继续 App 主线（MediaPipe + Dev Client）
- [x] 小程序方案：**A（端侧 MoveNet / WebGL）**
- [ ] 是否更新 PRD 至 0.2.0（App 方案可先记入变更记录）

## 小程序 FPS 优化路径（进入 M2B 前评估）

当前 ~4 FPS / 350ms 可跑通 spike，但低于 VT-P2-005 的 ≥15 FPS 目标。按 VERIFICATION「FPS 不达标」缓解顺序：

1. **降输入分辨率 / 相机帧尺寸**（onCameraFrame 已是缩略帧，可再降）
2. **确认走 WebGL2**（status 里的 `webgl-2` 优于 `webgl-1`；WebGL1 明显更慢）
3. 复用输入张量、减少每帧 `tf.tensor` 上传与 `data()` 回读开销
4. 仍不达标 → 按 PRD 降级 KPI（表单教练非游戏，低帧率可接受）或评估方案 C（关键帧云端兜底）

## 风险与备注

- iOS 真机开发依赖 Xcode Platforms（匹配系统版本）+ Development Team 签名
- `ENABLE_USER_SCRIPT_SANDBOXING` 需设为 NO，否则 Expo 构建脚本被沙箱拦截
- App Store Expo Go 为 SDK 54；姿态推理必须用 Development Build，不能依赖 Expo Go
