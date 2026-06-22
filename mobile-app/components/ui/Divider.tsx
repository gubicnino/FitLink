import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@/constants/theme';
import { Text } from './Text';

interface DividerProps {
  label?: string;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ label, dark, style }: DividerProps) {
  const lineColor = dark ? colors.dark.border : colors.line;
  if (!label) {
    return <View style={[styles.line, { backgroundColor: lineColor }, style]} />;
  }
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.flexLine, { backgroundColor: lineColor }]} />
      <Text variant="caption" color={dark ? 'darkTextSecondary' : 'muted'}>
        {label}
      </Text>
      <View style={[styles.flexLine, { backgroundColor: lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  flexLine: { flex: 1, height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
