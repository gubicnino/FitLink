import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, typography, TypographyVariant } from '../../theme';

type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'brand'
  | 'darkText'
  | 'darkTextSecondary';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorVariant;
  weight?: '400' | '500' | '600' | '700' | '800';
  mono?: boolean;
  tabular?: boolean;
  align?: TextStyle['textAlign'];
}

const colorMap: Record<ColorVariant, string> = {
  primary: colors.inkPrimary,
  secondary: colors.inkSecondary,
  muted: colors.inkMuted,
  inverse: colors.white,
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  brand: colors.primary,
  darkText: colors.dark.text,
  darkTextSecondary: colors.dark.textSecondary,
};

export function Text({
  variant = 'body',
  color = 'primary',
  weight,
  mono,
  tabular,
  align,
  style,
  ...rest
}: TextProps) {
  const variantStyle = typography[variant];
  const composed: TextStyle = {
    ...variantStyle,
    color: colorMap[color],
    ...(weight ? { fontWeight: weight } : null),
    ...(mono ? { fontFamily: typography.mono.fontFamily } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
    ...(align ? { textAlign: align } : null),
  };
  return <RNText {...rest} style={[composed, style]} />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = StyleSheet.create({});
