/**
 * @fitness-coach/pose-mp WeChat MoveNet runtime（M2B-T2，自 apps/miniprogram/utils/poseSpike 迁入）
 * 方案 A：TFJS + MoveNet Lightning；直接 loadGraphModel，手动喂 [1,192,192,3]。
 *
 * PREPROCESS_VERSION：真机 status 里应能看到；若仍是旧文案说明未刷新到本文件。
 */

let runtimePromise = null;

const PREPROCESS_VERSION = 'nhwc-v14-native';
/** 用户文件目录缓存（不进主包，避免 80051 超 2MB） */
const MODEL_CACHE_DIR_NAME = 'movenet-lightning';
const MODEL_FILES = ['model.json', 'group1-shard1of2.bin', 'group1-shard2of2.bin'];
const REMOTE_MODEL_BASE =
  'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';
const INPUT_SIZE = 192;
const EXPECTED_INPUT_SHAPE = [1, INPUT_SIZE, INPUT_SIZE, 3];
const NUM_KEYPOINTS = 17;
const FETCH_TIMEOUT_MS = 60000;
/** CPU 端 MoveNet 在真机常 >60s 堵死主线程；优先 WebGL */
const PREFER_WEBGL = true;
/**
 * 快照阶段先把长边压到此值再喂 192（MP-FPS）。
 * 减少 RGBA 全帧拷贝 + JS resize 带宽；坐标仍相对 snapshot 尺寸。
 */
const SNAPSHOT_MAX_SIDE = 256;

/**
 * MP-FPS 方案 A：微信原生推理 wx.createInferenceSession（基础库 ≥2.30.0）。
 * TFJS-WebGL execute ~220-350ms 已到上限；原生通道公开对比可到 ~20ms 级。
 * 模型：MoveNet Lightning ONNX（input INT32 [1,192,192,3] → output_0 FLOAT [1,1,17,3]）。
 * 国内优先 hf-mirror；失败回退 TFJS。
 */
const NATIVE_MODEL_FILE_NAME = 'movenet-lightning-backbone-fp32-v3.onnx';
/**
 * Spike 阶段临时用开发机局域网托管（手机与 Mac 同 Wi-Fi + 不校验域名）。
 * xnet 不支持 MoveNet 解码段的 ArgMax/GatherND（error:6），已把模型
 * 切到主干（只剩 Conv/BN/Resize 等常规算子，输出 4 个头），
 * 热力图解码在 JS 侧完成（decodeMoveNetHeads，与完整模型 diff≈6e-8）。
 * 上线前迁自有 CDN 并加入 downloadFile 合法域名。
 */
const NATIVE_MODEL_URLS = [
  'http://192.168.31.65:8787/movenet-lightning-backbone-fp32.onnx',
];
/** 实测约 9.4MB；小于该值视为半截文件重下 */
const NATIVE_MODEL_MIN_BYTES = 9000000;
/** 0=最低精度最快（fp16/近似 math）；姿态点不够准再升到 2/4 */
const NATIVE_PRECISION_LEVEL = 0;
const NATIVE_INPUT_NAME = 'input_fp32';
/** 主干 4 头：中心热力图 [1,2304,1]、回归 [1,48,48,34]、关键点热力图 [1,48,48,17]、偏移 [1,48,48,34] */
const NATIVE_OUTPUT_NAMES = ['out_center', 'out_regress', 'out_heatmap', 'out_offset'];
const NATIVE_GRID = 48;
/** 原生 run 失败后拉黑，重建为 TFJS */
let forceTfjs = false;

/** 复用 resize 输出，避免每帧 new Int32Array(192*192*3) */
let pooledFlat = null;
/** 原生路径：直接填 Float32（免 Int32→Float32 整包转换）；双缓冲防引擎异步持有 */
let pooledF32A = null;
let pooledF32B = null;
let pooledF32Flip = false;
/** 尺寸稳定时缓存 nearest 映射 */
let mapW = 0;
let mapH = 0;
let mapX = null;
let mapY = null;

/**
 * 微信环境常见：模型 attr 字符串被解成字节数组或 "78,72,87,67" 这种伪字符串
 * （NHWC / SAME 的 charCode）。一律还原成文本，再按 TFJS 惯例 toLowerCase。
 */
function repairAttrString(value) {
  if (value == null) return null;
  let codes = null;
  if (typeof value === 'string') {
    if (!/^\d+(,\d+)+$/.test(value)) return null;
    codes = value.split(',').map(function (x) {
      return Number(x);
    });
  } else if (ArrayBuffer.isView(value) || Array.isArray(value)) {
    codes = Array.prototype.slice.call(value);
  } else {
    return null;
  }
  if (
    !codes.length ||
    !codes.every(function (n) {
      return Number.isInteger(n) && n >= 0 && n <= 255;
    })
  ) {
    return null;
  }
  // 只修可打印 ASCII（模型里的 NHWC / SAME / VALID 等）
  if (
    !codes.every(function (n) {
      return n >= 32 && n <= 126;
    })
  ) {
    return null;
  }
  return String.fromCharCode.apply(null, codes);
}

/**
 * 加载后扫一遍图节点字符串属性：还原被 WeChat Buffer/atob 弄坏的 pad、dataFormat 等。
 */
function fixGraphStringAttrs(model) {
  const executor = model && model.executor;
  const nodes = executor && executor.graph && executor.graph.nodes;
  if (!nodes) {
    throw new Error(
      `[${PREPROCESS_VERSION}] 无法访问 model.executor.graph.nodes`,
    );
  }
  const fixedKeys = {};
  let fixed = 0;
  Object.keys(nodes).forEach(function (name) {
    const attrs = nodes[name] && nodes[name].attrParams;
    if (!attrs) return;
    Object.keys(attrs).forEach(function (key) {
      const attr = attrs[key];
      if (!attr || attr.value === undefined) return;
      const repaired = repairAttrString(attr.value);
      if (repaired == null) return;
      // 与 TFJS getStringParam(keepCase=false) 一致；dataFormat 执行时会再 toUpperCase
      attr.value = repaired.toLowerCase();
      fixedKeys[key] = (fixedKeys[key] || 0) + 1;
      fixed += 1;
    });
  });
  return { fixed: fixed, fixedKeys: fixedKeys };
}
const COCO_KEYPOINTS = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

