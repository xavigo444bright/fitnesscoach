Page({
  data: {
    cameraOn: true,
    facing: 'front',
    running: false,
    countdown: null,
    errorMsg: '',
    uiTopPx: 56,
    flipTopPx: 104,
  },

  timer: null,
  finished: false,

  onLoad() {
    this.applySafeUiOffsets();
  },

  onUnload() {
    this.clearTimer();
  },

  applySafeUiOffsets() {
    try {
      const mb = wx.getMenuButtonBoundingClientRect();
      if (mb && mb.bottom) {
        this.setData({
          uiTopPx: Math.round(mb.top),
          // 返回下方再放翻转，避免叠在一起
          flipTopPx: Math.round(mb.bottom + 12),
        });
        return;
      }
    } catch (e) {
      // ignore
    }
    const sys = wx.getSystemInfoSync();
    const status = (sys && sys.statusBarHeight) || 44;
    this.setData({
      uiTopPx: status + 4,
      flipTopPx: status + 52,
    });
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  goBack() {
    this.clearTimer();
    wx.navigateBack({ delta: 1 });
  },

  flip() {
    const next = this.data.facing === 'front' ? 'back' : 'front';
    this.setData({ cameraOn: false }, () => {
      this.setData({ facing: next, cameraOn: true });
    });
  },

  startCountdown() {
    this.finished = false;
    this.clearTimer();
    this.setData({ running: true, countdown: 3 });
    this.timer = setInterval(() => {
      const n = this.data.countdown;
      if (n == null) return;
      if (n <= 1) {
        this.clearTimer();
        this.setData({ countdown: null });
        this.goTraining();
        return;
      }
      this.setData({ countdown: n - 1 });
    }, 1000);
  },

  skip() {
    this.clearTimer();
    this.goTraining();
  },

  goTraining() {
    if (this.finished) return;
    this.finished = true;
    const facing = this.data.facing === 'back' ? 'back' : 'front';
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.sessionFacing = facing;
    }
    wx.redirectTo({
      url: '/packageTrain/pages/training/training?facing=' + facing,
    });
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '摄像头错误';
    this.setData({ errorMsg: msg, cameraOn: false });
  },
});
