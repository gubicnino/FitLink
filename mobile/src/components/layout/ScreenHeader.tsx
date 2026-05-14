import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { spacing } from '../../theme';
import { Text } from '../ui/Text';

interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  align?: 'left' | 'center';
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  eyebrow,
  left,
  right,
  align = 'left',
  dark = false,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      {left ? <View style={styles.side}>{left}</View> : null}
      <View style={[styles.center, align === 'center' && styles.alignCenter]}>
        {eyebrow ? (
          <Text
            variant="caption"
            color={dark ? 'darkTextSecondary' : 'muted'}
            style={styles.eyebrow}
          >
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text
            variant="h2"
            color={dark ? 'darkText' : 'primary'}
            align={align === 'center' ? 'center' : undefined}
          >
            {title}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.side}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  side: { flexShrink: 0 },
  center: { flex: 1, minWidth: 0 },
  alignCenter: { alignItems: 'center' },
  eyebrow: { marginBottom: 2 },
});
