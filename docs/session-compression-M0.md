# Session Compression — M0 工程基建（至 2026-07-12）

> 压缩策略：Anchored Iterative Summarization（context-compression skill）  
> 用途：后续对话优先读本文件，避免重扫整段聊天历史。  
> 真源仍以 `docs/PRD.md` / `docs/MODULES.md` / `docs/progress.json` 为准。

## Session Intent

按模块 Loop 推进 **M0 工程基建**：monorepo → Expo App Spike（摄像头 + MediaPipe）→ 微信小程序 Spike（摄像头 + MoveNet）。人工强介入；真机验证通过后再解锁下游。

## Current State

| 任务 | 状态 | 关键证据 |
|------|------|--------|
| M0-T1 monorepo | ✅ | `pnpm install && build` 通过 |
| M0-T2 Expo 启动 | ✅ | Metro 8081；最终钉 **Expo SDK 54** |
| M0-T3 摄像头 | ✅ | 真机 Expo Go / 后改 Dev Client |
| M0-T4 App 姿态 | ✅ | MediaPipe；**关键点 33，FPS 20**（G4B / iPhone 14 Pro / iOS 26.5） |
| M0-T5 小程序 camera | ✅ | 用户确认「小程序摄像头 OK」 |
| M0-T6 小程序 MoveNet | ✅ | 真机 `nhwc-v11·webgl`：关键点 14-15/17，FPS~4，稳态~350ms |
| M0-T7 / M0-GATE | ⏳ | T6 已过、spike-report 已填；待 M0-T7 收尾 → M0-GATE（人工） |

**App 结论（已写入 `docs/spike-report.md`）**：MediaPipe + Development Build（Expo Go 不能跑原生姿态）。  
**小程序结论**：**方案 A（端侧 TFJS MoveNet Lightning / WebGL backend）已拍板**，符合 `FR-033`。FPS ~4 低于后续 ≥15 目标，优化路径记于 spike-report。

## Decisions Made（保留）

1. **App 姿态 = MediaPipe**（`@thinksys/react-native-mediapipe`）+ **expo-dev-client**，不用 Expo Go 跑姿态。
2. **Expo SDK 钉 54**：App Store Expo Go = SDK 54；SDK 55/56/57 真机 Go 不兼容。iPhone 不能装旧版 Expo Go。
3. **小程序用游客/测试 AppID 即可**；真机预览为准，开发者工具相机/翻转不可靠。
4. **微信 TFJS**：优先 **cpu backend**；为 outsideDeps 做 shim：`@mediapipe/pose`、`@tensorflow/tfjs-backend-webgpu`。
5. **MoveNet 加载**：最终改为 **直接 `loadGraphModel`** + JS 侧缩成 `[1,192,192,3]`，避开 `pose-detection` 的 `fromPixels`/`cropAndResize` 通道错乱。
6. 构建 npm 后必须跑：`apps/miniprogram/scripts/sync-shims.sh`（补 `package.json`）。

## Bug → Fix Trail（精炼）

