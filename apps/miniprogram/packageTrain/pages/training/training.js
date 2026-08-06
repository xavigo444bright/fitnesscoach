const core = require('@fitness-coach/core');
const poseMp = require('@fitness-coach/pose-mp');
const render = require('@fitness-coach/render');
const canvasOverlay = require('../../utils/canvasOverlay');

const MIN_INFER_INTERVAL_WEBGL_MS = 0;
const MIN_INFER_INTERVAL_CPU_MS = 800;
const PLACEMENT_OK_HIDE_MS = 2000;
const PLACEMENT_CFG = { margin: 0.02, minVisibility: 0.25, maxBodySpanY: 0.98 };
const REJECT_HINT_MS = 2500;
const RECOVER_MS = 1800;
/**
 * 小程序 MoveNet ~4 FPS / 推理~250–350ms：
 * - confirmFrames=1：端点一帧锁定，避免快起快落跳过 bottom
 * - stand 略降、bottom 略升：侧摄像素膝角不易到 160/100
 * 深度仍由 squat-depth（≥110° 才拒）把关。
 */
const MP_PHASE_CONFIG = {
  standAboveDeg: 150,
  bottomBelowDeg: 110,
  confirmFrames: 1,
};
/** 低 FPS：反馈防抖缩短，否则蹲一下就起来条还没出来 */
const MP_FEEDBACK_CFG = { debounceMs: 250, cooldownMs: 2000 };
/** HUD setData 节流（MP-FPS）；rep/反馈变化立刻刷 */
const HUD_THROTTLE_MS = 200;

