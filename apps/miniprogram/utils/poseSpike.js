/**
 * 小程序姿态 Spike（方案 A：TFJS + MoveNet Lightning）
 * 直接 loadGraphModel，手动喂 [1,192,192,3]，避开 pose-detection/cropAndResize。
 *
 * PREPROCESS_VERSION：真机 status 里应能看到；若仍是旧文案说明未刷新到本文件。
 */

let runtimePromise = null;

const PREPROCESS_VERSION = 'nhwc-v9';
/** 用户文件目录缓存（不进主包，避免 80051 超 2MB） */
const MODEL_CACHE_DIR_NAME = 'movenet-lightning';
const MODEL_FILES = ['model.json', 'group1-shard1of2.bin', 'group1-shard2of2.bin'];
const REMOTE_MODEL_BASE =
  'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';
const INPUT_SIZE = 192;
const EXPECTED_INPUT_SHAPE = [1, INPUT_SIZE, INPUT_SIZE, 3];
const NUM_KEYPOINTS = 17;
const FETCH_TIMEOUT_MS = 60000;

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

function tryRequire(name) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(name);
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

/**
 * 纯 JS nearest resize → NHWC int32 [1,192,192,3]。
 * 微信包里 tensor1d().reshape 可能不是函数，改用 tf.tensor(values, shape)。
 */
function frameToInputTensor(tf, frame) {
  const { width, height, src } = copyCameraRgba(frame);
  const flat = new Int32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let y = 0; y < INPUT_SIZE; y += 1) {
    const sy = Math.min(height - 1, Math.floor((y * height) / INPUT_SIZE));
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      const sx = Math.min(width - 1, Math.floor((x * width) / INPUT_SIZE));
      const si = (sy * width + sx) * 4;
      const di = (y * INPUT_SIZE + x) * 3;
      flat[di] = src[si];
      flat[di + 1] = src[si + 1];
      flat[di + 2] = src[si + 2];
    }
  }

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
  // eslint-disable-next-line global-require
  const tf = require('@tensorflow/tfjs-core');
  setupWechatPlatform(tf);

  if (!tryRequire('@tensorflow/tfjs-backend-cpu')) {
    throw new Error('缺少 @tensorflow/tfjs-backend-cpu，请重新「构建 npm」');
  }
  tryRequire('@tensorflow/tfjs-converter');

  report('设置 CPU backend…');
  const ok = await tf.setBackend('cpu');
  if (!ok) throw new Error('无法设置 cpu backend');
  await tf.ready();

  // eslint-disable-next-line global-require
  const tfconv = require('@tensorflow/tfjs-converter');

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
  report('模型就绪');

  return {
    tf,
    model,
    backend: tf.getBackend(),
    preprocessVersion: PREPROCESS_VERSION,
    attrFix: attrFix,
    modelSource: cacheInfo.downloaded ? 'download' : 'cache',
    smokeOk: true,
    smokeNote: 'skipped-on-init',
  };
}

function ensureDetector(onProgress) {
  if (!runtimePromise) {
    runtimePromise = createRuntime(onProgress).catch((err) => {
      runtimePromise = null;
      throw err;
    });
  }
  return runtimePromise;
}

async function detectPose(frame) {
  const { tf, model } = await ensureDetector();
  const input = frameToInputTensor(tf, frame);
  let output = null;
  try {
    output = runMoveNet(model, input);
    // 输出可能是 Tensor 或 Tensor[]
    const outTensor = Array.isArray(output) ? output[0] : output;
    // 输出 [1,1,17,3] -> (y, x, score) 归一化到 0~1
    const data = outTensor.dataSync();
    const keypoints = [];
    for (let i = 0; i < NUM_KEYPOINTS; i += 1) {
      const base = i * 3;
      const score = data[base + 2];
      if (score > 0.2) {
        keypoints.push({
          name: COCO_KEYPOINTS[i],
          // 还原到原图坐标
          y: data[base] * frame.height,
          x: data[base + 1] * frame.width,
          score: score,
        });
      }
    }
    return { count: keypoints.length, keypoints };
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

function resetDetector() {
  runtimePromise = null;
}

module.exports = {
  ensureDetector,
  detectPose,
  resetDetector,
  PREPROCESS_VERSION,
};
