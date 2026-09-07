# Phase 0 技术 Spike 报告

> 历史记录。**2026-09-07 起微信小程序已放弃**，本文小程序栏不再跟进。App 栏仍为当时实测。

> 原要求：结论回写 `docs/PRD.md` §5.3 与变更记录。

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
- [x] 已更新 PRD 至 **0.2.0**（§5.3 选定方案 A、变更记录、OQ-002 结论）

## 小程序 FPS 优化路径（进入 M2B 前评估）

当前 ~4 FPS / 350ms 可跑通 spike，但低于 VT-P2-005 的 ≥15 FPS 目标。按 VERIFICATION「FPS 不达标」缓解顺序：

1. **降输入分辨率 / 相机帧尺寸**（onCameraFrame 已是缩略帧，可再降）
2. **确认走 WebGL2**（status 里的 `webgl-2` 优于 `webgl-1`；WebGL1 明显更慢）
3. 复用输入张量、减少每帧 `tf.tensor` 上传与 `data()` 回读开销
4. 仍不达标 → 按 PRD 降级 KPI（表单教练非游戏，低帧率可接受）或评估方案 C（关键帧云端兜底）

### MP-FPS 落地（`nhwc-v12-fps`）

已实现（`packages/pose-mp/wechat/movenetRuntime.cjs` + 训练/调试页）：

1. 快照边拷边下采样（长边 ≤256）再 nearest→192
2. `__copied` 帧不再二次 RGBA 拷贝；resize 映射与 Int32 缓冲池化
3. 热路径去掉无 `onProgress` 时的 `yieldToUi`；调试页稳态不传进度回调
4. WebGL 尝试 `WEBGL_PACK` + `WEBGL_FORCE_F16_TEXTURES`
5. 训练页顶部常显 `FPS≈ · inferMs≈ · webgl-*`

**真机复测（2026-07-27，iPhone 14 Pro / WebGL2）**：`FPS≈4 · inferMs≈260 · webgl-2`  
相对 Spike 基线 ~350ms，推理延迟约降 **~26%**，但帧率仍锁在 ~4（≈1000/260）。**未达** KPI-002 / NFR-001 小程序 ≥10 FPS。  
瓶颈在 WebGL `execute`（非预处理/HUD）。

### 第二轮（`nhwc-v13-sync`，待复测）

1. 读回改 `dataSync`（避开微信 iOS `await`/`setTimeout` 模拟开销）
2. 模型加载后空白帧预热 shader
3. 训练页骨骼 ~30Hz `lerpPose` 插值（计次仍用真实推理帧）— **改善体感，不提高推理 FPS**
4. 性能条拆 `p/e/r`（preprocess / execute / read）

**若 e 仍 ≥200ms**：TFJS MoveNet 在微信 WebGL 上接近平台上限。下一跳：
- `wx.createInferenceSession` 原生推理（公开对比可到 ~19ms vs TFJS ~250ms），或
- 接受小程序 KPI 降级 / 方案 C 关键帧云端

**复测结论（2026-07-29）**：`inferMs≈264-400 (p≈30/e≈217-350/r≈17)`，execute 占 85%+，判定 TFJS-WebGL 到顶。用户选定**方案 A：原生推理**。

### 第三轮（`nhwc-v14-native`，方案 A，待真机复测）

`wx.createInferenceSession` 原生推理通道（基础库 ≥2.30.0，仅真机）：

1. 模型：MoveNet SinglePose Lightning ONNX（Xenova 转换，9.4MB，opset 11）
   - 输入 `input` INT32 `[1,192,192,3]`（NHWC，0-255，与 TFJS 版同构，预处理复用 `fillPooledFlat`）
   - 输出 `output_0` FLOAT `[1,1,17,3]`（y/x/score 归一化）
2. 运行时从 `hf-mirror.com`（回退 `huggingface.co`）下载缓存到 USER_DATA_PATH；`precisionLevel 0`（最快），创建后空帧预热
3. 降级链：基础库不支持 / 下载失败 / session 加载失败 / run 报错 → 自动回退 TFJS-WebGL（run 首次报错还会拉黑原生并当帧重试 TFJS）
4. 性能条 backend 显示 `onnx-p0`（回退时仍是 `webgl-*`）

**注意**：开发调试需在开发者工具勾选「不校验合法域名」；上线前把模型迁到自有 CDN/云存储并加入 downloadFile 合法域名。若关键点抖动/不准，将 `NATIVE_PRECISION_LEVEL` 升到 2 或 4 再测。

**真机迭代记录（2026-07-30）**：
1. 原版 Xenova ONNX（INT32 输入）→ `xnet error:1 Illegal input/output size`（xnet 输入只认 float32/uint8）。typicalShape 无效。
2. 本地改 float32 输入 + Cast → `xnet error:6 Failed to convert onnx to xnet`（解码段 `ArgMax`/`GatherND` 不被支持）。
3. **当前方案**：模型切到主干（214 节点留 150，只剩 Conv/BN/Clip/Relu/Sigmoid/Resize/Reshape/Split/Add/Mul/Sub/Transpose），输出 4 头
   `out_center[1,2304,1] / out_regress[1,48,48,34] / out_heatmap[1,48,48,17] / out_offset[1,48,48,34]`，
   解码（中心 argmax → 回归粗定位 → 1/(dist+1.8) 加权 argmax → 亚像素偏移）在 JS `decodeMoveNetHeads` 完成。
   与完整模型数值对拍 diff≈6e-8（onnxruntime 20 组随机输入 + Node 测试向量）。
4. Spike 期模型由开发机局域网 `http.server` 下发（`http://192.168.31.65:8787`）；正式上线迁云存储。

## 风险与备注

- iOS 真机开发依赖 Xcode Platforms（匹配系统版本）+ Development Team 签名
- `ENABLE_USER_SCRIPT_SANDBOXING` 需设为 NO，否则 Expo 构建脚本被沙箱拦截
- App Store Expo Go 为 SDK 54；姿态推理必须用 Development Build，不能依赖 Expo Go