Page({
  data: {
    cameraOn: true,
    facing: 'front',
    modelReady: false,
    status: '加载模型…',
    kneeDeg: '--',
    validateStatus: '--',
    phase: '--',
    repCount: 0,
    fps: 0,
    lastInferMs: 0,
    backendLabel: '--',
    nativeFallbackReason: '',
    tapDebug: '',
    perfLine: 'FPS≈-- · inferMs≈-- · --',
    mirrorLabel: 'mir:--',
    placementHint: '正在加载模型，请先站入虚线框…',
    showPlacement: true,
    feedbackLines: [],
    errorMsg: '',
    uiTopPx: 56,
    feedbackTopPx: 96,
    flipTopPx: 48,
  },

  listener: null,
  busy: false,
  lastInferAt: 0,
  frameTimes: null,
  lastHudAt: 0,
  lastFeedbackKey: '',
  backendLabel: '',
  lastFrameW: 0,
  lastFrameH: 0,
  lastSnapshot: null,
  frameBlit: null,
  /** null=跟随 facing；true/false=诊断手动覆盖（点性能条切换） */
  mirrorFront: null,
  canvasCtx: null,
  canvasCssWidth: 0,
  canvasCssHeight: 0,
  repState: null,
  wiredFeedback: null,
  placementOkSince: 0,
  sessionStartedAt: 0,
  issueCounts: null,
  detecting: false,
  ending: false,
  flipping: false,
  cameraRetried: false,
  uiRects: null,
  rejectHint: null,
  rejectUntil: 0,
  rejectRuleId: 'rep-shallow',
  recoverItems: null,
  recoverUntil: 0,

  onLoad(query) {
    const app = getApp();
    const fromQuery = query && query.facing;
    const fromApp =
      app && app.globalData && app.globalData.sessionFacing;
    const facing =
      fromQuery === 'back' || fromApp === 'back' ? 'back' : 'front';
    this.setData({ facing: facing });
    this.applySafeUiOffsets();
  },

  /** 微信胶囊区：反馈/翻转避开 menuButton（UI.md §5） */
  applySafeUiOffsets() {
    try {
      const sys = wx.getSystemInfoSync();
      this.safeBottomPx = sys.safeArea
        ? Math.max(0, sys.windowHeight - sys.safeArea.bottom)
        : 0;
    } catch (e) {
      this.safeBottomPx = 0;
    }
    try {
      const mb = wx.getMenuButtonBoundingClientRect();
      if (mb && mb.bottom) {
        const uiTop = Math.round(mb.bottom + 8);
        const flipTop = Math.round(mb.top);
        this.setData({
          uiTopPx: uiTop,
          feedbackTopPx: uiTop + 36,
          flipTopPx: flipTop,
        });
        return;
      }
    } catch (e) {
      // ignore
    }
    const sys = wx.getSystemInfoSync();
    const status = (sys && sys.statusBarHeight) || 44;
    this.setData({
      uiTopPx: status + 8,
      feedbackTopPx: status + 44,
      flipTopPx: status + 4,
    });
  },

  onReady() {
    this.repState = core.initialRepCounterState();
    this.wiredFeedback = render.initialWiredFeedbackState();
    this.placementOkSince = 0;
    this.issueCounts = Object.create(null);
    this.recoverItems = [];
    this.frameTimes = [];
    this.lastHudAt = 0;
    this.lastFeedbackKey = '';
    this.sessionStartedAt = Date.now();
    this.initCanvas();
    this.initModel();
    // 等 flipTopPx 等偏移渲染完再量按钮位置
    setTimeout(() => this.cacheUiRects(), 400);
  },

  /**
   * iOS 同层渲染的全屏 2d canvas 会拦截触摸。
   * 交互控件已全部画在 canvas 上；按布局常量 tapZones 坐标路由。
   */
  cacheUiRects() {
    try {
      const win = wx.getSystemInfoSync();
      const w = win.windowWidth;
      const h = win.windowHeight;
      const safeBottom = win.safeArea ? h - win.safeArea.bottom : 0;
      const flipTop = this.data.flipTopPx || 48;
      const uiTop = this.data.uiTopPx || 90;
      this.safeBottomPx = safeBottom;
      this.tapZones = {
        flip: { left: 8, top: flipTop - 8, right: 96, bottom: flipTop + 52 },
        end: {
          left: w * 0.5,
          top: h - 64 - safeBottom - 12,
          right: w,
          bottom: h,
        },
        // 点性能条切换镜像；高度含副行 tapDebug
        perf: { left: 8, top: uiTop - 4, right: w - 8, bottom: uiTop + 56 },
      };
    } catch (err) {
      // ignore
    }
  },

  currentMirrorX() {
    if (this.mirrorFront != null) return !!this.mirrorFront;
    // 前置默认镜像：自绘帧与骨骼同步翻转，得到自拍预览手感
    return this.data.facing === 'front';
  },

  onOverlayTouchEnd(e) {
    const t = e && e.changedTouches && e.changedTouches[0];
    if (!t) return;
    // CanvasTouch：x/y 相对 canvas；全屏时与 clientX/Y 等价
    const x = t.clientX != null ? t.clientX : t.x;
    const y = t.clientY != null ? t.clientY : t.y;
    if (x == null || y == null) return;
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 250) return;
    this.lastTapAt = now;
    if (!this.tapZones) this.cacheUiRects();
    const PAD = 10;
    const hit = (r) =>
      r &&
      x >= r.left - PAD &&
      x <= r.right + PAD &&
      y >= r.top - PAD &&
      y <= r.bottom + PAD;
    const zones = this.tapZones || {};
    let action = 'none';
    if (hit(zones.flip)) {
      action = 'flip';
      this.flipCamera();
    } else if (hit(zones.end)) {
      action = 'end';
      this.endSession();
    } else if (hit(zones.perf)) {
      const cur = this.currentMirrorX();
      this.mirrorFront = !cur;
      action = 'mirror:' + (this.mirrorFront ? 'on' : 'off');
      // 立刻重画，让用户看到镜像切换效果
      this.paintOverlay(
        this.lastUserScene || null,
        this.lastGhostScene || null,
        !!this.data.showPlacement,
      );
    }
    this.setData({
      tapDebug: 'tap ' + Math.round(x) + ',' + Math.round(y) + ' → ' + action,
      mirrorLabel: 'mir:' + (this.currentMirrorX() ? 'on' : 'off'),
    });
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
        this.canvasCtx = ctx;
        this.canvasCssWidth = res[0].width;
        this.canvasCssHeight = res[0].height;
        // 站位框改由 cover-view 绘制；canvas 只画骨骼
        this.paintOverlay(null, null, false);
      });
  },

  async initModel() {
    this.setData({ status: '加载 MoveNet…', errorMsg: '' });
    try {
      const d = await poseMp.ensureDetector((msg) => {
        this.setData({ status: msg });
      });
      const backend = (d && d.backend) || 'unknown';
      let backendLabel =
        (d && d.backendNote) ||
        (backend === 'webgl' ? 'webgl' : backend);
      if (d && d.nativeFallbackReason) {
        console.warn('[pose] 原生推理回退:', d.nativeFallbackReason);
        this.setData({ nativeFallbackReason: d.nativeFallbackReason });
      }
      this.backendLabel = backendLabel;
      this.inferInterval =
        backend === 'cpu'
          ? MIN_INFER_INTERVAL_CPU_MS
          : MIN_INFER_INTERVAL_WEBGL_MS;
      this.setData({
        modelReady: true,
        status: '模型就绪',
        backendLabel: backendLabel,
        perfLine: 'FPS≈-- · inferMs≈-- · ' + backendLabel,
      });
      this.startDetect();
    } catch (e) {
      this.setData({
        modelReady: false,
        status: '模型加载失败',
        errorMsg: (e && e.message) || String(e),
      });
    }
  },

  startDetect(retryCount) {
    if (!this.data.modelReady || this.detecting || this.ending) return;
    this.busy = false;
    this.lastInferAt = 0;
    if (!this.repState) this.repState = core.initialRepCounterState();
    if (!this.wiredFeedback) {
      this.wiredFeedback = render.initialWiredFeedbackState();
    }
    this.placementOkSince = 0;
    this.rejectHint = null;
    this.recoverItems = [];
    const cameraCtx = wx.createCameraContext();
    const listener = cameraCtx.onCameraFrame((frame) => {
      this.handleFrame(frame);
    });
    listener.start({
      success: () => {
        this.listener = listener;
        this.detecting = true;
        this.frameTimes = [];
        this.paintOverlay(null, null, false);
        this.setData({
          status: '训练中',
          errorMsg: '',
          showPlacement: true,
          placementHint: '髋膝踝入画即可，不必顶满框',
        });
      },
      fail: (err) => {
        // 翻转 remount 后相机可能还没就绪，重试几次再报错
        const n = retryCount || 0;
        if (n < 3 && !this.ending) {
          setTimeout(() => this.startDetect(n + 1), 400);
          return;
        }
        this.setData({
          errorMsg: (err && err.errMsg) || '无法启动相机帧（请用真机）',
        });
      },
    });
  },

  stopDetect() {
    this.detecting = false;
    this.busy = false;
    if (this.listener) {
      try {
        this.listener.stop();
      } catch (e) {
        // ignore
      }
      this.listener = null;
    }
  },

  /** 训练中允许前后摄切换（深蹲侧摄常用后置） */
  flipCamera() {
    if (this.ending || this.flipping || !this.data.modelReady) return;
    this.flipping = true;
    this.cameraRetried = false;
    this.mirrorFront = null;
    const next = this.data.facing === 'front' ? 'back' : 'front';
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.sessionFacing = next;
    }
    // 兜底：任何回调丢失也要解锁，避免按钮永久失效
    setTimeout(() => {
      this.flipping = false;
    }, 4000);

    const remount = () => {
      this.setData({ cameraOn: false, facing: next }, () => {
        setTimeout(() => {
          this.setData({ cameraOn: true }, () => {
            // iOS 相机初始化偏慢；startDetect 自带重试，间隔可以放小
            setTimeout(() => {
              this.initCanvas();
              this.startDetect(0);
              this.flipping = false;
            }, 120);
          });
        }, 50);
      });
    };

    // 等旧帧监听真正停掉再卸载，否则 iOS 报「相机被占用」
    const listener = this.listener;
    this.detecting = false;
    this.busy = false;
    this.listener = null;
    if (!listener) {
      remount();
      return;
    }
    let stopped = false;
    const once = () => {
      if (stopped) return;
      stopped = true;
      remount();
    };
    try {
      listener.stop({ complete: once });
    } catch (e) {
      once();
    }
    // stop 回调在部分机型不触发，超时兜底（短些，降低翻转总延迟）
    setTimeout(once, 200);
  },

  noteIssue(id, message) {
    const prev = this.issueCounts[id];
    this.issueCounts[id] = {
      message: message,
      count: (prev && prev.count ? prev.count : 0) + 1,
    };
  },

  buildFeedbackLines(wiredItems, now) {
    let reject = this.rejectHint;
    let recover = this.recoverItems || [];
    if (now > this.recoverUntil) recover = [];

    if (this.repState.lastOutcome && this.repState.lastOutcome.type === 'rejected') {
      const msg = core.messageForRepReject(this.repState.lastOutcome.reason);
      this.rejectUntil = now + REJECT_HINT_MS;
      this.rejectRuleId =
        this.repState.lastOutcome.reason === 'shallow'
          ? 'rep-shallow'
          : 'squat-depth';
      reject = msg;
      this.noteIssue(this.rejectRuleId, msg);
    } else if (
      this.repState.lastOutcome &&
      this.repState.lastOutcome.type === 'counted'
    ) {
      // 有效 rep：清半蹲条；若有 recovered 条目保持展示窗
      reject = null;
    } else if (reject && now > this.rejectUntil) {
      reject = null;
    }

    this.rejectHint = reject;
    this.recoverItems = recover;

    let barItems =
      reject != null
        ? [
            {
              ruleId: this.rejectRuleId,
              message: reject,
              severity: 'error',
              phase: 'correcting',
            },
          ].concat(
            wiredItems.filter(function (i) {
              return i.ruleId !== 'rep-shallow' && i.ruleId !== 'squat-depth';
            }),
          )
        : wiredItems.slice();

    if (recover.length > 0 && reject == null) {
      barItems = recover.concat(barItems);
    }

    // 去重 + 最多 2 条
    const seen = Object.create(null);
    const lines = [];
    for (let i = 0; i < barItems.length && lines.length < 2; i += 1) {
      const item = barItems[i];
      if (seen[item.ruleId]) continue;
      seen[item.ruleId] = true;
      lines.push({
        ruleId: item.ruleId,
        message: item.message,
        phase: item.phase,
        tone:
          item.phase === 'recovered' || item.severity === 'correct'
            ? 'ok'
            : item.severity === 'warning'
              ? 'warn'
              : 'err',
      });
    }
    return lines;
  },

  async handleFrame(frame) {
    if (this.busy || !this.detecting || this.ending) return;
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
    try {
      const result = await poseMp.detectPose(snapshot);
      if (!this.detecting) return;

      const pose = poseMp.movenetKeypointsToPose(
        result.keypoints,
        result.frameWidth || snapshot.width,
        result.frameHeight || snapshot.height,
      );

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

      // 站位未稳不计次：乱点/半身时 MoveNet 会脑补姿态导致 Rep 乱跳
      if (placement.reason === 'ok') {
        this.repState = core.stepRep(this.repState, pose, {
          phaseConfig: MP_PHASE_CONFIG,
        });
      } else if (!this.repState) {
        this.repState = core.initialRepCounterState();
      }

      const phaseNow = this.repState.phaseState.phase;
      // ValidationResult 必须带 results[]；缺字段会导致 for...of 直接崩帧
      const validation =
        placement.reason === 'ok'
          ? core.validate(pose, phaseNow)
          : { status: 'correct', messages: [], results: [] };
      const knee = core.squatKneeAngle(pose);

      const wired = render.stepWiredFeedback(
        this.wiredFeedback,
        validation,
        now,
        MP_FEEDBACK_CFG,
      );
      this.wiredFeedback = wired.state;

      // recovered 条目来自 FeedbackBar；同步到临时 recover 列表供与半蹲条合并
      const recoveredNow = wired.items.filter(function (i) {
        return i.phase === 'recovered';
      });
      if (recoveredNow.length > 0) {
        this.recoverItems = recoveredNow;
        this.recoverUntil = now + RECOVER_MS;
      }

      for (let i = 0; i < wired.newCues.length; i += 1) {
        const cue = wired.newCues[i];
        this.noteIssue(cue.id, cue.message);
      }

      const feedbackLines =
        placement.reason === 'ok'
          ? this.buildFeedbackLines(wired.items, now)
          : [];

      const userScene = render.applyJointColors(
        render.buildSkeletonScene(pose),
        wired.displayValidation,
      );
      // 站位未稳定不画 ghost：对不齐的白色示范骨骼比没有更误导
      const ghostScene = showPlacement
        ? null
        : render.buildSkeletonScene(
            render.alignGhostToUser(
              render.ghostPoseForPhase(phaseNow, knee),
              pose,
            ),
          );
      this.lastSnapshot = snapshot;
      this.lastUserScene = userScene;
      this.lastGhostScene = ghostScene;
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
      // 自绘帧尺寸必须与关键点归一化所用尺寸一致（snapshot 可能已下采样）
      this.lastMapFrameW = snapshot.width || this.lastFrameW;
      this.lastMapFrameH = snapshot.height || this.lastFrameH;

      const doneAt = Date.now();
      const inferMs = result.inferMs || 0;
      const preprocessMs = result.preprocessMs || 0;
      const executeMs = result.executeMs || 0;
      const readMs = result.readMs || 0;
      const backendLabel =
        (result && result.backendNote) ||
        this.backendLabel ||
        (result && result.backend) ||
        this.data.backendLabel ||
        '--';
      this.backendLabel = backendLabel;
      this.frameTimes = (this.frameTimes || []).filter(function (x) {
        return doneAt - x < 1000;
      });
      this.frameTimes.push(doneAt);
      const fps = this.frameTimes.length;
      const mirrorOn = this.currentMirrorX();
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
        backendLabel +
        ' · mir:' +
        (mirrorOn ? 'on' : 'off');
      const repCount = this.repState.count;
      const feedbackKey = feedbackLines
        .map(function (l) {
          return l.ruleId + ':' + l.phase;
        })
        .join('|');
      const placementHint = showPlacement
        ? placement.hint ||
          (placement.reason === 'ok' ? '髋膝踝入画即可，不必顶满框' : '请调整站位')
        : '';
      this._lastPlaceHint = placementHint;
      this._lastPerfLine = perfLine;
      // 帧+骨骼+控件同一 canvas 绘制（对齐保证）
      this.paintOverlay(userScene, ghostScene, showPlacement);
      const mustHud =
        repCount !== this.data.repCount ||
        feedbackKey !== this.lastFeedbackKey ||
        showPlacement !== this.data.showPlacement ||
        placementHint !== this.data.placementHint ||
        !this.lastHudAt ||
        doneAt - this.lastHudAt >= HUD_THROTTLE_MS;
      if (mustHud) {
        this.lastHudAt = doneAt;
        this.lastFeedbackKey = feedbackKey;
        this.setData({
          kneeDeg: knee != null ? knee.toFixed(1) : '--',
          validateStatus: validation.status,
          phase: phaseNow,
          repCount: repCount,
          fps: fps,
          lastInferMs: inferMs,
          backendLabel: backendLabel,
          perfLine: perfLine,
          mirrorLabel: 'mir:' + (mirrorOn ? 'on' : 'off'),
          showPlacement: showPlacement,
          placementHint: placementHint,
          feedbackLines: feedbackLines,
          errorMsg: '',
        });
      } else {
        this.setData({
          fps: fps,
          lastInferMs: inferMs,
          backendLabel: backendLabel,
          perfLine: perfLine,
          mirrorLabel: 'mir:' + (mirrorOn ? 'on' : 'off'),
        });
      }
    } catch (e) {
      this.setData({
        errorMsg: (e && e.message) || String(e),
      });
    } finally {
      this.busy = false;
    }
  },

  paintOverlay(userScene, ghostScene, placementVisible) {
    const ctx = this.canvasCtx;
    let w = this.canvasCssWidth;
    let h = this.canvasCssHeight;
    if (!ctx) return;
    if (!w || !h) {
      return;
    }
    const mirrorX = this.currentMirrorX();
    const frameW = this.lastMapFrameW || this.lastFrameW || 0;
    const frameH = this.lastMapFrameH || this.lastFrameH || 0;
    const perfLine = this._lastPerfLine || this.data.perfLine || '';
    const tapDebug = this.data.tapDebug || '';
    const placeHint =
      placementVisible
        ? this._lastPlaceHint || this.data.placementHint || ''
        : '';
    this.frameBlit = canvasOverlay.paintOverlay(ctx, w, h, {
      userScene: userScene,
      ghostScene: ghostScene,
      placementVisible: placementVisible,
      placeHint: placeHint,
      cameraFrame: this.lastSnapshot || null,
      _frameBlit: this.frameBlit,
      bottomBar: {
        rep: (this.repState && this.repState.count) || 0,
        safeBottom: this.safeBottomPx || 0,
      },
      flipChip: {
        left: 16,
        top: this.data.flipTopPx || 48,
        width: 64,
        height: 44,
      },
      perf: {
        top: this.data.uiTopPx || 90,
        line: perfLine,
        subLine: tapDebug,
      },
      map: {
        frameW: frameW,
        frameH: frameH,
        mirrorX: mirrorX,
      },
    });
  },

  endSession() {
    if (this.ending) return;
    this.ending = true;
    this.stopDetect();

    let topIssue = null;
    let best = 0;
    const ids = Object.keys(this.issueCounts || {});
    for (let i = 0; i < ids.length; i += 1) {
      const row = this.issueCounts[ids[i]];
      if (row.count > best) {
        best = row.count;
        topIssue = row.message + ' (' + row.count + ')';
      }
    }

    const summary = {
      reps: (this.repState && this.repState.count) || 0,
      durationMs: Date.now() - (this.sessionStartedAt || Date.now()),
      topIssue: topIssue,
    };
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.lastSummary = summary;
    }
    wx.redirectTo({
      url: '/pages/summary/summary',
      fail: (err) => {
        this.ending = false;
        const msg = (err && err.errMsg) || '无法打开总结页';
        this.setData({ errorMsg: msg });
        wx.showToast({ title: '结束失败，请重试', icon: 'none' });
      },
    });
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '摄像头错误';
    // 翻转窗口期的报错多为旧相机未释放：重挂一次而不是直接杀掉页面
    if (this.flipping && !this.cameraRetried) {
      this.cameraRetried = true;
      this.setData({ cameraOn: false }, () => {
        setTimeout(() => {
          this.setData({ cameraOn: true }, () => {
            setTimeout(() => this.startDetect(0), 300);
          });
        }, 600);
      });
      return;
    }
    this.setData({ errorMsg: msg, cameraOn: false });
  },
});
