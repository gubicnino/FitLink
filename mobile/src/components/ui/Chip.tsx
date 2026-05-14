import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  variant?: 'pill' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  rightIcon,
  leftIcon,
  variant = 'pill',
  style,
}: ChipProps) {
  const palette = getPalette(selected, variant);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
        },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Text variant="micro" style={{ color: palette.fg, fontWeight: '600' }}>
        {label}
      </Text>
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </Pressable>
  );
}

function getPalette(selected: boolean, variant: 'pill' | 'outline') {
  if (selected) {
    return {
      bg: colors.inkPrimary,
      fg: colors.white,
      border: 'transparent',
      borderWidth: 0,
    };
  }
  if (variant === 'outline') {
    return { bg: colors.surface, fg: colors.inkSecondary, border: colors.line, borderWidth: 1 };
  }
  return { bg: colors.surface, fg: colors.inkSecondary, border: colors.line, borderWidth: 1 };
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
