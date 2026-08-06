Page({
  data: {
    authorized: false,
    facing: 'front',
    cameraVisible: true,
    errorMsg: '',
  },

  onLoad() {
    this.checkAuth();
  },

  checkAuth() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera']) {
          this.setData({ authorized: true, errorMsg: '', cameraVisible: true });
        } else {
          this.setData({ authorized: false });
        }
      },
      fail: (err) => {
        this.setData({
          authorized: false,
          errorMsg: err.errMsg || '无法读取权限设置',
        });
      },
    });
  },

  requestAuth() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ authorized: true, errorMsg: '', cameraVisible: true });
      },
      fail: () => {
        wx.showModal({
          title: '需要摄像头权限',
          content: '请在设置中打开摄像头权限',
          confirmText: '去设置',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.openSetting({
                success: () => this.checkAuth(),
              });
            }
          },
        });
      },
    });
  },

  toggleFacing() {
    const next = this.data.facing === 'front' ? 'back' : 'front';
    // 先卸载再挂载 camera，避免仅改 device-position 不生效
    this.setData({ cameraVisible: false }, () => {
      setTimeout(() => {
        this.setData({ facing: next, cameraVisible: true });
      }, 50);
    });
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '摄像头打开失败';
    this.setData({ authorized: false, errorMsg: msg, cameraVisible: false });
  },
});
