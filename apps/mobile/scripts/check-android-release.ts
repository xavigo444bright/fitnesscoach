/**
 * 安卓直装包自检：录屏入口关掉、图标跟 iOS、20 条跟练齐。
 *   pnpm --filter @fitness-coach/mobile check:android-release
 */
import {
  EXERCISE_CATALOG,
  isCoachableId,
} from '@fitness-coach/core';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isScreenRecordingSupported } from '../src/screenRecordSupport.ts';
import { getExerciseSession } from '../src/exerciseSession.ts';

const fail = (msg: string): never => {
  console.error('[check-android-release] FAIL', msg);
  process.exit(1);
  throw new Error(msg);
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 已过真机、本版必须进包的 20 条。 */
const SHIP_20 = [
  'pushup',
  'bench-press',
  'db-fly',
  'dip',
  'incline-pushup',
  'cable-crossover',
  'chest-press-machine',
  'ohp',
  'lateral-raise',
  'front-raise',
  'rear-delt-fly',
  'face-pull',
  'pike-pushup',
  'db-row',
  'pullup',
  'squat',
  'glute-bridge',
  'lunge',
  'rdl',
  'plank',
] as const;

function assertScreenRecordGate(): void {
  if (isScreenRecordingSupported('android')) {
    fail('android must not expose screen recording');
  }
  if (!isScreenRecordingSupported('ios')) {
    fail('ios must keep screen recording');
  }
  const pose = readFileSync(join(ROOT, 'src/screens/DevPoseScreen.tsx'), 'utf8');
  if (!pose.includes('SCREEN_RECORD_AVAILABLE')) {
    fail('DevPoseScreen must gate the record control');
  }
  const recIdx = pose.indexOf('onToggleRecord');
  const gateIdx = pose.lastIndexOf('SCREEN_RECORD_AVAILABLE', recIdx);
  if (recIdx < 0 || gateIdx < 0 || recIdx - gateIdx > 400) {
    fail('record button is not behind SCREEN_RECORD_AVAILABLE');
  }
}

function assertAndroidIcon(): void {
  const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
    expo: {
      icon: string;
      android: {
        icon?: string;
        adaptiveIcon: {
          backgroundColor: string;
          foregroundImage: string;
          backgroundImage: string;
        };
      };
    };
  };
  const adaptive = app.expo.android.adaptiveIcon;
  if (adaptive.backgroundColor.toLowerCase() !== '#000000') {
    fail(`android adaptive backgroundColor ${adaptive.backgroundColor}`);
  }
  if (adaptive.foregroundImage !== './assets/icon.png') {
    fail(`android foreground must be the iOS icon, got ${adaptive.foregroundImage}`);
  }
  if (app.expo.android.icon !== './assets/icon.png') {
    fail('android.icon must match iOS icon.png');
  }
  const bg = join(ROOT, adaptive.backgroundImage.replace('./', ''));
  if (!existsSync(bg)) fail(`missing ${bg}`);
  const fg = join(ROOT, 'assets/icon.png');
  if (statSync(fg).size < 1000) fail('icon.png too small');
}

function assertShip20(): void {
  const coachable = EXERCISE_CATALOG.filter((e) => e.tier === 'coachable').map(
    (e) => e.id,
  );
  for (const id of SHIP_20) {
    if (!coachable.includes(id)) fail(`${id} is not coachable`);
    if (!isCoachableId(id)) fail(`${id} fails isCoachableId`);
    const session = getExerciseSession(id);
    if (!session || session.id !== id) fail(`${id} missing exerciseSession`);
  }
  if (SHIP_20.length !== 20) fail('SHIP_20 length');
}

function main(): void {
  assertScreenRecordGate();
  assertAndroidIcon();
  assertShip20();
  console.log(
    '[check-android-release] OK',
    `coachable=${EXERCISE_CATALOG.filter((e) => e.tier === 'coachable').length}`,
    'ship20=20',
  );
}

main();
