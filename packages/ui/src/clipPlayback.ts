/**
 * 示范窗原片播放控制（FR-086）：点击暂停/播放；倍速循环切换。
 */
export const CLIP_PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

export type ClipPlaybackRate = (typeof CLIP_PLAYBACK_RATES)[number];

export const DEFAULT_CLIP_PLAYBACK_RATE: ClipPlaybackRate = 1;

export function nextClipPlaybackRate(current: number): ClipPlaybackRate {
  const i = CLIP_PLAYBACK_RATES.findIndex((rate) => rate === current);
  const idx = i < 0 ? 0 : (i + 1) % CLIP_PLAYBACK_RATES.length;
  return CLIP_PLAYBACK_RATES[idx]!;
}

export function formatClipPlaybackRate(rate: number): string {
  if (rate === 1) return "1x";
  const text = Number.isInteger(rate) ? `${rate}` : String(rate);
  return `${text}x`;
}

/**
 * expo-av 换 source 后 isLooping 常丢（侧→正换片只播一遍）。
 * 播完且用户仍要播放时，应从头重开循环。
 */
export function shouldRestartClipLoop(
  status: { isLoaded: boolean; didJustFinish?: boolean },
  playing: boolean,
): boolean {
  return playing && status.isLoaded && status.didJustFinish === true;
}

/**
 * 切「骨骼」时不要拆掉 AVPlayer：只暂停。切回样片 / 换站位只换 source。
 * 拆实例再挂新 Video，真机常停在首帧（骨骼侧→正→样片侧→样片正）。
 */
export function clipShouldPlay(
  mode: "clip" | "bones",
  userPlaying: boolean,
): boolean {
  return mode === "clip" && userPlaying;
}

export function clipPlayerInitialStatus(
  playing: boolean,
  rate: number,
): {
  isLooping: true;
  isMuted: true;
  shouldPlay: boolean;
  rate: number;
  shouldCorrectPitch: false;
} {
  return {
    isLooping: true,
    isMuted: true,
    shouldPlay: playing,
    rate,
    shouldCorrectPitch: false,
  };
}
