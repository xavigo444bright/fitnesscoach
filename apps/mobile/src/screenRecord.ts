import { NativeModules } from 'react-native';
import { translate } from './i18n/locale';

/** 调试页一条录屏最长 3 分钟。到点只停录制。 */
export const SCREEN_RECORD_LIMIT_MS = 180_000;

type StopResult = 'saved' | 'failed' | 'idle';

type RecorderNative = {
  start: () => Promise<boolean>;
  stop: () => Promise<StopResult>;
};

let active = false;
let epoch = 0;
let starting: Promise<boolean> | null = null;
let inFlight: Promise<void> | null = null;
let savedThisVisit = 0;
let toastListener: ((message: string, ms: number) => void) | null = null;

function recorder(): RecorderNative | null {
  const mod = NativeModules.ScreenRecorder as RecorderNative | undefined;
  if (!mod || typeof mod.start !== 'function' || typeof mod.stop !== 'function') {
    return null;
  }
  return mod;
}

export function beginScreenRecordVisit(): void {
  savedThisVisit = 0;
}

export function subscribeSavedToast(
  listener: (message: string, ms: number) => void,
): () => void {
  toastListener = listener;
  return () => {
    if (toastListener === listener) toastListener = null;
  };
}

export function showSavedOnDeviceToast(): void {
  toastListener?.(translate('已保存本机'), 500);
}

export function showRecordHint(zh: string, ms = 1500): void {
  toastListener?.(translate(zh), ms);
}

/** 这次调试页里存进过相册，离开时闪一次。 */
export function consumeScreenRecordExit(): boolean {
  const show = savedThisVisit > 0;
  savedThisVisit = 0;
  return show;
}

export async function startScreenRecording(): Promise<boolean> {
  if (active || inFlight || starting) return false;
  const native = recorder();
  if (!native) {
    showRecordHint('这台 Debug 还没编进录屏');
    return false;
  }
  const gen = epoch;
  starting = (async () => {
    try {
      const ok = await native.start();
      if (!ok) {
        showRecordHint('现在不能录');
        return false;
      }
      active = true;
      if (gen !== epoch) {
        await finishScreenRecording();
        return false;
      }
      return true;
    } catch (error) {
      active = false;
      const text = String(error ?? '');
      showRecordHint(
        text.includes('photos') ? '没有相册权限' : '现在不能录',
      );
      return false;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

/** 红点、3 分钟、切出去、离开调试页都走这里。离开前会把还没开始完的那次也停掉。 */
export async function stopScreenRecording(): Promise<void> {
  epoch += 1;
  if (starting) await starting;
  await finishScreenRecording();
}

/** 停掉当前这条并写入相册。没在录、或上一次还在停，都安全。 */
export function finishScreenRecording(): Promise<void> {
  if (inFlight) return inFlight;
  if (!active) return Promise.resolve();
  active = false;
  const native = recorder();
  if (!native) return Promise.resolve();
  inFlight = native
    .stop()
    .then((result) => {
      if (result === 'saved') savedThisVisit += 1;
    })
    .catch(() => {
      /* 没存成就不计入离开提示 */
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
