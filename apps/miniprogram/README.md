# apps/miniprogram

微信小程序（M0-T5 / M0-T6）。

## 打开工程

1. 微信开发者工具 → 导入  
   `/Users/xavigo4bright/Projects/fitness-coach/apps/miniprogram`
2. AppID：测试号 / 游客模式

## 构建 npm（M0-T6 必需）

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd /Users/xavigo4bright/Projects/fitness-coach/apps/miniprogram
npm install --registry=https://registry.npmmirror.com
```

然后：

1. 微信开发者工具 → **工具 → 构建 npm**
2. **立刻**在终端执行（补齐构建漏掉的 shim `package.json`）：

```bash
cd /Users/xavigo4bright/Projects/fitness-coach/apps/miniprogram
./scripts/sync-shims.sh
```

3. 再编译 / 真机调试

> 若跳过第 2 步，可能报：`ENOENT ... @mediapipe/pose/package.json`

## 验收

| 任务 | 操作 | 标准 |
|------|------|------|
| M0-T5 | 真机 → 摄像头预览 | 有画面（VT-P0B-002） |
| M0-T6 | 真机 → 姿态 Spike → 开始检测 | 关键点 ≥17，FPS ≥10 或记录实际值 |

## 若报 `@mediapipe/pose` / `tfjs-backend-webgpu` is not defined

微信构建会把 pose-detection 的 unused 外置依赖也 require 进来。已提供本地 shim：

- `vendor/mediapipe-pose-shim`
- `vendor/tfjs-backend-webgpu-shim`

请：

1. `cd apps/miniprogram && npm install`
2. 开发者工具 → **工具 → 构建 npm**
3. 确认存在：
   - `miniprogram_npm/@mediapipe/pose/`
   - `miniprogram_npm/@tensorflow/tfjs-backend-webgpu/`
