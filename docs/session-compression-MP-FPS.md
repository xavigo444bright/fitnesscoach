# Session 压缩交接 — MP-FPS 小程序帧率专项（已暂停）

> **2026-08-04 产品决策：暂停小程序训练页攻坚，优先做完 App。**  
> 代码保留，不删；恢复时从本文 + `docs/progress.json` backlog `MP-FPS` 接续。  
> 开工前仍须按项目规则先读 `docs/PRD.md` → `docs/MODULES.md` → `docs/VERIFICATION.md`。

## 一、暂停时状态

- 原生推理已达标：`onnx-p0`，全身时 FPS≈22–25 / inferMs≈22–28（KPI-002 小程序列已摸到）。
- 未收尾：canvas 自绘对齐、触摸、站位 gating 改过后仍有真机问题；最近一次为站位未 ok 时 `validation.results` 缺失导致崩帧（已修字段，但用户决定不再继续验小程序）。
- 根因纪要：`<camera>` 预览 ≠ `onCameraFrame` 缓冲；cover 叠预览会漂 → 曾改为 canvas 自绘 snapshot。

## 二、已改文件（冻结，勿当完成）

- `packages/pose-mp/wechat/movenetRuntime.cjs`（主干 ONNX + `decodeMoveNetHeads`）
- `apps/miniprogram/packageTrain/utils/canvasOverlay.js`
- `apps/miniprogram/packageTrain/pages/training/training.js|.wxml|.wxss`
- 模型备份：`.local/models/movenet-lightning-backbone-fp32.onnx`（gitignore）
- LAN 临时服：`python3 -m http.server 8787` + `NATIVE_MODEL_URLS`

## 三、恢复小程序时首要事项

1. 真机复验：自绘帧是否与骨骼重合；翻转/结束；`mir:` 常驻。
2. 模型迁正式托管（云存储），去掉局域网 IP。
3. 拆临时诊断（tapDebug 等）。
4. 产品定位：轻量训练 vs 仅引流（见 2026-07-31 评估结论）。

## 四、当前焦点

**App 主路径**（PRD §5.1 体验主阵地）。小程序 US-007 暂不阻塞 App 上线准备。
