import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Text } from '../ui/Text';

interface TabBarItem {
  key: string;
  label: string;
  icon: (props: { size: number; color: string }) => React.ReactNode;
  badge?: number | string | null;
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
        const badge = formatBadge(item.badge);
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={styles.iconWrap}>
              {item.icon({ size: 22, color })}
              {badge != null ? (
                <View style={[styles.badge, { borderColor: palette.bg }]}>
                  <Text variant="micro" style={styles.badgeText}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
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
    const opts = options as typeof options & { tabBarBadge?: number | string | null };
    return {
      key: route.key,
      label: typeof options.title === 'string' ? options.title : route.name,
      icon: ({ size, color }) =>
        options.tabBarIcon
          ? options.tabBarIcon({ focused: route.key === focusedRouteKey, color, size })
          : null,
      badge: opts.tabBarBadge,
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

function formatBadge(badge: number | string | null | undefined): string | null {
  if (badge == null) return null;
  if (typeof badge === 'number') {
    if (badge <= 0) return null;
    return badge > 99 ? '99+' : String(badge);
  }
  const trimmed = badge.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    letterSpacing: 0,
  },
  label: { letterSpacing: 0.3 },
});
