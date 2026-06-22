import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { FitLinkMark } from '../brand/FitLinkMark';
import { Text } from './Text';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: { mark: 32, label: 16 },
  md: { mark: 40, label: 20 },
  lg: { mark: 48, label: 24 },
} as const;

export function BrandMark({ size = 'md', showLabel = true }: BrandMarkProps) {
  const sz = sizeMap[size];
  return (
    <View style={styles.row}>
      <FitLinkMark size={sz.mark} tone="light" />
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
});
