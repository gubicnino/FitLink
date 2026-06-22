import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Text } from './Text';

interface StepperProps {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Stepper({
  label,
  value,
  unit,
  step = 1,
  onIncrement,
  onDecrement,
  dark = false,
  style,
}: StepperProps) {
  const palette = dark
    ? {
        bg: colors.dark.elevated,
        btnBg: colors.dark.bg,
        iconColor: colors.white,
        labelColor: colors.dark.textSecondary,
        valueColor: colors.dark.text,
        unitColor: colors.dark.textSecondary,
      }
    : {
        bg: colors.surfaceElevated,
        btnBg: colors.surface,
        iconColor: colors.inkPrimary,
        labelColor: colors.inkMuted,
        valueColor: colors.inkPrimary,
        unitColor: colors.inkSecondary,
      };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }, style]}>
      <Text variant="caption" style={[styles.label, { color: palette.labelColor }]}>
        {label}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: palette.btnBg, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Minus size={14} color={palette.iconColor} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.valueBlock}>
          <Text
            mono
            tabular
            style={{ fontSize: 22, fontWeight: '700', color: palette.valueColor }}
          >
            {value}
          </Text>
          {unit ? (
            <Text style={{ fontSize: 12, color: palette.unitColor, marginLeft: 4 }}>
              {unit}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: palette.btnBg, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Plus size={14} color={palette.iconColor} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  label: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBlock: { flexDirection: 'row', alignItems: 'baseline' },
});
