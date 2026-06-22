import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Text } from './Text';

interface TabSwitcherProps<T extends string> {
  tabs: readonly T[];
  value: T;
  onChange: (next: T) => void;
}

export function TabSwitcher<T extends string>({ tabs, value, onChange }: TabSwitcherProps<T>) {
  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const active = tab === value;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <Text
              variant="bodySmall"
              color={active ? 'primary' : 'secondary'}
              weight={active ? '600' : '500'}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
});
