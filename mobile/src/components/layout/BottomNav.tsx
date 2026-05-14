import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radii, shadows, spacing } from '../../theme';
import { Text } from '../ui/Text';

interface TabBarItem {
  key: string;
  label: string;
  icon: (props: { size: number; color: string }) => React.ReactNode;
}

interface BottomNavProps {
  items: TabBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  dark?: boolean;
}

export function BottomNav({ items, activeKey, onSelect, dark = false }: BottomNavProps) {
  const palette = getPalette(dark);
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: palette.bg, borderColor: palette.border },
        shadows.nav,
      ]}
    >
      {items.map(item => {
        const active = item.key === activeKey;
        const color = active ? palette.active : palette.idle;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {item.icon({ size: 22, color })}
            <Text
              variant="micro"
              style={[styles.label, { color, fontWeight: active ? '600' : '500' }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Bridge: adapt React Navigation's BottomTabBarProps into our BottomNav.
 * Expects each route's `options.tabBarIcon` to be a function returning an element.
 */
export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focusedRouteKey = state.routes[state.index].key;
  const dark =
    (descriptors[focusedRouteKey].options as { dark?: boolean })?.dark ?? false;
  const items: TabBarItem[] = state.routes.map(route => {
    const { options } = descriptors[route.key];
    return {
      key: route.key,
      label: typeof options.title === 'string' ? options.title : route.name,
      icon: ({ size, color }) =>
        options.tabBarIcon
          ? options.tabBarIcon({ focused: route.key === focusedRouteKey, color, size })
          : null,
    };
  });
  return (
    <BottomNav
      items={items}
      activeKey={focusedRouteKey}
      onSelect={key => {
        const route = state.routes.find(r => r.key === key);
        if (!route) return;
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }}
      dark={dark}
    />
  );
}

function getPalette(dark: boolean) {
  return dark
    ? {
        bg: colors.dark.surface,
        border: colors.dark.border,
        active: colors.white,
        idle: colors.dark.textSecondary,
      }
    : {
        bg: colors.surface,
        border: colors.line,
        active: colors.primary,
        idle: colors.inkMuted,
      };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.xs,
    borderTopWidth: 1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    gap: 4,
  },
  label: { letterSpacing: 0.3 },
});
