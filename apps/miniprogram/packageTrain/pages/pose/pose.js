const core = require('@fitness-coach/core');
const poseMp = require('@fitness-coach/pose-mp');
const render = require('@fitness-coach/render');
const canvasOverlay = require('../../utils/canvasOverlay');

/**
 * WebGL 下推理不再堵主线程，节流交给 busy 门闩即可（帧率由推理耗时决定）。
 * CPU 回退时才用较大间隔，避免连续同步推理把界面拖死。
 */
const MIN_INFER_INTERVAL_WEBGL_MS = 0;
const MIN_INFER_INTERVAL_CPU_MS = 800;
/** 低 FPS 下用时间迟滞，避免站位框一闪就没（对齐 App ~0.5s+） */
const PLACEMENT_OK_HIDE_MS = 2000;
/** MoveNet 分数常 <0.5，放宽站位可见度阈值 */
const PLACEMENT_CFG = { margin: 0.02, minVisibility: 0.25, maxBodySpanY: 0.98 };
/** 与训练页一致：低 FPS 一帧锁定 + 侧摄阈值放宽 */
const MP_PHASE_CONFIG = {
  standAboveDeg: 150,
  bottomBelowDeg: 110,
  confirmFrames: 1,
};
/** 前置摄像头：预览镜像，onCameraFrame 通常不镜像 */
const MIRROR_FRONT_CAMERA = true;