function wechatFetch(url, init) {
  return new Promise((resolve, reject) => {
    const method = (init && init.method) || 'GET';
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(arg);
    };
    const timer = setTimeout(() => {
      try {
        if (req && typeof req.abort === 'function') req.abort();
      } catch (e) {
        // ignore
      }
      finish(reject, new Error(`wx.request 超时 ${FETCH_TIMEOUT_MS}ms: ${url}`));
    }, FETCH_TIMEOUT_MS);
    const req = wx.request({
      url,
      method,
      data: init && init.body,
      header: (init && init.headers) || {},
      responseType: 'arraybuffer',
      timeout: FETCH_TIMEOUT_MS,
      success(res) {
        const headers = res.header || {};
        finish(resolve, {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: String(res.statusCode),
          json() {
            return Promise.resolve(JSON.parse(arrayBufferToString(res.data)));
          },
          arrayBuffer() {
            return Promise.resolve(res.data);
          },
          text() {
            return Promise.resolve(arrayBufferToString(res.data));
          },
          headers: {
            get(key) {
              const found = Object.keys(headers).find(
                (k) => k.toLowerCase() === String(key).toLowerCase(),
              );
              return found ? headers[found] : null;
            },
          },
        });
      },
      fail(err) {
        finish(reject, err || new Error('wx.request failed: ' + url));
      },
    });
  });
}

function arrayBufferToString(buffer) {
  if (typeof buffer === 'string') return buffer;
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    }
  } catch (e) {
    // fall through
  }
  const arr = new Uint8Array(buffer);
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    out += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return out;
}

function utf8Encode(text) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const utf8 = unescape(encodeURIComponent(text));
  const result = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i += 1) {
    result[i] = utf8.charCodeAt(i);
  }
  return result;
}

function utf8Decode(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
}

function getGlobalObject() {
  if (typeof globalThis !== 'undefined' && globalThis) return globalThis;
  if (typeof global !== 'undefined' && global) return global;
  if (typeof wx !== 'undefined') return wx;
  return {};
}

function polyfillBase64() {
  const g = getGlobalObject();

  function atobPolyfill(base64) {
    const cleaned = String(base64).replace(/[\n\r\s]/g, '');
    if (typeof wx !== 'undefined' && typeof wx.base64ToArrayBuffer === 'function') {
      const buffer = wx.base64ToArrayBuffer(cleaned);
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return binary;
    }
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');
    let output = '';
    let i = 0;
    while (i < str.length) {
      const enc1 = chars.indexOf(str.charAt(i++));
      const enc2 = chars.indexOf(str.charAt(i++));
      const enc3 = chars.indexOf(str.charAt(i++));
      const enc4 = chars.indexOf(str.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) output += String.fromCharCode(chr2);
      if (enc4 !== 64 && enc4 !== -1) output += String.fromCharCode(chr3);
    }
    return output;
  }

  function btoaPolyfill(binary) {
    const input = String(binary);
    if (typeof wx !== 'undefined' && typeof wx.arrayBufferToBase64 === 'function') {
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        bytes[i] = input.charCodeAt(i) & 0xff;
      }
      return wx.arrayBufferToBase64(bytes.buffer);
    }
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    while (i < input.length) {
      const chr1 = input.charCodeAt(i++);
      const chr2 = input.charCodeAt(i++);
      const chr3 = input.charCodeAt(i++);
      const enc1 = chr1 >> 2;
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      let enc4 = chr3 & 63;
      if (Number.isNaN(chr2)) {
        enc3 = 64;
        enc4 = 64;
      } else if (Number.isNaN(chr3)) {
        enc4 = 64;
      }
      output +=
        chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    return output;
  }

  try {
    if (typeof g.atob !== 'function') g.atob = atobPolyfill;
    if (typeof g.btoa !== 'function') g.btoa = btoaPolyfill;
  } catch (e) {
    console.warn('[poseSpike] cannot assign atob/btoa', e);
  }

  if (typeof g.Buffer !== 'function') {
    try {
      function BufferPolyfill(value, encoding) {
        let bytes;
        if (typeof value === 'number') {
          bytes = new Uint8Array(value);
        } else if (encoding === 'base64' && typeof value === 'string') {
          const binary = atobPolyfill(value);
          bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i) & 0xff;
          }
        } else if (typeof value === 'string') {
          bytes = utf8Encode(value);
        } else if (value instanceof ArrayBuffer) {
          bytes = new Uint8Array(value);
        } else if (ArrayBuffer.isView(value)) {
          bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        } else if (Array.isArray(value)) {
          bytes = new Uint8Array(value);
        } else {
          bytes = new Uint8Array(0);
        }
        // 关键：必须返回带正确 toString 的对象。
        // 若直接返回 Uint8Array，TFJS decodeBase64 的 .toString() 会得到 "78,72,87,67"
        // 从而把 NHWC/SAME 弄成伪字符串，Conv2D 随后 depth/pad 全错。
        const buf = bytes;
        buf.toString = function bufferToString(enc) {
          if (enc === 'base64') {
            return btoaPolyfill(
              String.fromCharCode.apply(
                null,
                Array.prototype.slice.call(buf),
              ),
            );
          }
          return utf8Decode(buf);
        };
        return buf;
      }
      BufferPolyfill.from = function from(value, encoding) {
        return BufferPolyfill(value, encoding);
      };
      BufferPolyfill.isBuffer = function isBuffer() {
        return false;
      };
      BufferPolyfill.alloc = function alloc(size) {
        return BufferPolyfill(size || 0);
      };
      g.Buffer = BufferPolyfill;
    } catch (e) {
      console.warn('[poseSpike] cannot assign Buffer', e);
    }
  }
}

