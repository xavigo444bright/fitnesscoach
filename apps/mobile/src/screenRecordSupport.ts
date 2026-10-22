/** 录屏只在 iOS 原生 ReplayKit。安卓不展示入口、也不走 start。 */
export function isScreenRecordingSupported(os: string): boolean {
  return os === 'ios';
}
