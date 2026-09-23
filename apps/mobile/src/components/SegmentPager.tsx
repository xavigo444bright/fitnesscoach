/**
 * 页内分段左右滑。与 SegmentedControl 共用同一 value。
 * 不用新原生模块，避免重装 Dev Client。
 */
import {
  pageIndexFromOffset,
  pageOffsetX,
  segmentIndexOf,
  segmentKeyAt,
} from '@fitness-coach/ui';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

type Item<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  items: readonly Item<K>[];
  value: K;
  onChange: (key: K) => void;
  children: ReactNode;
};

export default function SegmentPager<K extends string>({
  items,
  value,
  onChange,
  children,
}: Props<K>) {
  const pages = Children.toArray(children);
  const scrollRef = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const index = segmentIndexOf(items, value);

  useEffect(() => {
    if (size.width <= 0 || dragging.current) return;
    scrollRef.current?.scrollTo({
      x: pageOffsetX(index, size.width),
      animated: true,
    });
  }, [index, size.width]);

  if (size.width <= 0 || size.height <= 0) {
    return (
      <View
        style={styles.fill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize({ width, height });
        }}
      />
    );
  }

  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.width || height !== size.height) {
          setSize({ width, height });
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ width: size.width, height: size.height }}
        contentOffset={{ x: pageOffsetX(index, size.width), y: 0 }}
        onScrollBeginDrag={() => {
          dragging.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          dragging.current = false;
          const next = pageIndexFromOffset(
            e.nativeEvent.contentOffset.x,
            size.width,
            items.length,
          );
          const key = segmentKeyAt(items, next);
          if (key !== value) onChange(key);
        }}
      >
        {pages.map((page, i) => (
          <View
            key={items[i]?.key ?? String(i)}
            style={{ width: size.width, height: size.height }}
          >
            {page}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
