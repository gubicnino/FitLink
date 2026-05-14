import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type CardVariant = 'surface' | 'elevated' | 'dark' | 'darkElevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: keyof typeof radii;
  bordered?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.lg,
  md: spacing.xl,
  lg: spacing.xxl,
};

export function Card({
  children,
  variant = 'surface',
  padding = 'md',
  radius = 'lg',
  bordered = true,
  onPress,
  style,
}: CardProps) {
  const palette = getPalette(variant);
  const composed = [
    styles.base,
    {
      backgroundColor: palette.bg,
      borderRadius: radii[radius],
      padding: paddingMap[padding],
      borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
      borderColor: palette.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.surfaceElevated }}
        style={({ pressed }) => [composed, pressed && { opacity: 0.95 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={composed}>{children}</View>;
}

function getPalette(variant: CardVariant) {
  switch (variant) {
    case 'surface':
      return { bg: colors.surface, border: colors.line };
    case 'elevated':
      return { bg: colors.surfaceElevated, border: colors.line };
    case 'dark':
      return { bg: colors.dark.surface, border: colors.dark.border };
    case 'darkElevated':
      return { bg: colors.dark.elevated, border: colors.dark.border };
  }
}

const styles = StyleSheet.create({
  base: {},
});
