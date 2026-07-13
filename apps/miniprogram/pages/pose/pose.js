const poseSpike = require('../../utils/poseSpike');

Page({
  data: {
    cameraOn: true,
    modelReady: false,
    detecting: false,
    status: '初始化中…',
    landmarkCount: 0,
    fps: 0,
    errorMsg: '',
  },

  listener: null,
  frameTimes: [],
  busy: false,
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
      const smoke = d && d.smokeOk ? 'ok' : 'skip';
      this.setData({
        modelReady: true,
        status: `模型就绪（${backend}·${ver}·${src}·smoke:${smoke}）`,
        errorMsg: d && d.smokeNote && !d.smokeOk ? d.smokeNote : '',
      });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      this.setData({
        modelReady: false,
        status: '模型加载失败',
        errorMsg:
          msg +
          '｜请确认：1) 删除 miniprogram_npm 后重新「构建 npm」2) 主包勿含大模型文件',
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

  startDetect() {
    if (!this.data.modelReady) {
      wx.showToast({ title: '模型未就绪', icon: 'none' });
      return;
    }
    const cameraCtx = wx.createCameraContext();
    const listener = cameraCtx.onCameraFrame((frame) => {
      this.handleFrame(frame);
    });
    listener.start({
      success: () => {
        this.listener = listener;
        this.setData({ detecting: true, status: '检测中…', errorMsg: '' });
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
    if (this.listener) {
      try {
        this.listener.stop();
      } catch (e) {
        // ignore
      }
      this.listener = null;
    }
    this.setData({ detecting: false, status: this.data.modelReady ? '已停止' : this.data.status });
  },

  async handleFrame(frame) {
    if (this.busy || !this.data.detecting) return;
    this.busy = true;
    try {
      // 直接传微信相机帧；poseSpike 内转为 Uint32Array PixelData
      const result = await poseSpike.detectPose(frame);
      const now = Date.now();
      this.frameTimes = this.frameTimes.filter((t) => now - t < 1000);
      this.frameTimes.push(now);
      this.setData({
        landmarkCount: result.count,
        fps: this.frameTimes.length,
        errorMsg: '',
      });
      this.drawOverlay(result.keypoints, frame.width, frame.height);
    } catch (e) {
      this.setData({
        errorMsg: (e && e.message) || String(e),
      });
    } finally {
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
