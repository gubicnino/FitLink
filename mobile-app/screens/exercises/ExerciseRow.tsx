import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Check, Dumbbell, Info } from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { Dot, Tag, Text } from '@/components/ui';
import type { ExerciseSummary } from '@/types/exercise';

interface ExerciseRowProps {
  exercise: ExerciseSummary;
  onPress?: () => void;
  onInfoPress?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export function ExerciseRow({
  exercise,
  onPress,
  onInfoPress,
  selectable,
  selected,
}: ExerciseRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.thumb}>
        {exercise.thumbnailUrl ? (
          <Image source={{ uri: exercise.thumbnailUrl }} style={styles.thumbImage} />
        ) : (
          <Dumbbell size={20} color={colors.primary} strokeWidth={2} />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="bodyLarge" weight="600" numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={styles.meta}>
          {exercise.category ? (
            <Text variant="micro" color="secondary">
              {capitalize(exercise.category)}
            </Text>
          ) : null}
          {exercise.category && exercise.equipment ? <Dot /> : null}
          {exercise.equipment ? (
            <Text variant="micro" color="secondary">
              {capitalize(exercise.equipment)}
            </Text>
          ) : null}
        </View>
      </View>
      {onInfoPress ? (
        <Pressable
          onPress={onInfoPress}
          hitSlop={10}
          style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}
          accessibilityLabel="Exercise details"
        >
          <Info size={18} color={colors.inkMuted} strokeWidth={2} />
        </Pressable>
      ) : null}
      {selectable ? (
        <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
          {selected ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
        </View>
      ) : exercise.level ? (
        <Tag label={capitalize(exercise.level)} tone={levelTone(exercise.level)} />
      ) : null}
    </Pressable>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function levelTone(level: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'warning';
    case 'expert':
    case 'advanced':
      return 'danger';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 44, height: 44 },
  body: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary },
  checkOff: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
});
