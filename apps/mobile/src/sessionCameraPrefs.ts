/**
 * 准备页 ↔ 训练页共用的摄像头朝向（进程内）。
 * 姿态输入固定最高质量，不再存 quality 档。
 */
export type CameraFacing = 'front' | 'back';

export type SessionCameraPrefs = {
  facing: CameraFacing;
};

let prefs: SessionCameraPrefs = {
  facing: 'front',
};

export function getSessionCameraPrefs(): SessionCameraPrefs {
  return { ...prefs };
}

export function setSessionFacing(facing: CameraFacing): void {
  prefs = { ...prefs, facing };
}

export function toggleSessionFacing(): CameraFacing {
  const facing = prefs.facing === 'front' ? 'back' : 'front';
  prefs = { ...prefs, facing };
  return facing;
}
