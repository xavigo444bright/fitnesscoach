/**
 * 详情页预渲染 demo 资源表。
 * 将 mp4 放入 assets/demos/ 后，在下方 registry 取消对应 require 注释。
 * Metro 要求 require 路径静态存在，故未入库的文件不要写 require。
 *
 * 不依赖 expo-av 类型，避免旧 Dev Client 无 ExponentAV 时整包加载失败。
 */
export type DemoPlaybackSource = number | { uri: string };

const registry: Record<string, DemoPlaybackSource> = {
  // 'squat.mp4': require('../assets/demos/squat.mp4'),
  // 'pushup.mp4': require('../assets/demos/pushup.mp4'),
};

export function resolveDemoAsset(
  filename: string | undefined,
): DemoPlaybackSource | null {
  if (!filename) return null;
  return registry[filename] ?? null;
}
