import { Dimensions, type ScrollView } from 'react-native';

export type WindowNode = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

/** 格子已经被键盘挡住时，只把这一格滚到键盘上沿。已经露出来就不滚。 */
export function scrollIntoKeyboard(
  node: WindowNode | null,
  keyboardHeight: number,
  scrollY: { current: number },
  scroll: ScrollView | null,
  gap = 12,
): void {
  if (!node || keyboardHeight <= 0 || !scroll) return;
  node.measureInWindow((_x, y, _width, height) => {
    const keyboardTop = Dimensions.get('window').height - keyboardHeight;
    const overlap = y + height + gap - keyboardTop;
    if (overlap > 1) {
      scroll.scrollTo({
        y: Math.max(0, scrollY.current + overlap),
        animated: true,
      });
    }
  });
}
