# 模型不打进主包

微信真机调试主包上限 **2MB**（错误码 80051）。MoveNet 权重约 4.5MB，因此：

- **不要**把 `*.bin` / `model.json` 放进小程序代码包
- 运行时下载到 `wx.env.USER_DATA_PATH/movenet-lightning/` 并缓存

相关逻辑见 `utils/poseSpike.js`（`nhwc-v8`）。
