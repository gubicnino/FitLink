import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Card, Text } from '../../components/ui';

export interface MoodOption {
  value: number;
  label: string;
}

interface MoodPickerProps {
  options: MoodOption[];
  value: number;
  onChange: (value: number) => void;
}

export function MoodPicker({ options, value, onChange }: MoodPickerProps) {
  return (
    <Card padding="sm">
      <View style={styles.row}>
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={[styles.bubble, active ? styles.bubbleActive : styles.bubbleIdle]}>
                <Text
                  mono
                  tabular
                  weight="700"
                  style={{ fontSize: 14, color: active ? colors.white : colors.inkSecondary }}
                >
                  {opt.value}
                </Text>
              </View>
              <Text
                variant="micro"
                color={active ? 'brand' : 'muted'}
                weight="500"
                align="center"
                style={styles.label}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: { backgroundColor: colors.primary },
  bubbleIdle: { backgroundColor: colors.surfaceElevated },
  label: { fontSize: 9, lineHeight: 12 },
});
