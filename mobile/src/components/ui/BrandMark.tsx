import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: { box: 32, icon: 18, label: 16 },
  md: { box: 36, icon: 20, label: 20 },
  lg: { box: 40, icon: 22, label: 24 },
} as const;

export function BrandMark({ size = 'md', showLabel = true }: BrandMarkProps) {
  const sz = sizeMap[size];
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.icon,
          { width: sz.box, height: sz.box, borderRadius: radii.lg },
        ]}
      >
        <Dumbbell size={sz.icon} color={colors.white} strokeWidth={2.25} />
      </View>
      {showLabel ? (
        <Text style={{ fontSize: sz.label, fontWeight: '700', letterSpacing: -0.2 }}>
          FitLink
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
