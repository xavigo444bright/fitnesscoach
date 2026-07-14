#!/usr/bin/env bash
# 微信「构建 npm」常漏掉 shim 的 package.json，构建后执行本脚本。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p miniprogram_npm/@mediapipe/pose
mkdir -p miniprogram_npm/@tensorflow/tfjs-backend-webgpu

cp vendor/mediapipe-pose-shim/index.js miniprogram_npm/@mediapipe/pose/index.js
cp vendor/mediapipe-pose-shim/package.json miniprogram_npm/@mediapipe/pose/package.json

cp vendor/tfjs-backend-webgpu-shim/index.js miniprogram_npm/@tensorflow/tfjs-backend-webgpu/index.js
cp vendor/tfjs-backend-webgpu-shim/package.json miniprogram_npm/@tensorflow/tfjs-backend-webgpu/package.json

# WebGL backend：微信「构建 npm」有时漏掉，手动补微信专用入口（仅外链 tfjs-core）
WEBGL_SRC="node_modules/@tensorflow/tfjs-backend-webgl/dist/miniprogram/index.js"
if [ -f "$WEBGL_SRC" ]; then
  mkdir -p miniprogram_npm/@tensorflow/tfjs-backend-webgl
  cp "$WEBGL_SRC" miniprogram_npm/@tensorflow/tfjs-backend-webgl/index.js
  [ -f "$WEBGL_SRC.map" ] && cp "$WEBGL_SRC.map" miniprogram_npm/@tensorflow/tfjs-backend-webgl/index.js.map || true
  echo "Synced tfjs-backend-webgl into miniprogram_npm"
else
  echo "WARN: $WEBGL_SRC 不存在，先 npm i @tensorflow/tfjs-backend-webgl"
fi

echo "Synced shims into miniprogram_npm:"
ls -la miniprogram_npm/@mediapipe/pose/
ls -la miniprogram_npm/@tensorflow/tfjs-backend-webgpu/