function setupWechatPlatform(tf) {
  polyfillBase64();
  // TFJS decodeBase64 用的是 env().global，必须与 polyfill 同源
  try {
    const envGlobal = tf.env && tf.env().global;
    if (envGlobal) {
      const g = getGlobalObject();
      if (typeof envGlobal.atob !== 'function' && typeof g.atob === 'function') {
        envGlobal.atob = g.atob;
      }
      if (typeof envGlobal.btoa !== 'function' && typeof g.btoa === 'function') {
        envGlobal.btoa = g.btoa;
      }
      if (typeof envGlobal.Buffer !== 'function' && typeof g.Buffer === 'function') {
        envGlobal.Buffer = g.Buffer;
      }
    }
  } catch (e) {
    console.warn('[poseSpike] cannot sync tf.env().global polyfills', e);
  }
  const platform = {
    fetch: wechatFetch,
    now: function now() {
      return Date.now();
    },
    encode: function encode(text) {
      return utf8Encode(text);
    },
    decode: function decode(bytes) {
      return utf8Decode(bytes);
    },
    isTypedArray: function isTypedArray(a) {
      return (
        a instanceof Float32Array ||
        a instanceof Int32Array ||
        a instanceof Uint8Array ||
        a instanceof Uint8ClampedArray
      );
    },
  };
  if (typeof tf.setPlatform === 'function') {
    tf.setPlatform('wechat', platform);
  } else if (tf.env && typeof tf.env().setPlatform === 'function') {
    tf.env().setPlatform('wechat', platform);
  } else {
    throw new Error('当前 tfjs-core 无 setPlatform');
  }
  const g = getGlobalObject();
  try {
    g.fetch = wechatFetch;
  } catch (e) {
    console.warn('[poseSpike] cannot assign global fetch', e);
  }
}

/**
 * 微信无 DOM canvas；需离屏 canvas + setWebGLContext，否则 webgl backend 会抛
 * “Cannot create a canvas in this context”。
 */
function createWechatWebGlContext() {
  if (typeof wx === 'undefined' || typeof wx.createOffscreenCanvas !== 'function') {
    throw new Error('当前基础库无 wx.createOffscreenCanvas');
  }
  let canvas;
  try {
    canvas = wx.createOffscreenCanvas({ type: 'webgl', width: 1, height: 1 });
  } catch (e1) {
    canvas = wx.createOffscreenCanvas(1, 1);
  }
  if (!canvas) throw new Error('createOffscreenCanvas 返回空');
  // TFJS canvas_util 会调用 addEventListener；微信离屏 canvas 常无此方法
  if (typeof canvas.addEventListener !== 'function') {
    canvas.addEventListener = function noopAddEventListener() {};
  }
  if (typeof canvas.removeEventListener !== 'function') {
    canvas.removeEventListener = function noopRemoveEventListener() {};
  }
  const attrs = {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    depth: false,
    stencil: false,
    failIfMajorPerformanceCaveat: false,
  };
  let gl = null;
  let version = 1;
  if (typeof canvas.getContext === 'function') {
    gl = canvas.getContext('webgl2', attrs);
    if (gl) version = 2;
    if (!gl) gl = canvas.getContext('webgl', attrs);
    if (!gl) gl = canvas.getContext('experimental-webgl', attrs);
  }
  if (!gl) throw new Error('离屏 canvas 无法取得 webgl 上下文（请开开发者工具「硬件加速」）');
  return { canvas: canvas, gl: gl, version: version };
}

async function initBackend(tf, report) {
  // 分包硬顶 2MB：不打进 tfjs-backend-cpu（~477KB+seedrandom）。真机走 WebGL（Spike 已验证）。
  let webglMod = null;
  try {
    webglMod = requireTensorflow('@tensorflow/tfjs-backend-webgl');
  } catch (e) {
    throw new Error(
      '缺少 @tensorflow/tfjs-backend-webgl：' + ((e && e.message) || e),
    );
  }

  report('初始化 WebGL…');
  const ctx = createWechatWebGlContext();
  if (typeof webglMod.setWebGLContext !== 'function') {
    throw new Error('webgl 包无 setWebGLContext 导出');
  }
  webglMod.setWebGLContext(ctx.version, ctx.gl);
  try {
    tf.env().set('WEBGL_VERSION', ctx.version);
  } catch (e) {
    // ignore
  }

  // 微信 device_util.isBrowser()===false，webgl 包的自动 registerBackend
  // 被守卫跳过（→ "backend name 'webgl' not found in registry"）。手动注册。
  if (typeof tf.findBackendFactory !== 'function' || !tf.findBackendFactory('webgl')) {
    if (!webglMod.MathBackendWebGL) {
      throw new Error('webgl 包未导出 MathBackendWebGL，无法手动注册');
    }
    const makeBackend = function makeWebglBackend() {
      if (webglMod.GPGPUContext) {
        return new webglMod.MathBackendWebGL(
          new webglMod.GPGPUContext(ctx.gl),
        );
      }
      return new webglMod.MathBackendWebGL();
    };
    tf.registerBackend('webgl', makeBackend, 2);
  }

  const okGl = await tf.setBackend('webgl');
  if (!okGl || tf.getBackend() !== 'webgl') {
    throw new Error(
      'WebGL backend 不可用（分包未含 CPU 回退）。请开开发者工具「硬件加速」。当前=' +
        tf.getBackend(),
    );
  }
  await tf.ready();
  try {
    // 打包/卷积常见加速开关（不支持则忽略）
    if (tf.env && typeof tf.env().set === 'function') {
      tf.env().set('WEBGL_PACK', true);
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    }
  } catch (e) {
    // ignore
  }
  return { backend: 'webgl', note: 'webgl-' + ctx.version };
}

/**
 * 微信：从 miniprogram_npm/@fitness-coach/pose-mp 里 require('@tensorflow/…')
 * 常解析成 …/pose-mp/@tensorflow/…（not defined）。相对路径指向分包根 npm。
 */