Page({
  data: {
    cameraOn: true,
    modelReady: false,
    detecting: false,
    status: '初始化中…',
    landmarkCount: 0,
    fps: 0,
    lastInferMs: 0,
    backendLabel: '--',
    perfLine: 'FPS≈-- · inferMs≈-- · --',
    kneeDeg: '--',
    validateStatus: '--',
    phase: '--',
    placementHint: '',
    feedbackHint: '',
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
  phaseState: null,
  placementOkSince: 0,
  lastFrameW: 0,
  lastFrameH: 0,

  onReady() {
    this.phaseState = core.initialPhaseState();
    this.placementOkSince = 0;
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
        this.paintOverlay(null, null, true);
      });
  },

  async initModel() {
    this.setData({ status: '加载 MoveNet…', errorMsg: '' });
    try {
      const d = await poseMp.ensureDetector((msg) => {
        this.setData({ status: msg });
      });
      const backend = (d && d.backend) || 'unknown';
      const ver =
        (d && d.preprocessVersion) || poseMp.PREPROCESS_VERSION || '?';
      const src = (d && d.modelSource) || '?';
      const note = (d && d.backendNote) || '';
      let backendLabel = note || backend;
      if (d && d.nativeFallbackReason) {
        console.warn('[pose] 原生推理回退:', d.nativeFallbackReason);
        this.nativeFallbackNote =
          ' · 原生回退:' + d.nativeFallbackReason.slice(0, 40);
        backendLabel += this.nativeFallbackNote;
      }
      this.backendLabel = backendLabel;
      this.inferInterval =
        backend === 'cpu'
          ? MIN_INFER_INTERVAL_CPU_MS
          : MIN_INFER_INTERVAL_WEBGL_MS;
      this.setData({
        modelReady: true,
        backendLabel: backendLabel,
        perfLine: 'FPS≈-- · inferMs≈-- · ' + backendLabel,
        status:
          backend === 'cpu'
            ? `⚠️ CPU 模式（会假死）·${ver}·${src}`
            : `模型就绪（${backendLabel}·${ver}·render ${render.RENDER_VERSION}）`,
        errorMsg: backend === 'cpu' ? note : '',
      });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      this.setData({
        modelReady: false,
        status: '模型加载失败',
        errorMsg:
          msg +
          '｜请确认：1) pnpm --filter miniprogram build 2) 重新「构建 npm」',
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
    this.phaseState = core.initialPhaseState();
    this.placementOkSince = 0;
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
          kneeDeg: '--',
          validateStatus: '--',
          phase: '--',
          placementHint: '',
          feedbackHint: '',
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
      snapshot = poseMp.snapshotCameraFrame(frame);
    } catch (e) {
      this.setData({ errorMsg: (e && e.message) || String(e) });
      return;
    }

    this.busy = true;
    this.lastInferAt = now;
    this.inferStartedAt = now;
    // MP-FPS：热路径不 setData / 不 onProgress（会 yieldToUi + 重绘）
    // 仅 CPU 慢路径用心跳提示，避免假死无反馈
    if (this.inferInterval === MIN_INFER_INTERVAL_CPU_MS) {
      this.setData({ status: '准备推理…' });
      this.startHeartbeat();
    }

    try {
      const result = await poseMp.detectPose(snapshot);
      if (!this.data.detecting) return;

      const pose = poseMp.movenetKeypointsToPose(
        result.keypoints,
        result.frameWidth || snapshot.width,
        result.frameHeight || snapshot.height,
      );
      // stepPhase 返回 { state, changed }，必须取 .state（此前整对象赋值导致 phase 恒 undefined）
      const stepped = core.stepPhase(this.phaseState, pose, MP_PHASE_CONFIG);
      this.phaseState = stepped.state;
      const phaseNow = this.phaseState.phase;
      const validation = core.validate(pose, phaseNow);
      const knee = core.squatKneeAngle(pose);
      const placement = render.evaluatePlacement(pose, PLACEMENT_CFG);
      const t = Date.now();
      if (placement.reason === 'ok') {
        if (!this.placementOkSince) this.placementOkSince = t;
      } else {
        this.placementOkSince = 0;
      }
      const showPlacement =
        placement.visible ||
        !this.placementOkSince ||
        t - this.placementOkSince < PLACEMENT_OK_HIDE_MS;

      const userScene = render.applyJointColors(
        render.buildSkeletonScene(pose),
        validation,
      );
      const ghostPose = render.alignGhostToUser(
        render.ghostPoseForPhase(phaseNow, knee),
        pose,
      );
      const ghostScene = render.buildSkeletonScene(ghostPose);

      this.lastFrameW =
        result.srcWidth ||
        result.frameWidth ||
        snapshot.srcWidth ||
        snapshot.width ||
        0;
      this.lastFrameH =
        result.srcHeight ||
        result.frameHeight ||
        snapshot.srcHeight ||
        snapshot.height ||
        0;
      this.paintOverlay(userScene, ghostScene, showPlacement);

      this.frameTimes = this.frameTimes.filter((x) => t - x < 1000);
      this.frameTimes.push(t);
      const fps = this.frameTimes.length;
      const inferMs = result.inferMs || 0;
      const preprocessMs = result.preprocessMs || 0;
      const executeMs = result.executeMs || 0;
      const readMs = result.readMs || 0;
      const backendLabel =
        (result.backendNote ||
          this.backendLabel ||
          result.backend ||
          this.data.backendLabel ||
          '--') + (this.nativeFallbackNote || '');
      this.backendLabel = backendLabel;
      const perfLine =
        'FPS≈' +
        fps +
        ' · inferMs≈' +
        inferMs +
        ' (p' +
        preprocessMs +
        '/e' +
        executeMs +
        '/r' +
        readMs +
        ') · ' +
        backendLabel;
      const feedbackHint =
        (validation.messages && validation.messages[0]) || '';
      this.setData({
        landmarkCount: result.count,
        fps: fps,
        lastInferMs: inferMs,
        backendLabel: backendLabel,
        perfLine: perfLine,
        kneeDeg: knee != null ? knee.toFixed(1) : '--',
        validateStatus: validation.status,
        phase: phaseNow,
        placementHint: showPlacement
          ? placement.hint ||
            (placement.reason === 'ok' ? '' : '请调整站位')
          : '',
        feedbackHint: feedbackHint,
        status: '检测中',
        errorMsg: '',
      });
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

  paintOverlay(userScene, ghostScene, placementVisible) {
    const ctx = this.canvasCtx;
    const w = this.canvasCssWidth;
    const h = this.canvasCssHeight;
    if (!ctx || !w) return;
    canvasOverlay.paintOverlay(ctx, w, h, {
      userScene: userScene,
      ghostScene: ghostScene,
      placementVisible: placementVisible,
      map: {
        frameW: this.lastFrameW || 0,
        frameH: this.lastFrameH || 0,
        mirrorX: MIRROR_FRONT_CAMERA,
      },
    });
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '摄像头错误';
    this.setData({ errorMsg: msg, cameraOn: false });
  },
});
