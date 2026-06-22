import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<ButtonSize, { height: number; padH: number; fontSize: number }> = {
  sm: { height: 32, padH: spacing.lg, fontSize: 12 },
  md: { height: 40, padH: spacing.xl, fontSize: 13 },
  lg: { height: 48, padH: spacing.xxl, fontSize: 15 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  fullWidth,
  leftIcon,
  rightIcon,
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const sz = sizeMap[size];
  const palette = getPalette(variant);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          height: sz.height,
          paddingHorizontal: sz.padH,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={[typography.button, { fontSize: sz.fontSize, color: palette.fg }]}
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

function getPalette(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.white, border: 'transparent', borderWidth: 0 };
    case 'accent':
      return { bg: colors.accent, fg: colors.white, border: 'transparent', borderWidth: 0 };
    case 'secondary':
      return {
        bg: colors.surfaceElevated,
        fg: colors.inkPrimary,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'outline':
      return {
        bg: colors.surface,
        fg: colors.primary,
        border: colors.primary,
        borderWidth: 1.5,
      };
    case 'ghost':
      return {
        bg: 'transparent',
        fg: colors.inkSecondary,
        border: colors.line,
        borderWidth: 1.5,
      };
    case 'dark':
      return {
        bg: colors.dark.elevated,
        fg: colors.white,
        border: 'transparent',
        borderWidth: 0,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