function requireTensorflow(pkg) {
  const short = String(pkg).replace(/^@tensorflow\//, '');
  const relatives = [
    '../../@tensorflow/' + short + '/index.js',
    '../../../miniprogram_npm/@tensorflow/' + short + '/index.js',
  ];
  let lastErr = null;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(pkg);
  } catch (e) {
    lastErr = e;
  }
  for (let i = 0; i < relatives.length; i++) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(relatives[i]);
    } catch (e2) {
      lastErr = e2;
    }
  }
  throw lastErr || new Error('无法加载 ' + pkg);
}

function tryRequire(name) {
  try {
    requireTensorflow(name);
    return true;
  } catch (e) {
    console.warn('[poseSpike] require failed:', name, e && e.message);
    return false;
  }
}

function assertInputShape(tensor, where) {
  const shape = tensor && tensor.shape;
  const ok =
    Array.isArray(shape) &&
    shape.length === 4 &&
    shape[0] === EXPECTED_INPUT_SHAPE[0] &&
    shape[1] === EXPECTED_INPUT_SHAPE[1] &&
    shape[2] === EXPECTED_INPUT_SHAPE[2] &&
    shape[3] === EXPECTED_INPUT_SHAPE[3];
  if (!ok) {
    throw new Error(
      `[${PREPROCESS_VERSION}] ${where} 形状错误: [${
        shape ? shape.join(',') : '?'
      }]，需要 [${EXPECTED_INPUT_SHAPE.join(',')}]`,
    );
  }
}

function copyCameraRgba(frame) {
  const width = frame.width | 0;
  const height = frame.height | 0;
  if (width <= 0 || height <= 0) {
    throw new Error(`非法帧尺寸: ${width}x${height}`);
  }
  // 微信会复用 ArrayBuffer，必须立刻拷贝
  const view = new Uint8Array(frame.data);
  const expected = width * height * 4;
  if (view.byteLength < expected) {
    throw new Error(
      `相机帧字节不足: ${view.byteLength} < ${expected} (${width}x${height})`,
    );
  }
  const src = new Uint8Array(expected);
  src.set(view.subarray(0, expected));
  return { width, height, src };
}

/** 已 snapshot 的帧不再二次拷贝 */
function rgbaSource(frame) {
  if (frame && frame.__copied && frame.data) {
    const width = frame.width | 0;
    const height = frame.height | 0;
    const src =
      frame.data instanceof Uint8Array
        ? frame.data
        : new Uint8Array(frame.data);
    return { width, height, src };
  }
  return copyCameraRgba(frame);
}

function ensureResizeMaps(width, height) {
  if (mapW === width && mapH === height && mapX && mapY) return;
  mapW = width;
  mapH = height;
  mapX = new Int32Array(INPUT_SIZE);
  mapY = new Int32Array(INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE; i += 1) {
    mapX[i] = Math.min(width - 1, Math.floor((i * width) / INPUT_SIZE));
    mapY[i] = Math.min(height - 1, Math.floor((i * height) / INPUT_SIZE));
  }
}

function getPooledFlat() {
  const n = INPUT_SIZE * INPUT_SIZE * 3;
  if (!pooledFlat || pooledFlat.length !== n) {
    pooledFlat = new Int32Array(n);
  }
  return pooledFlat;
}

/** 原生路径：nearest resize → 复用的 Float32Array（NHWC RGB，0-255）。 */
function fillPooledFlatF32(frame) {
  const { width, height, src } = rgbaSource(frame);
  ensureResizeMaps(width, height);
  const n = INPUT_SIZE * INPUT_SIZE * 3;
  if (!pooledF32A) {
    pooledF32A = new Float32Array(n);
    pooledF32B = new Float32Array(n);
  }
  pooledF32Flip = !pooledF32Flip;
  const flat = pooledF32Flip ? pooledF32A : pooledF32B;
  const rowBytes = width * 4;
  for (let y = 0; y < INPUT_SIZE; y += 1) {
    const sy = mapY[y];
    const row = sy * rowBytes;
    const diRow = y * INPUT_SIZE * 3;
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      const si = row + mapX[x] * 4;
      const di = diRow + x * 3;
      flat[di] = src[si];
      flat[di + 1] = src[si + 1];
      flat[di + 2] = src[si + 2];
    }
  }
  return flat;
}

/** 纯 JS nearest resize → 复用的 Int32Array（NHWC RGB，0-255）。 */
function fillPooledFlat(frame) {
  const { width, height, src } = rgbaSource(frame);
  ensureResizeMaps(width, height);
  const flat = getPooledFlat();
  const rowBytes = width * 4;
  for (let y = 0; y < INPUT_SIZE; y += 1) {
    const sy = mapY[y];
    const row = sy * rowBytes;
    const diRow = y * INPUT_SIZE * 3;
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      const si = row + mapX[x] * 4;
      const di = diRow + x * 3;
      flat[di] = src[si];
      flat[di + 1] = src[si + 1];
      flat[di + 2] = src[si + 2];
    }
  }
  return flat;
}

/**
 * NHWC int32 [1,192,192,3] 输入张量（TFJS 路径）。
 * 微信包里 tensor1d().reshape 可能不是函数，改用 tf.tensor(values, shape)。
 */
function frameToInputTensor(tf, frame) {
  const flat = fillPooledFlat(frame);

  let input = null;
  if (typeof tf.tensor === 'function') {
    input = tf.tensor(flat, EXPECTED_INPUT_SHAPE, 'int32');
  } else if (typeof tf.tensor4d === 'function') {
    input = tf.tensor4d(flat, EXPECTED_INPUT_SHAPE, 'int32');
  } else {
    // 兜底：函数式 reshape（不用实例方法）
    const t1 = tf.tensor1d(flat, 'int32');
    input = tf.reshape(t1, EXPECTED_INPUT_SHAPE);
    t1.dispose();
  }
  assertInputShape(input, 'frameToInputTensor');
  if (input.shape[3] !== 3) {
    input.dispose();
    throw new Error(
      `[${PREPROCESS_VERSION}] 通道维不是 3（got ${input.shape[3]}），拒绝推理`,
    );
  }
  return input;
}

