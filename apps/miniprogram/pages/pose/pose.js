const poseSpike = require('../../utils/poseSpike');

/**
 * WebGL 下推理不再堵主线程，节流交给 busy 门闩即可（帧率由推理耗时决定）。
 * CPU 回退时才用较大间隔，避免连续同步推理把界面拖死。
 */
const MIN_INFER_INTERVAL_WEBGL_MS = 0;
const MIN_INFER_INTERVAL_CPU_MS = 800;

Page({
  data: {
    cameraOn: true,
    modelReady: false,
    detecting: false,
    status: '初始化中…',
    landmarkCount: 0,
    fps: 0,
    lastInferMs: 0,
    errorMsg: '',
  },

  listener: null,
  frameTimes: [],
  busy: false,
  lastInferAt: 0,
  inferStartedAt: 0,
  heartbeatTimer: null,
  canvasNode: null,
  canvasCtx: null,

  onReady() {
    this.initCanvas();
    this.initModel();
  },

  onUnload() {
    this.stopDetect();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query
      .select('#overlay')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this.canvasNode = canvas;
        this.canvasCtx = ctx;
        this.canvasCssWidth = res[0].width;
        this.canvasCssHeight = res[0].height;
      });
  },

  async initModel() {
    this.setData({ status: '加载 MoveNet…', errorMsg: '' });
    try {
      const d = await poseSpike.ensureDetector((msg) => {
        this.setData({ status: msg });
      });
      const backend = (d && d.backend) || 'unknown';
      const ver =
        (d && d.preprocessVersion) || poseSpike.PREPROCESS_VERSION || '?';
      const src = (d && d.modelSource) || '?';
      const note = (d && d.backendNote) || '';
      this.inferInterval =
        backend === 'cpu'
          ? MIN_INFER_INTERVAL_CPU_MS
          : MIN_INFER_INTERVAL_WEBGL_MS;
      this.setData({
        modelReady: true,
        status:
          backend === 'cpu'
            ? `⚠️ CPU 模式（会假死）·${ver}·${src}`
            : `模型就绪（${backend}·${ver}·${src}）`,
        errorMsg: backend === 'cpu' ? note : '',
      });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      this.setData({
        modelReady: false,
        status: '模型加载失败',
        errorMsg:
          msg +
          '｜请确认：1) 重新「构建 npm」2) 主包勿含大模型文件',
      });
    }
  },

  toggleDetect() {
    if (this.data.detecting) {
      this.stopDetect();
    } else {
      this.startDetect();
    }
  },

  startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.busy || !this.data.detecting) return;
      const sec = Math.round((Date.now() - this.inferStartedAt) / 1000);
      this.setData({
        status: `推理中…已 ${sec}s`,
      });
    }, 1000);
  },

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  },

  startDetect() {
    if (!this.data.modelReady) {
      wx.showToast({ title: '模型未就绪', icon: 'none' });
      return;
    }
    this.busy = false;
    this.lastInferAt = 0;
    const cameraCtx = wx.createCameraContext();
    const listener = cameraCtx.onCameraFrame((frame) => {
      this.handleFrame(frame);
    });
    listener.start({
      success: () => {
        this.listener = listener;
        this.setData({
          detecting: true,
          status: '等待相机帧…',
          errorMsg: '',
          fps: 0,
          landmarkCount: 0,
        });
      },
      fail: (err) => {
        this.setData({
          detecting: false,
          errorMsg: (err && err.errMsg) || '无法启动相机帧监听（请用真机）',
        });
      },
    });
  },

  stopDetect() {
    this.clearHeartbeat();
    this.busy = false;
    if (this.listener) {
      try {
        this.listener.stop();
      } catch (e) {
        // ignore
      }
      this.listener = null;
    }
    this.setData({
      detecting: false,
      status: this.data.modelReady ? '已停止' : this.data.status,
    });
  },

  async handleFrame(frame) {
    if (this.busy || !this.data.detecting) return;
    const now = Date.now();
    const interval =
      this.inferInterval != null ? this.inferInterval : MIN_INFER_INTERVAL_CPU_MS;
    if (now - this.lastInferAt < interval) return;

    let snapshot;
    try {
      // 必须在任何 await 之前同步拷贝，否则缓冲会被微信回收
      snapshot = poseSpike.snapshotCameraFrame(frame);
    } catch (e) {
      this.setData({ errorMsg: (e && e.message) || String(e) });
      return;
    }

    this.busy = true;
    this.lastInferAt = now;
    this.inferStartedAt = now;
    this.setData({ status: '准备推理…' });
    this.startHeartbeat();

    try {
      const result = await poseSpike.detectPose(snapshot, (msg) => {
        if (!this.data.detecting) return;
        this.setData({ status: msg });
      });
      if (!this.data.detecting) return;

      const t = Date.now();
      this.frameTimes = this.frameTimes.filter((x) => t - x < 1000);
      this.frameTimes.push(t);
      this.setData({
        landmarkCount: result.count,
        fps: this.frameTimes.length,
        lastInferMs: result.inferMs || 0,
        status: `检测中（${result.backend || '?'}:${result.inferMs || '?'}ms）`,
        errorMsg: '',
      });
      this.drawOverlay(
        result.keypoints,
        result.frameWidth || snapshot.width,
        result.frameHeight || snapshot.height,
      );
    } catch (e) {
      this.setData({
        errorMsg: (e && e.message) || String(e),
        status: '推理出错（可点停止后重试）',
      });
    } finally {
      this.clearHeartbeat();
      this.busy = false;
    }
  },

  drawOverlay(keypoints, srcW, srcH) {
    const ctx = this.canvasCtx;
    if (!ctx || !this.canvasCssWidth) return;
    const w = this.canvasCssWidth;
    const h = this.canvasCssHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#00ff88';
    keypoints.forEach((k) => {
      const x = (k.x / srcW) * w;
      const y = (k.y / srcH) * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '摄像头错误';
    this.setData({ errorMsg: msg, cameraOn: false });
  },
});
