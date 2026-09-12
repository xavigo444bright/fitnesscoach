/**
 * 浮动药丸底栏：恰好 2 项。禁止中间凸起钮。
 */
import {
  SHELL_TABS,
  colors,
  fontSize,
  layout,
  radius,
} from '@fitness-coach/ui';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../navigation/chrome';

const ICONS = {
  Home: { on: 'home', off: 'home-outline' },
  Log: { on: 'calendar', off: 'calendar-outline' },
} as const;

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  if (state.routes.length !== SHELL_TABS.length) {
    throw new Error(
      `shell tab count must be ${SHELL_TABS.length}, got ${state.routes.length}`,
    );
  }
  const routes = state.routes;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + layout.tabBarInset }]}
    >
      <View style={styles.pill} accessibilityRole="tablist">
        {routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            SHELL_TABS[index]?.label ??
            options.tabBarLabel?.toString() ??
            options.title ??
            route.name;
          const icons = route.name === 'Log' ? ICONS.Log : ICONS.Home;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.tab}
            >
              <Ionicons
                name={focused ? icons.on : icons.off}
                size={22}
                color={focused ? colors.tabActive : colors.tabInactive}
                accessible={false}
              />
              <Text style={[styles.caption, focused && styles.captionOn]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  pill: {
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: radius.tabBar,
    backgroundColor: colors.tabBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  caption: {
    color: colors.tabInactive,
    fontSize: fontSize.meta,
    fontWeight: '600',
  },
  captionOn: {
    color: colors.tabActive,
  },
});
