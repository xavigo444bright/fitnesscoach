/**
 * 详情页预渲染 demo 资源表。
 * 将 mp4 放入 assets/demos/ 后，在下方 registry 取消对应 require 注释。
 * Metro 要求 require 路径静态存在，故未入库的文件不要写 require。
 */
import type { AVPlaybackSource } from 'expo-av';

const registry: Record<string, AVPlaybackSource> = {
  // 'squat.mp4': require('../assets/demos/squat.mp4'),
  // 'pushup.mp4': require('../assets/demos/pushup.mp4'),
};

export function resolveDemoAsset(
  filename: string | undefined,
): AVPlaybackSource | null {
  if (!filename) return null;
  return registry[filename] ?? null;
}
