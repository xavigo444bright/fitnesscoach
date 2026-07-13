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

echo "Synced shims into miniprogram_npm:"
ls -la miniprogram_npm/@mediapipe/pose/
ls -la miniprogram_npm/@tensorflow/tfjs-backend-webgpu/
