function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

Page({
  data: {
    reps: 0,
    durationLabel: '0:00',
    topIssue: '',
  },

  onShow() {
    const app = getApp();
    const s = (app && app.globalData && app.globalData.lastSummary) || {
      reps: 0,
      durationMs: 0,
      topIssue: null,
    };
    this.setData({
      reps: s.reps || 0,
      durationLabel: formatDuration(s.durationMs || 0),
      topIssue: s.topIssue || '',
    });
  },

  retry() {
    wx.redirectTo({ url: '/pages/prepare/prepare' });
  },

  goLibrary() {
    wx.reLaunch({ url: '/pages/library/library' });
  },
});
