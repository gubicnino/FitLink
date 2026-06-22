import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '@/constants/theme';

interface ProgressBarProps {
  value: number; // 0..1
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  height = 4,
  trackColor = colors.surfaceElevated,
  fillColor = colors.primary,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: radii.pill,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', alignSelf: 'stretch' },
});
