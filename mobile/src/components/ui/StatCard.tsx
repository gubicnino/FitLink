import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  valueColor?: 'primary' | 'accent' | 'brand';
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({
  label,
  value,
  unit,
  valueColor = 'primary',
  footer,
  style,
}: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text variant="caption" color="muted" style={styles.label}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text mono tabular style={styles.value} color={valueColor}>
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="secondary" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  label: { marginBottom: spacing.sm },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.xs },
  value: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  unit: { marginLeft: spacing.xs },
});
