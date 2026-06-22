import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface StarRatingProps {
  value: number; // 0..5 (integer)
  size?: number;
  outOf?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function StarRating({
  value,
  size = 12,
  outOf = 5,
  activeColor = colors.warning,
  inactiveColor = colors.line,
}: StarRatingProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: outOf }).map((_, i) => {
        const filled = i < value;
        return (
          <Star
            key={i}
            size={size}
            color={filled ? activeColor : inactiveColor}
            fill={filled ? activeColor : inactiveColor}
            strokeWidth={0}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
