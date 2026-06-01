import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from '../../components/ui';

export interface MoodOption {
  value: number;
  label: string;
}

interface MoodPickerProps {
  options: MoodOption[];
  value: number;
  onChange: (value: number) => void;
}

// Use battery-charge ikone v stilu "energy level" (intuitively, naraščajoče).
// Tako se ne zaletimo v platform emoji rendering inconsistencies.
const ENERGY_ICONS: Record<number, (props: { color: string; size: number }) => React.ReactElement> = {
  1: ({ color, size }) => <BatteryLow size={size} color={color} strokeWidth={2.25} />,
  2: ({ color, size }) => <BatteryLow size={size} color={color} strokeWidth={2.25} />,
  3: ({ color, size }) => <BatteryMedium size={size} color={color} strokeWidth={2.25} />,
  4: ({ color, size }) => <BatteryFull size={size} color={color} strokeWidth={2.25} />,
  5: ({ color, size }) => <BatteryCharging size={size} color={color} strokeWidth={2.5} />,
};

export function MoodPicker({ options, value, onChange }: MoodPickerProps) {
  const active = options.find(o => o.value === value);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {options.map(opt => {
          const isActive = opt.value === value;
          const IconCmp = ENERGY_ICONS[opt.value] ?? Battery;
          const iconColor = isActive ? colors.white : colors.inkSecondary;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.bubble,
                isActive ? styles.bubbleActive : styles.bubbleIdle,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Energy ${opt.value} of ${options.length}: ${opt.label}`}
            >
              <IconCmp color={iconColor} size={18} />
              <Text
                mono
                tabular
                weight="800"
                style={[styles.bubbleNumber, { color: iconColor }]}
              >
                {opt.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {active ? (
        <View style={styles.activeLabel}>
          <View style={styles.activeDot} />
          <Text variant="bodySmall" weight="800" color="brand" style={styles.activeText}>
            {active.label.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  bubble: {
    flex: 1,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
  },
  bubbleIdle: { backgroundColor: colors.surface, borderColor: colors.line },
  bubbleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubbleNumber: { fontSize: 12, lineHeight: 14 },

  activeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  activeText: { letterSpacing: 1.4 },
});
