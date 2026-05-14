import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

type TagTone =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'overlay'
  | 'dark';

interface TagProps {
  label: string;
  tone?: TagTone;
  style?: StyleProp<ViewStyle>;
  uppercase?: boolean;
}

export function Tag({ label, tone = 'neutral', style, uppercase = false }: TagProps) {
  const palette = getPalette(tone);
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      <Text
        variant="micro"
        style={[
          { color: palette.fg, fontWeight: '600' },
          uppercase && styles.uppercase,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getPalette(tone: TagTone) {
  switch (tone) {
    case 'primary':
      return { bg: colors.primarySoftStrong, fg: colors.primary, border: 'transparent' };
    case 'accent':
      return { bg: colors.accentSoft, fg: colors.accent, border: 'transparent' };
    case 'success':
      return { bg: colors.successSoft, fg: colors.success, border: 'transparent' };
    case 'warning':
      return { bg: colors.warningSoft, fg: colors.warning, border: 'transparent' };
    case 'danger':
      return { bg: 'rgba(239,68,68,0.10)', fg: colors.danger, border: 'transparent' };
    case 'overlay':
      return { bg: 'rgba(255,255,255,0.18)', fg: colors.white, border: 'transparent' };
    case 'dark':
      return { bg: colors.dark.elevated, fg: colors.dark.text, border: 'transparent' };
    case 'neutral':
    default:
      return { bg: colors.surfaceElevated, fg: colors.inkSecondary, border: colors.line };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
    borderWidth: 0,
  },
  uppercase: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
