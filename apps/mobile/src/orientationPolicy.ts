import { NativeModules } from 'react-native';

/**
 * 有镜头的页允许横屏。动作库、记录、总结、填重量锁竖屏。
 */
export function lockSessionOrientation(allowLandscape: boolean): void {
  const policy = NativeModules.OrientationPolicy as
    | { lock?: (mode: string) => void }
    | undefined;
  policy?.lock?.(allowLandscape ? 'all' : 'portrait');
}
