#!/usr/bin/env bash
# 训练分包 npm 后处理：shim + 瘦身 TFJS（单分包源码硬顶 2MB）
# 「构建 npm」会清空产物 —— 之后必须再跑本脚本。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRAIN="$ROOT/packageTrain"
LEGACY_NPM="$ROOT/miniprogram_npm"
cd "$TRAIN"
mkdir -p miniprogram_npm

write_pkg() {
  local dir="$1" name="$2"
  printf '%s\n' "{
  \"name\": \"$name\",
  \"version\": \"4.22.0\",
  \"main\": \"index.js\",
  \"miniprogram\": \".\"
}" > "$dir/package.json"
}

# 1) 种子：仅 WebGL 路径需要的包（不含 cpu，省 ~500KB+）
NEED_TF=(tfjs-core tfjs-backend-webgl tfjs-converter tfjs-backend-webgpu)
seed_tfjs() {
  if [ -f miniprogram_npm/@tensorflow/tfjs-core/index.js ] \
    && [ -f miniprogram_npm/@tensorflow/tfjs-backend-webgl/index.js ]; then
    return 0
  fi
  if [ ! -d "$LEGACY_NPM/@tensorflow/tfjs-core" ]; then
    echo "ERROR: 缺少 TFJS 种子（根目录 miniprogram_npm）。"
    return 1
  fi
  echo "Seeding slim TFJS → packageTrain…"
  mkdir -p miniprogram_npm/@tensorflow
  for p in "${NEED_TF[@]}"; do
    if [ -d "$LEGACY_NPM/@tensorflow/$p" ]; then
      rm -rf "miniprogram_npm/@tensorflow/$p"
      mkdir -p "miniprogram_npm/@tensorflow/$p"
      cp "$LEGACY_NPM/@tensorflow/$p/index.js" "miniprogram_npm/@tensorflow/$p/index.js"
      write_pkg "miniprogram_npm/@tensorflow/$p" "@tensorflow/$p"
    fi
  done
  for dep in long node-fetch tr46 webidl-conversions whatwg-url; do
    if [ -d "$LEGACY_NPM/$dep" ]; then
      rm -rf "miniprogram_npm/$dep"
      mkdir -p "miniprogram_npm/$dep"
      cp "$LEGACY_NPM/$dep/index.js" "miniprogram_npm/$dep/index.js"
      write_pkg "miniprogram_npm/$dep" "$dep"
    fi
  done
}
seed_tfjs

# 2) 强制瘦身：删 cpu / seedrandom / 嵌套副本 / source map
rm -rf miniprogram_npm/@tensorflow/tfjs-backend-cpu
rm -rf miniprogram_npm/seedrandom
# 清掉误嵌在 @tensorflow/* 下的传递依赖副本；只留 index.js + package.json
for host in tfjs-core tfjs-backend-webgl tfjs-converter tfjs-backend-webgpu; do
  d="miniprogram_npm/@tensorflow/$host"
  [ -d "$d" ] || continue
  for junk in seedrandom node-fetch long tr46 whatwg-url webidl-conversions; do
    rm -rf "$d/$junk" "$d/${junk}.js"
  done
  for entry in "$d"/*; do
    base=$(basename "$entry")
    case "$base" in
      index.js|package.json) ;;
      *) rm -rf "$entry" ;;
    esac
  done
  [ -f "$d/index.js" ] && write_pkg "$d" "@tensorflow/$host"
done
# 删残余 .map（不用 find -exec，兼容沙箱）
python3 - <<'PY'
import os
for dp, _, fns in os.walk("miniprogram_npm"):
    for fn in fns:
        if fn.endswith(".map"):
            os.remove(os.path.join(dp, fn))
PY

# 3) MediaPipe / WebGPU shim
mkdir -p miniprogram_npm/@mediapipe/pose
mkdir -p miniprogram_npm/@tensorflow/tfjs-backend-webgpu
cp "$ROOT/vendor/mediapipe-pose-shim/index.js" miniprogram_npm/@mediapipe/pose/index.js
cp "$ROOT/vendor/mediapipe-pose-shim/package.json" miniprogram_npm/@mediapipe/pose/package.json
cp "$ROOT/vendor/tfjs-backend-webgpu-shim/index.js" miniprogram_npm/@tensorflow/tfjs-backend-webgpu/index.js
cp "$ROOT/vendor/tfjs-backend-webgpu-shim/package.json" miniprogram_npm/@tensorflow/tfjs-backend-webgpu/package.json

# 4) WebGL：若分包 node_modules 有更新产物则覆盖
WEBGL_SRC="node_modules/@tensorflow/tfjs-backend-webgl/dist/miniprogram/index.js"
if [ -f "$WEBGL_SRC" ]; then
  mkdir -p miniprogram_npm/@tensorflow/tfjs-backend-webgl
  cp "$WEBGL_SRC" miniprogram_npm/@tensorflow/tfjs-backend-webgl/index.js
  write_pkg miniprogram_npm/@tensorflow/tfjs-backend-webgl "@tensorflow/tfjs-backend-webgl"
  echo "Synced tfjs-backend-webgl from packageTrain/node_modules"
fi

# 5) @fitness-coach/*
if [ ! -f miniprogram_npm/@fitness-coach/core/index.js ] \
  || [ ! -f miniprogram_npm/@fitness-coach/pose-mp/index.js ] \
  || [ ! -f miniprogram_npm/@fitness-coach/render/index.js ]; then
  echo "WARN: @fitness-coach/* 缺失，自动重新 bundle…"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 || true
  node "$ROOT/scripts/bundle-workspace.mjs"
fi

if [ ! -f miniprogram_npm/@tensorflow/tfjs-core/index.js ] \
  || [ ! -f miniprogram_npm/@tensorflow/tfjs-backend-webgl/index.js ]; then
  echo "FAIL: slim TFJS incomplete"
  exit 1
fi
if [ -d miniprogram_npm/@tensorflow/tfjs-backend-cpu ]; then
  echo "FAIL: cpu backend must not ship (2MB subpackage cap)"
  exit 1
fi

BYTES=$(
  python3 - <<'PY'
import os
total = 0
for dp, dns, fns in os.walk("."):
    if "node_modules" in dp.split(os.sep):
        continue
    for fn in fns:
        if fn.endswith(".map"):
            continue
        total += os.path.getsize(os.path.join(dp, fn))
print(total)
PY
)
KB=$((BYTES / 1024))
echo "OK packageTrain slim ~${KB}KB (limit 2048KB source)"
ls miniprogram_npm/@fitness-coach/ 2>/dev/null || true
ls miniprogram_npm/@tensorflow/ 2>/dev/null || true
if [ "$KB" -gt 2048 ]; then
  echo "FAIL: still over 2048KB source"
  exit 1
fi
