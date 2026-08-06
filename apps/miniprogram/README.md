# apps/miniprogram

微信小程序（M5 壳 + 训练分包 `packageTrain`）。

## 打开工程

1. 同步 workspace 包到**训练分包**（NFR-007：主包不含 TFJS）：

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd /Users/xavigo4bright/Projects/fitness-coach
pnpm install
pnpm --filter @fitness-coach/miniprogram build
```

2. 在分包目录安装 TFJS（首次 / 依赖变更时）：

```bash
cd apps/miniprogram/packageTrain
npm install --registry=https://registry.npmmirror.com
```

3. 微信开发者工具 → 导入  
   `/Users/xavigo4bright/Projects/fitness-coach/apps/miniprogram`
4. AppID：测试号 / 游客模式（当前工程 `wxcf2c7349134fbd2d`）

入口为 **动作库**（PG-001）。完整流：库 → 详情 → 准备 → **分包训练页** → 总结。  
调试入口仍在动作库底部「调试姿态」（`packageTrain/pages/pose`）。

## 构建 npm（仅分包）

`packNpmManually` + `packNpmRelationList` 指向 `packageTrain/package.json`，产物在 `packageTrain/miniprogram_npm/`。

**「构建 npm」会清空该目录的 npm 产物**——顺序：

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd /Users/xavigo4bright/Projects/fitness-coach
pnpm --filter @fitness-coach/miniprogram build   # local_modules + 镜像到 packageTrain/miniprogram_npm
cd apps/miniprogram/packageTrain && npm install --registry=https://registry.npmmirror.com
```

然后：

1. 微信开发者工具 → **工具 → 构建 npm**（会写 `packageTrain/miniprogram_npm`）
2. 立刻补 shim / 恢复 `@fitness-coach/*`：

```bash
cd /Users/xavigo4bright/Projects/fitness-coach/apps/miniprogram
./scripts/sync-shims.sh
```

3. 确认存在：
   - `packageTrain/miniprogram_npm/@fitness-coach/pose-mp/index.js`
   - `packageTrain/miniprogram_npm/@tensorflow/tfjs-core/index.js`（缺则 `sync-shims` 会从根目录种子复制）
4. 再编译 / 真机调试

> 根目录旧 `miniprogram_npm` 作 TFJS 种子 / 已被 pack ignore，训练页只读分包目录。  
> 若报 `.../pose-mp/@tensorflow/tfjs-core.js is not defined`：分包缺 TFJS → `./scripts/sync-shims.sh` 后重编译（**不要**在等人检验时乱改）。  
> 若报 `@fitness-coach/* is not defined` → `pnpm --filter @fitness-coach/miniprogram build`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter @fitness-coach/miniprogram build` | bundle → packageTrain + sync shims |
| `pnpm --filter @fitness-coach/miniprogram verify` | VT-P5-002 分包 npm 冒烟 |
| `pnpm --filter @fitness-coach/miniprogram check:size` | VT-P5-007 主包/分包体积估算 |
| `pnpm --filter @fitness-coach/core test` | L1 全绿（改 core 后必跑） |

## 验收

| 任务 | 操作 | 标准 |
|------|------|------|
| M5-T4 / VT-P5-007 | `check:size` + 开发者工具包体 | 主包 &lt;2MB，分包 &lt;20MB（模型运行时下载） |
| M2B / VT-P5-002 | `verify` + core `test` | 同一份 core；L1 全绿 |
| M5-GATE | 真机全流程 | 库→训→结，骨骼/反馈/计数 OK |

## 若报 `@mediapipe/pose` / `tfjs-backend-webgpu` is not defined

微信构建会把 pose-detection 的 unused 外置依赖也 require 进来。已提供本地 shim：

- `vendor/mediapipe-pose-shim`
- `vendor/tfjs-backend-webgpu-shim`

请：

1. `cd apps/miniprogram/packageTrain && npm install`
2. 开发者工具 → **工具 → 构建 npm**
3. `./scripts/sync-shims.sh`
4. 确认存在：
   - `packageTrain/miniprogram_npm/@mediapipe/pose/`
   - `packageTrain/miniprogram_npm/@tensorflow/tfjs-backend-webgpu/`
   - `packageTrain/miniprogram_npm/@fitness-coach/core/`
   - `packageTrain/miniprogram_npm/@fitness-coach/pose-mp/`
   - `packageTrain/miniprogram_npm/@fitness-coach/render/`
