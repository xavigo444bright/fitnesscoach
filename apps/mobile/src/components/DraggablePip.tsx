/**
 * 示范窗拖到全屏任意位置（不吸附贴边）。松手后停在落下处。
 * 收起时尺寸收成手柄并滑向水平近边（FR-084）。
 */
import {
  clampPipPosition,
  collapsedTabPosition,
  defaultPipPosition,
  layout,
  pipSizeForScreen,
  restoredPipPosition,
} from '@fitness-coach/ui';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder } from 'react-native';

type Props = {
  screenW: number;
  screenH: number;
  insetRight?: number;
  insetBottom?: number;
  collapsed: boolean;
  children: ReactNode;
};

const TAB_W = layout.refPersonPipTabWidth;
const TAB_H = layout.refPersonPipTabHeight;

export default function DraggablePip({
  screenW,
  screenH,
  insetRight = 0,
  insetBottom = 0,
  collapsed,
  children,
}: Props) {
  const expanded = pipSizeForScreen(
    screenW,
    screenH,
    layout.bottomBarHeight + insetBottom,
  );
  const pipW = collapsed ? TAB_W : expanded.width;
  const pipH = collapsed ? TAB_H : expanded.height;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const readyRef = useRef(false);
  const expandedPosRef = useRef({ x: 0, y: 0 });
  const wasCollapsedRef = useRef(false);
  const landscapeRef = useRef(screenW > screenH);

  useLayoutEffect(() => {
    if (screenW <= 0 || screenH <= 0) return;
    const landscape = screenW > screenH;
    const flipped = readyRef.current && landscapeRef.current !== landscape;
    landscapeRef.current = landscape;
    const placeDefault = () => {
      const start = defaultPipPosition(
        screenW,
        screenH,
        expanded.width,
        expanded.height,
        { right: insetRight, bottom: insetBottom },
      );
      expandedPosRef.current = start;
      const next = collapsed
        ? collapsedTabPosition(
            start,
            screenW,
            screenH,
            expanded.width,
            expanded.height,
            TAB_W,
            TAB_H,
          )
        : start;
      posRef.current = next;
      pan.setValue(next);
      readyRef.current = true;
      wasCollapsedRef.current = collapsed;
    };
    if (!readyRef.current || flipped) {
      placeDefault();
      return;
    }

    if (collapsed && !wasCollapsedRef.current) {
      expandedPosRef.current = { ...posRef.current };
      const tab = collapsedTabPosition(
        expandedPosRef.current,
        screenW,
        screenH,
        expanded.width,
        expanded.height,
        TAB_W,
        TAB_H,
      );
      posRef.current = tab;
      pan.setValue(tab);
    } else if (!collapsed && wasCollapsedRef.current) {
      const restored = restoredPipPosition(
        expandedPosRef.current,
        screenW,
        screenH,
        expanded.width,
        expanded.height,
      );
      posRef.current = restored;
      pan.setValue(restored);
    } else {
      const next = clampPipPosition(
        posRef.current.x,
        posRef.current.y,
        screenW,
        screenH,
        pipW,
        pipH,
      );
      posRef.current = next;
      pan.setValue(next);
    }
    wasCollapsedRef.current = collapsed;
  }, [
    collapsed,
    expanded.height,
    expanded.width,
    insetBottom,
    insetRight,
    pan,
    pipH,
    pipW,
    screenH,
    screenW,
  ]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 8,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.hypot(g.dx, g.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStartRef.current = { ...posRef.current };
        },
        onPanResponderMove: (_, g) => {
          const next = clampPipPosition(
            dragStartRef.current.x + g.dx,
            dragStartRef.current.y + g.dy,
            screenW,
            screenH,
            pipW,
            pipH,
          );
          posRef.current = next;
          pan.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const next = clampPipPosition(
            dragStartRef.current.x + g.dx,
            dragStartRef.current.y + g.dy,
            screenW,
            screenH,
            pipW,
            pipH,
          );
          posRef.current = next;
          pan.setValue(next);
          if (!collapsed) expandedPosRef.current = next;
        },
        onPanResponderTerminate: (_, g) => {
          const next = clampPipPosition(
            dragStartRef.current.x + g.dx,
            dragStartRef.current.y + g.dy,
            screenW,
            screenH,
            pipW,
            pipH,
          );
          posRef.current = next;
          pan.setValue(next);
          if (!collapsed) expandedPosRef.current = next;
        },
      }),
    [collapsed, pan, pipH, pipW, screenH, screenW],
  );

  const box = {
    position: 'absolute' as const,
    width: pipW,
    height: pipH,
    left: pan.x,
    top: pan.y,
    zIndex: 110,
    elevation: 110,
  };

  return (
    <Animated.View
      style={box}
      {...responder.panHandlers}
      accessibilityLabel={collapsed ? '示范窗已收起' : '拖动示范窗'}
      accessibilityRole="adjustable"
    >
      {children}
    </Animated.View>
  );
}