| 现象 | 根因 | 修复 |
|------|------|------|
| Expo Go「需要更新」 | 项目 SDK 57/56/55 ≠ 商店 Go 54 | 升到 **SDK 54** |
| `pod install` ZXingObjC clone 超时 | GitHub 443 | 代理 / git 镜像 |
| `devicectl` / No simulator | Xcode 26 + 真机 Offline | Xcode 打开 `.xcworkspace` 装真机 |
| Signing requires team | 未选 Development Team | Xcode Signing 选 Apple ID |
| Sandbox deny file-write-create `.../ip` | `ENABLE_USER_SCRIPT_SANDBOXING=YES` | pbxproj 改为 **NO** |
| Dev Client 无权限/无 HUD | JS 未连 Metro | `expo start --dev-client`；权限用 `useCameraPermissions` |
| `getCameraPermissionsAsync is not a function` | API 用法/导出不一致 | 改 `useCameraPermissions()` |
| 小程序 800059 pose.js not found | `ignoreDevUnusedFiles: true` | 设 **false** |
| `@mediapipe/pose` / `webgpu` not defined | 构建 npm outsideDeps | vendor shim + sync-shims |
| ENOENT `.../pose/package.json` | 构建 npm 漏 package.json | sync-shims 强制拷贝 |
| `platform.fetch` undefined | 微信无 fetch | `tf.setPlatform('wechat', {fetch: wx.request…})` |
| missing atob/Buffer；`new Buffer` 非构造函数 | 微信无 Node/DOM | atob/btoa + **可 new 的 Buffer polyfill** |
| fromPixels Object / depth 192≠3 | 帧格式与 cropAndResize 通道错乱 | RGBA→手动 `[1,192,192,3]` + 直载 MoveNet |
| 真机 80051 source exceed 2MB | 主包打进 ~4.5MB 模型权重 | `nhwc-v8`：模型改下载到 `USER_DATA_PATH` 缓存；精简依赖；pack ignore models |
| `tensor1d().reshape` 不是函数 | 微信 TFJS 包无该实例方法 | `nhwc-v9`：改 `tf.tensor(flat,[1,192,192,3],'int32')` |
| CPU 下卡「检测中」>60s 假死 | 微信 CPU backend `execute` 同步堵主线程，setTimeout/心跳救不了 | `nhwc-v10→v11`：改**优先 WebGL**；`data()` 异步回读 |
| `backend name 'webgl' not found in registry` | webgl 包仅在 `device_util.isBrowser()` 时 `registerBackend`，微信非浏览器 | `nhwc-v11`：`wx.createOffscreenCanvas`→`setWebGLContext`→手动 `registerBackend('webgl', ()=>new MathBackendWebGL(new GPGPUContext(gl)),2)` |
| webgl 不在 miniprogram_npm | 上次「构建 npm」时尚未装 webgl | `npm i @tensorflow/tfjs-backend-webgl`；`sync-shims.sh` 增加拷贝 `dist/miniprogram/index.js` |

## Dead Ends（不必再试）

- 把项目降到 SDK 52「迁就」旧 Go → iOS 只允许最新 Go，反报需升到 54。
- 在 Expo Go 里跑 MediaPipe → 必须 Dev Build。
- 依赖开发者工具验证摄像头翻转 → 以真机为准。
- 用完整 `@tensorflow-models/pose-detection` 主入口（会拖 BlazePose/MediaPipe/WebGPU）。
- 依赖 `tf.browser.fromPixels` / `cropAndResize` 在微信 CPU 上做预处理。

## Artifact Index（路径 verbatim）

**创建/关键**
- `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
- `packages/{core,pose-native,pose-mp,render}/`
- `apps/mobile/`（Expo SDK 54, MediaPipe, PoseSpikeScreen）
- `apps/miniprogram/`（camera + pose 页）
- `apps/miniprogram/utils/poseSpike.js`（当前 MoveNet 直载逻辑）
- `apps/miniprogram/vendor/{mediapipe-pose-shim,tfjs-backend-webgpu-shim}/`
- `apps/miniprogram/scripts/sync-shims.sh`
- `docs/spike-report.md`, `docs/progress.json`

**注意**
- `apps/mobile/ios/`：签名、`ENABLE_USER_SCRIPT_SANDBOXING=NO`
- 小程序：`ignoreDevUnusedFiles=false`；`urlCheck=false`（Spike 下模型）

## Environment Anchors

- Node via **nvm** `v24.18.0`；`pnpm@9.15.0`；registry 可用 npmmirror
- CocoaPods `1.17.0`（user gem）；无 Homebrew 时勿假定 brew
- 真机：**G4B**（iPhone 14 Pro），iOS 26.5；Xcode 26.x
- 微信 AppID：`wxcf2c7349134fbd2d`（用户工程）

## Next Steps（压缩后继续点）

1. **完成 M0-T6**：真机「姿态 Spike」拿到关键点≥17 与 FPS（≥10 或记实值）→ 回写 `spike-report.md` 小程序栏 + PRD §5.3。
2. 若 MoveNet 仍失败：记录失败原因，评估方案 **D（云端）** 或降级 KPI（见 VERIFICATION 未通过表）。
3. **M0-T7** 整理 `progress.json` → **M0-GATE**（App 已满足；小程序待出点）。
4. Gate 后：`M1` Core 与 `MU` UI 可并行 ready。

## Probe Cheatsheet（防遗忘）

- App 姿态方案？→ MediaPipe + Dev Client；33 点 / 20 FPS  
- Expo SDK？→ **54**  
- 小程序构建 npm 后必做？→ `./scripts/sync-shims.sh`  
- 当前阻塞？→ M0-T6 真机 MoveNet 出点/FPS 确认  
- 不要再用？→ Expo Go 跑姿态；SDK 乱升降；pose-detection 全量入口 + fromPixels  

---

*Compression cycle: 2026-07-12 · covers ~2026-07-07 → 2026-07-12 M0 work*