function resolveInputName(model) {
  const inputs = model && model.inputs;
  if (Array.isArray(inputs) && inputs.length > 0) {
    const name = inputs[0] && (inputs[0].name || inputs[0]);
    if (typeof name === 'string' && name.length > 0) {
      // GraphModel 有时带 :0 后缀
      return name.replace(/:0$/, '') === 'input' ? 'input' : name;
    }
  }
  return 'input';
}

function runMoveNet(model, input) {
  assertInputShape(input, 'runMoveNet');
  const inputName = resolveInputName(model);
  // 优先按签名名字喂入，避免单 tensor 位置映射在部分 runtime 上错位
  try {
    return model.execute({ [inputName]: input });
  } catch (e1) {
    try {
      return model.execute({ input: input });
    } catch (e2) {
      try {
        return model.execute(input);
      } catch (e3) {
        const detail = [
          `shape=[${input.shape.join(',')}]`,
          `dtype=${input.dtype}`,
          `inputName=${inputName}`,
          `e1=${(e1 && e1.message) || e1}`,
          `e3=${(e3 && e3.message) || e3}`,
        ].join(' | ');
        throw new Error(`[${PREPROCESS_VERSION}] MoveNet execute 失败: ${detail}`);
      }
    }
  }
}

/** 预热：编译 WebGL shader，避免首帧尖刺（MP-FPS） */
function warmUpMoveNet(tf, model) {
  const input = tf.zeros(EXPECTED_INPUT_SHAPE, 'int32');
  let output = null;
  try {
    output = runMoveNet(model, input);
    const outTensor = Array.isArray(output) ? output[0] : output;
    if (outTensor && typeof outTensor.dataSync === 'function') {
      outTensor.dataSync();
    }
  } finally {
    input.dispose();
    if (Array.isArray(output)) {
      output.forEach(function (t) {
        if (t && typeof t.dispose === 'function') t.dispose();
      });
    } else if (output && typeof output.dispose === 'function') {
      output.dispose();
    }
  }
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} 超时 ${ms}ms`));
    }, ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function getModelCacheDir() {
  return wx.env.USER_DATA_PATH + '/' + MODEL_CACHE_DIR_NAME;
}

function ensureDir(dirPath) {
  const fs = wx.getFileSystemManager();
  try {
    fs.accessSync(dirPath);
  } catch (e) {
    fs.mkdirSync(dirPath, true);
  }
}

function fileExists(filePath) {
  try {
    wx.getFileSystemManager().accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

function readUserFile(filePath, encoding) {
  return new Promise((resolve, reject) => {
    const opts = {
      filePath: filePath,
      success(res) {
        resolve(res.data);
      },
      fail(err) {
        reject(err || new Error('readFile failed: ' + filePath));
      },
    };
    if (encoding) opts.encoding = encoding;
    wx.getFileSystemManager().readFile(opts);
  });
}

function downloadToCache(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const task = wx.downloadFile({
      url: url,
      filePath: destPath,
      timeout: FETCH_TIMEOUT_MS,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('download HTTP ' + res.statusCode + ': ' + url));
          return;
        }
        resolve(destPath);
      },
      fail(err) {
        // 旧基础库不支持 filePath 时回退
        wx.downloadFile({
          url: url,
          timeout: FETCH_TIMEOUT_MS,
          success(res2) {
            if (res2.statusCode < 200 || res2.statusCode >= 300) {
              reject(new Error('download HTTP ' + res2.statusCode + ': ' + url));
              return;
            }
            try {
              wx.getFileSystemManager().copyFileSync(res2.tempFilePath, destPath);
              resolve(destPath);
            } catch (e) {
              reject(e || err);
            }
          },
          fail(err2) {
            reject(err2 || err || new Error('downloadFile failed: ' + url));
          },
        });
      },
    });
    if (task && typeof task.onProgressUpdate === 'function' && onProgress) {
      task.onProgressUpdate((p) => {
        onProgress(p.progress || 0);
      });
    }
  });
}

function remoteFileUrl(name) {
  return REMOTE_MODEL_BASE + '/' + name + '?tfjs-format=file';
}

async function ensureModelCached(onProgress) {
  const dir = getModelCacheDir();
  ensureDir(dir);
  const missing = MODEL_FILES.filter(function (name) {
    return !fileExists(dir + '/' + name);
  });
  if (missing.length === 0) {
    if (onProgress) onProgress('使用已缓存模型');
    return { dir: dir, downloaded: false };
  }

  for (let i = 0; i < missing.length; i += 1) {
    const name = missing[i];
    const dest = dir + '/' + name;
    if (onProgress) onProgress('下载 ' + name + ' (' + (i + 1) + '/' + missing.length + ')…');
    // eslint-disable-next-line no-await-in-loop
    await withTimeout(
      downloadToCache(remoteFileUrl(name), dest, function (pct) {
        if (onProgress) onProgress('下载 ' + name + ' ' + pct + '%');
      }),
      FETCH_TIMEOUT_MS,
      '下载 ' + name,
    );
  }
  return { dir: dir, downloaded: true };
}

/** 从用户目录缓存读取 MoveNet */
function createCachedModelHandler(dir) {
  return {
    load: async function loadCachedModel() {
      const raw = await readUserFile(dir + '/model.json', 'utf8');
      const modelJSON =
        typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(arrayBufferToString(raw));
      const weightSpecs = [];
      const buffers = [];
      const manifest = modelJSON.weightsManifest || [];
      for (let i = 0; i < manifest.length; i += 1) {
        const group = manifest[i];
        const paths = group.paths || [];
        for (let j = 0; j < paths.length; j += 1) {
          // eslint-disable-next-line no-await-in-loop
          const bin = await readUserFile(dir + '/' + paths[j]);
          buffers.push(bin);
        }
        const weights = group.weights || [];
        for (let k = 0; k < weights.length; k += 1) {
          weightSpecs.push(weights[k]);
        }
      }
      let total = 0;
      for (let i = 0; i < buffers.length; i += 1) {
        total += buffers[i].byteLength;
      }
      const weightData = new Uint8Array(total);
      let offset = 0;
      for (let i = 0; i < buffers.length; i += 1) {
        weightData.set(new Uint8Array(buffers[i]), offset);
        offset += buffers[i].byteLength;
      }
      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs: weightSpecs,
        weightData: weightData.buffer,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
        signature: modelJSON.signature,
        userDefinedMetadata: modelJSON.userDefinedMetadata,
      };
    },
  };
}

async function createRuntime(onProgress) {
  const report = (msg) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress(msg);
      } catch (e) {
        // ignore UI errors
      }
    }
  };

  report('初始化 TF…');
  polyfillBase64();
  const tf = requireTensorflow('@tensorflow/tfjs-core');
  setupWechatPlatform(tf);

  tryRequire('@tensorflow/tfjs-converter');

  const backendInfo = await initBackend(tf, report);

  const tfconv = requireTensorflow('@tensorflow/tfjs-converter');

  report('准备模型缓存…');
  let cacheInfo;
  try {
    cacheInfo = await ensureModelCached(report);
  } catch (e) {
    throw new Error(
      `[${PREPROCESS_VERSION}] 模型下载失败: ${
        (e && e.errMsg) || (e && e.message) || e
      }｜请检查网络；模型约 4.5MB，首次需下载到本地缓存`,
    );
  }

  report('从缓存加载模型…');
  let model;
  try {
    model = await tfconv.loadGraphModel(createCachedModelHandler(cacheInfo.dir));
  } catch (e) {
    throw new Error(
      `[${PREPROCESS_VERSION}] 缓存模型加载失败: ${
        (e && e.message) || e
      }｜可删除小程序重开以重新下载`,
    );
  }

  report('修复模型字符串属性…');
  const attrFix = fixGraphStringAttrs(model);
  report('预热 WebGL…');
  try {
    warmUpMoveNet(tf, model);
  } catch (e) {
    // 预热失败不阻断；真机帧会再试
  }
  report('模型就绪（' + backendInfo.backend + '）');

  return {
    kind: 'tfjs',
    tf,
    model,
    backend: backendInfo.backend,
    backendNote: backendInfo.note,
    preprocessVersion: PREPROCESS_VERSION,
    attrFix: attrFix,
    modelSource: cacheInfo.downloaded ? 'download' : 'cache',
    smokeOk: true,
    smokeNote: 'warmed',
  };
}

/* ============ 原生推理（wx.createInferenceSession） ============ */

function supportsNativeInference() {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.createInferenceSession === 'function'
  );
}

async function ensureNativeModelFile(report) {
  const dir = getModelCacheDir();
  ensureDir(dir);
  const dest = dir + '/' + NATIVE_MODEL_FILE_NAME;
  if (fileExists(dest)) {
    try {
      const stat = wx.getFileSystemManager().statSync(dest);
      const size = stat && (stat.size || (stat.stats && stat.stats.size));
      if (size >= NATIVE_MODEL_MIN_BYTES) {
        report('使用已缓存 ONNX 模型');
        return dest;
      }
      wx.getFileSystemManager().unlinkSync(dest);
    } catch (e) {
      // 状态读不到就重下
    }
  }
  let lastErr = null;
  for (let i = 0; i < NATIVE_MODEL_URLS.length; i += 1) {
    const url = NATIVE_MODEL_URLS[i];
    try {
      report('下载 ONNX 模型（约9.4MB，' + (i + 1) + '/' + NATIVE_MODEL_URLS.length + '）…');
      // eslint-disable-next-line no-await-in-loop
      await withTimeout(
        downloadToCache(url, dest, function (pct) {
          report('下载 ONNX ' + pct + '%');
        }),
        FETCH_TIMEOUT_MS,
        '下载 ONNX',
      );
      return dest;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('ONNX 模型下载失败');
}

function createNativeSession(modelPath) {
  return new Promise(function (resolve, reject) {
    let settled = false;
    let session = null;
    const fail = function (err) {
      if (settled) return;
      settled = true;
      try {
        if (session && typeof session.destroy === 'function') session.destroy();
      } catch (e) {
        // ignore
      }
      reject(
        err instanceof Error
          ? err
          : new Error((err && (err.errMsg || err.message)) || String(err)),
      );
    };
    try {
      // xnet 把本模型 shape 解析为 0（报 Illegal input/output size），
      // 按其提示显式给 typicalShape（NHWC，与 ONNX 定义一致）
      const typicalShape = {};
      typicalShape[NATIVE_INPUT_NAME] = EXPECTED_INPUT_SHAPE.slice();
      session = wx.createInferenceSession({
        model: modelPath,
        precisionLevel: NATIVE_PRECISION_LEVEL,
        allowNPU: false,
        allowQuantize: false,
        typicalShape: typicalShape,
      });
    } catch (e) {
      fail(e);
      return;
    }
    if (!session) {
      fail(new Error('createInferenceSession 返回空'));
      return;
    }
    if (typeof session.onError === 'function') session.onError(fail);
    session.onLoad(function () {
      if (settled) return;
      settled = true;
      resolve(session);
    });
    setTimeout(function () {
      fail(new Error('原生 session 加载超时(30s)'));
    }, 30000);
  });
}

/**
 * MoveNet 解码（从 ONNX 剥离的后处理，已与完整模型数值对拍 diff≈6e-8）：
 * 1) 人体中心 argmax → 2) 中心处回归各关键点粗位置 →
 * 3) 热力图按 1/(dist+1.8) 加权后逐关键点 argmax → 4) 亚像素偏移，除以 48 归一化。
 * 返回 Float32Array[17*3]，布局 (y, x, score) 与原 output_0 一致。
 */
function decodeMoveNetHeads(center, regress, heatmap, offset) {
  const G = NATIVE_GRID;
  const K = NUM_KEYPOINTS;
  let ci = 0;
  let cv = -Infinity;
  for (let i = 0; i < G * G; i += 1) {
    if (center[i] > cv) {
      cv = center[i];
      ci = i;
    }
  }
  const cy = (ci / G) | 0;
  const cx = ci % G;

  const regBase = (cy * G + cx) * (K * 2);
  const ry = new Float32Array(K);
  const rx = new Float32Array(K);
  for (let k = 0; k < K; k += 1) {
    ry[k] = cy + regress[regBase + 2 * k];
    rx[k] = cx + regress[regBase + 2 * k + 1];
  }

  const bestIdx = new Int32Array(K);
  const bestVal = new Float64Array(K).fill(-Infinity);
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      const hBase = (y * G + x) * K;
      for (let k = 0; k < K; k += 1) {
        const h = heatmap[hBase + k];
        // 精确剪枝：h/(d+1.8) ≤ h/1.8，上界都赢不了就不必开方（首个最大值语义不变）
        if (h / 1.8 <= bestVal[k]) continue;
        const dy = y - ry[k];
        const dx = x - rx[k];
        const v = h / (Math.sqrt(dy * dy + dx * dx) + 1.8);
        if (v > bestVal[k]) {
          bestVal[k] = v;
          bestIdx[k] = y * G + x;
        }
      }
    }
  }

  const values = new Float32Array(K * 3);
  for (let k = 0; k < K; k += 1) {
    const py = (bestIdx[k] / G) | 0;
    const px = bestIdx[k] % G;
    const oBase = (py * G + px) * (K * 2);
    values[k * 3] = (py + offset[oBase + 2 * k]) / G;
    values[k * 3 + 1] = (px + offset[oBase + 2 * k + 1]) / G;
    values[k * 3 + 2] = heatmap[(py * G + px) * K + k];
  }
  return values;
}

function runNativeSession(session, f32Flat) {
  const inputs = {};
  inputs[NATIVE_INPUT_NAME] = {
    type: 'float32',
    // 双缓冲池化的 Float32Array，直接给 buffer 免拷贝
    data: f32Flat.buffer,
    shape: EXPECTED_INPUT_SHAPE,
  };
  return session.run(inputs);
}

async function createNativeRuntime(onProgress) {
  const report = function (msg) {
    if (typeof onProgress === 'function') {
      try {
        onProgress(msg);
      } catch (e) {
        // ignore
      }
    }
  };
  if (!supportsNativeInference()) {
    throw new Error('基础库不支持 wx.createInferenceSession（需 ≥2.30.0）');
  }
  const modelPath = await ensureNativeModelFile(report);
  report('创建原生推理 session…');
  const session = await createNativeSession(modelPath);
  report('原生推理预热…');
  try {
    await withTimeout(
      runNativeSession(session, new Float32Array(INPUT_SIZE * INPUT_SIZE * 3)),
      15000,
      '原生预热',
    );
  } catch (e) {
    try {
      if (typeof session.destroy === 'function') session.destroy();
    } catch (e2) {
      // ignore
    }
    throw new Error('原生预热失败: ' + ((e && e.message) || e));
  }
  report('原生推理就绪');
  return {
    kind: 'native',
    session: session,
    backend: 'native',
    backendNote: 'onnx-p' + NATIVE_PRECISION_LEVEL,
    preprocessVersion: PREPROCESS_VERSION,
    modelSource: 'onnx',
    smokeOk: true,
    smokeNote: 'native-warmed',
  };
}

/** 原生通道失败原因（诊断用，页面可透出） */
let lastNativeError = '';

async function createAnyRuntime(onProgress) {
  if (!forceTfjs && supportsNativeInference()) {
    try {
      return await createNativeRuntime(onProgress);
    } catch (e) {
      lastNativeError = String((e && (e.message || e.errMsg)) || e);
      if (typeof onProgress === 'function') {
        try {
          onProgress('原生推理不可用，回退 WebGL：' + lastNativeError);
        } catch (e2) {
          // ignore
        }
      }
    }
  } else if (!forceTfjs) {
    lastNativeError = '基础库不支持 wx.createInferenceSession（需 ≥2.30.0，仅真机）';
  }
  const rt = await createRuntime(onProgress);
  if (lastNativeError) rt.nativeFallbackReason = lastNativeError;
  return rt;
}

function ensureDetector(onProgress) {
  if (!runtimePromise) {
    runtimePromise = createAnyRuntime(onProgress).catch((err) => {
      runtimePromise = null;
      throw err;
    });
  }
  return runtimePromise;
}

function yieldToUi() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

/** 输出 [1,1,17,3]（y,x,score 归一化）→ 快照像素坐标关键点 */
function parseMoveNetValues(values, snapshot) {
  const keypoints = [];
  let above15 = 0;
  for (let i = 0; i < NUM_KEYPOINTS; i += 1) {
    const base = i * 3;
    const score = values[base + 2];
    if (score > 0.15) {
      above15 += 1;
      keypoints.push({
        name: COCO_KEYPOINTS[i],
        y: values[base] * snapshot.height,
        x: values[base + 1] * snapshot.width,
        score: score,
      });
    }
  }
  return { keypoints: keypoints, above15: above15 };
}

async function detectPose(frameOrSnapshot, onProgress) {
  const runtime = await ensureDetector();

  let snapshot;
  if (frameOrSnapshot && frameOrSnapshot.__copied) {
    snapshot = frameOrSnapshot;
  } else {
    snapshot = snapshotCameraFrame(frameOrSnapshot);
  }

  if (runtime.kind === 'native') {
    try {
      return await detectPoseNative(runtime, snapshot, onProgress);
    } catch (e) {
      // 原生 run 挂了（模型转换/精度问题）：拉黑原生，本帧起走 TFJS
      forceTfjs = true;
      lastNativeError = 'run 失败: ' + String((e && (e.message || e.errMsg)) || e);
      runtimePromise = null;
      try {
        if (runtime.session && typeof runtime.session.destroy === 'function') {
          runtime.session.destroy();
        }
      } catch (e2) {
        // ignore
      }
      const fallback = await ensureDetector(onProgress);
      return detectPoseTfjs(fallback, snapshot, onProgress);
    }
  }
  return detectPoseTfjs(runtime, snapshot, onProgress);
}

async function detectPoseNative(runtime, snapshot, onProgress) {
  const verbose = typeof onProgress === 'function';
  const report = (msg) => {
    if (!verbose) return;
    try {
      onProgress(msg);
    } catch (e) {
      // ignore
    }
  };

  report('预处理…');
  const t0 = Date.now();
  const flat = fillPooledFlatF32(snapshot);
  const preprocessMs = Date.now() - t0;

  report('原生推理中…');
  const t1 = Date.now();
  const res = await withTimeout(
    runNativeSession(runtime.session, flat),
    10000,
    '原生推理',
  );
  const executeMs = Date.now() - t1;

  const t2 = Date.now();
  const heads = [];
  for (let i = 0; i < NATIVE_OUTPUT_NAMES.length; i += 1) {
    const out = res && res[NATIVE_OUTPUT_NAMES[i]];
    if (!out || !out.data) {
      throw new Error(
        '原生推理缺输出 ' +
          NATIVE_OUTPUT_NAMES[i] +
          '，实际: ' +
          Object.keys(res || {}).join(','),
      );
    }
    heads.push(new Float32Array(out.data));
  }
  const values = decodeMoveNetHeads(heads[0], heads[1], heads[2], heads[3]);
  const readMs = Date.now() - t2;

  const parsed = parseMoveNetValues(values, snapshot);
  return {
    count: parsed.keypoints.length,
    detectedOf17: parsed.above15,
    keypoints: parsed.keypoints,
    inferMs: Date.now() - t0,
    preprocessMs: preprocessMs,
    executeMs: executeMs,
    readMs: readMs,
    backend: 'native',
    backendNote: runtime.backendNote || 'onnx',
    frameWidth: snapshot.width,
    frameHeight: snapshot.height,
    srcWidth: snapshot.srcWidth || snapshot.width,
    srcHeight: snapshot.srcHeight || snapshot.height,
  };
}

async function detectPoseTfjs(runtime, snapshot, onProgress) {
  const { tf, model } = runtime;
  const backend = runtime.backend || tf.getBackend();
  const verbose = typeof onProgress === 'function';

  const report = (msg) => {
    if (!verbose) return;
    try {
      onProgress(msg);
    } catch (e) {
      // ignore
    }
  };

  // 热路径不 yield：两次 setTimeout(0) 会白白吃掉数十 ms
  if (verbose) await yieldToUi();
  report('预处理…');

  const t0 = Date.now();
  const input = frameToInputTensor(tf, snapshot);
  const preprocessMs = Date.now() - t0;

  if (verbose) await yieldToUi();
  report(
    backend === 'webgl'
      ? 'WebGL 推理中…'
      : 'CPU 推理中（可能极慢/假死）…',
  );

  let output = null;
  try {
    const t1 = Date.now();
    output = runMoveNet(model, input);
    const executeMs = Date.now() - t1;

    const outTensor = Array.isArray(output) ? output[0] : output;
    report('读回结果…');
    const t2 = Date.now();
    // 微信 iOS 上 Promise/await 常由 setTimeout 模拟；data() 异步会额外吃几十 ms
    let values;
    if (outTensor && typeof outTensor.dataSync === 'function') {
      values = outTensor.dataSync();
    } else if (outTensor && typeof outTensor.data === 'function') {
      values = await outTensor.data();
    } else {
      throw new Error(`[${PREPROCESS_VERSION}] 输出张量无法读回`);
    }
    const readMs = Date.now() - t2;

    const parsed = parseMoveNetValues(values, snapshot);
    return {
      count: parsed.keypoints.length,
      detectedOf17: parsed.above15,
      keypoints: parsed.keypoints,
      inferMs: Date.now() - t0,
      preprocessMs: preprocessMs,
      executeMs: executeMs,
      readMs: readMs,
      backend: backend,
      backendNote: runtime.backendNote || backend,
      frameWidth: snapshot.width,
      frameHeight: snapshot.height,
      srcWidth: snapshot.srcWidth || snapshot.width,
      srcHeight: snapshot.srcHeight || snapshot.height,
    };
  } finally {
    input.dispose();
    if (Array.isArray(output)) {
      output.forEach((t) => {
        if (t && typeof t.dispose === 'function') t.dispose();
      });
    } else if (output && typeof output.dispose === 'function') {
      output.dispose();
    }
  }
}

/**
 * 在任何 await 之前同步拷贝 onCameraFrame 缓冲。
 * 长边 > SNAPSHOT_MAX_SIDE 时边拷边下采样，降低后续 resize 成本（MP-FPS）。
 */
function snapshotCameraFrame(frame) {
  const width = frame.width | 0;
  const height = frame.height | 0;
  const view = new Uint8Array(frame.data);
  const expected = width * height * 4;
  if (width <= 0 || height <= 0 || view.byteLength < expected) {
    throw new Error(
      `非法相机帧: ${width}x${height} bytes=${view.byteLength}`,
    );
  }

  const longSide = width > height ? width : height;
  if (longSide <= SNAPSHOT_MAX_SIDE) {
    const data = new Uint8Array(expected);
    data.set(view.subarray(0, expected));
    return {
      width: width,
      height: height,
      data: data,
      __copied: true,
      srcWidth: width,
      srcHeight: height,
    };
  }

  const scale = SNAPSHOT_MAX_SIDE / longSide;
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  const data = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(height - 1, Math.floor((y * height) / dh));
    const srcRow = sy * width * 4;
    const dstRow = y * dw * 4;
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(width - 1, Math.floor((x * width) / dw));
      const si = srcRow + sx * 4;
      const di = dstRow + x * 4;
      data[di] = view[si];
      data[di + 1] = view[si + 1];
      data[di + 2] = view[si + 2];
      data[di + 3] = view[si + 3];
    }
  }
  return {
    width: dw,
    height: dh,
    data: data,
    __copied: true,
    srcWidth: width,
    srcHeight: height,
  };
}

function resetDetector() {
  runtimePromise = null;
}

module.exports = {
  ensureDetector,
  detectPose,
  decodeMoveNetHeads,
  snapshotCameraFrame,
  resetDetector,
  PREPROCESS_VERSION,
};
