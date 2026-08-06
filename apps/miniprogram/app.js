App({
  globalData: {
    /** @type {{ reps: number, durationMs: number, topIssue: string|null }|null} */
    lastSummary: null,
    /** @type {'front'|'back'} */
    sessionFacing: 'front',
  },
  onLaunch() {
    console.log('[fitness-coach] miniprogram launch');
    // M5-T5 / VT-P5-008：方案 A 端侧，无云端授权；首次仅告知本地推理（NFR-003）
    try {
      const key = 'privacy_local_notice_v1';
      if (wx.getStorageSync(key)) return;
      wx.showModal({
        title: '隐私说明',
        content:
          '深蹲姿态分析在手机本地完成，视频画面不会上传服务器。继续使用即表示知悉。',
        showCancel: false,
        confirmText: '知道了',
        success() {
          wx.setStorageSync(key, 1);
        },
      });
    } catch (e) {
      // ignore storage / modal failures
    }
  },
});
