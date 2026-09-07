/**
 * 示范窗拖到全屏任意位置（不吸附贴边）。松手后停在落下处。
 * 收起时尺寸收成手柄并滑向水平近边（FR-084）。
 */
import {
  clampPipPosition,
  collapsedTabPosition,
  defaultPipPosition,
  layout,
  restoredPipPosition,
} from '@fitness-coach/ui';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder } from 'react-native';

type Props = {
  screenW: number;
  screenH: number;
  collapsed: boolean;
  children: ReactNode;
};

const PIP_W = layout.refPersonPipWidth;
const PIP_H = layout.refPersonPipHeight;
const TAB_W = layout.refPersonPipTabWidth;
const TAB_H = layout.refPersonPipTabHeight;

export default function DraggablePip({
  screenW,
  screenH,
  collapsed,
  children,
}: Props) {
  const pipW = collapsed ? TAB_W : PIP_W;
  const pipH = collapsed ? TAB_H : PIP_H;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const readyRef = useRef(false);
  const expandedPosRef = useRef({ x: 0, y: 0 });
  const wasCollapsedRef = useRef(false);

  useLayoutEffect(() => {
    if (screenW <= 0 || screenH <= 0) return;
    if (!readyRef.current) {
      const start = defaultPipPosition(screenW, screenH, PIP_W, PIP_H);
      posRef.current = start;
      expandedPosRef.current = start;
      pan.setValue(start);
      readyRef.current = true;
      wasCollapsedRef.current = collapsed;
      return;
    }

    if (collapsed && !wasCollapsedRef.current) {
      expandedPosRef.current = { ...posRef.current };
      const tab = collapsedTabPosition(
        expandedPosRef.current,
        screenW,
        screenH,
        PIP_W,
        PIP_H,
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
        PIP_W,
        PIP_H,
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
  }, [collapsed, pan, pipH, pipW, screenH, screenW]);

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
