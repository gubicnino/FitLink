import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '@/constants/theme';

type IconButtonVariant = 'surface' | 'dark' | 'overlay' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: 'circle' | 'square';
  style?: StyleProp<ViewStyle>;
  withBorder?: boolean;
}

const sizeMap: Record<IconButtonSize, number> = {
  sm: 32,
  md: 36,
  lg: 40,
};

export function IconButton({
  children,
  variant = 'surface',
  size = 'lg',
  shape = 'circle',
  withBorder,
  style,
  ...rest
}: IconButtonProps) {
  const dim = sizeMap[size];
  const palette = getPalette(variant);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: shape === 'circle' ? dim / 2 : radii.lg,
          backgroundColor: palette.bg,
          borderWidth: withBorder ? 1 : 0,
          borderColor: palette.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function getPalette(variant: IconButtonVariant) {
  switch (variant) {
    case 'surface':
      return { bg: colors.surface, border: colors.line };
    case 'dark':
      return { bg: colors.dark.surface, border: colors.dark.border };
    case 'overlay':
      return { bg: 'rgba(0,0,0,0.4)', border: 'transparent' };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent' };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
