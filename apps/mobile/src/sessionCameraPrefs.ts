/**
 * 准备页 ↔ 训练页共用的机位/质量偏好（进程内）。
 */
import type { QualityTier } from '@fitness-coach/pose-native';

export type CameraFacing = 'front' | 'back';

export type SessionCameraPrefs = {
  facing: CameraFacing;
  qualityTier: QualityTier;
  qualityManual: boolean;
};

let prefs: SessionCameraPrefs = {
  facing: 'front',
  qualityTier: 'high',
  qualityManual: false,
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

export function setSessionQuality(
  qualityTier: QualityTier,
  qualityManual: boolean,
): void {
  prefs = { ...prefs, qualityTier, qualityManual };
}

const TIER_ORDER: QualityTier[] = ['high', 'medium', 'low'];

export function cycleSessionQuality(): QualityTier {
  const idx = TIER_ORDER.indexOf(prefs.qualityTier);
  const qualityTier = TIER_ORDER[(idx + 1) % TIER_ORDER.length]!;
  prefs = { ...prefs, qualityTier, qualityManual: true };
  return qualityTier;
}
