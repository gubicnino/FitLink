import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface DotProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Dot({ size = 2, color = colors.inkMuted, style }: DotProps) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
