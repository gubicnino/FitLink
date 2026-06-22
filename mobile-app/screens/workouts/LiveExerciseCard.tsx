import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  Dumbbell,
  Info,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { IconButton, Text } from '@/components/ui';
import type { LiveExercise, LiveSet } from '@/types/workout';
import { setTypeMeta } from '@/utils/setTypeMeta';

interface Props {
  exercise: LiveExercise;
  onCompleteSet: (setId: string) => void;
  onChangeSet: (setId: string, patch: Partial<LiveSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onInfoPress: () => void;
  onSetTypePress: (setId: string, setIdx: number) => void;
}

export function LiveExerciseCard({
  exercise,
  onCompleteSet,
  onChangeSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onInfoPress,
  onSetTypePress,
}: Props) {
  const completed = exercise.sets.filter(s => s.completed).length;
  const total = exercise.sets.length;
  const allDone = total > 0 && completed === total;

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      <View style={styles.header}>
        <View style={styles.thumb}>
          {exercise.thumbnailUrl ? (
            <Image source={{ uri: exercise.thumbnailUrl }} style={styles.thumbImage} />
          ) : (
            <Dumbbell size={18} color={colors.primary} strokeWidth={2} />
          )}
        </View>
        <View style={styles.headerText}>
          <Text variant="bodyLarge" weight="700" numberOfLines={1} style={styles.exerciseName}>
            {exercise.name}
          </Text>
          <View style={styles.headerMeta}>
            <Text variant="micro" weight="700" style={styles.progressLabel}>
              {completed}/{total} sets
            </Text>
            {exercise.category ? (
              <>
                <View style={styles.metaDot} />
                <Text variant="micro" color="secondary">
                  {capitalize(exercise.category)}
                </Text>
              </>
            ) : null}
            {exercise.addedLive ? (
              <>
                <View style={styles.metaDot} />
                <Text variant="micro" weight="700" style={{ color: colors.primary }}>
                  LIVE
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton variant="ghost" size="sm" onPress={onInfoPress}>
            <Info size={16} color={colors.inkSecondary} strokeWidth={2} />
          </IconButton>
          <IconButton variant="ghost" size="sm" onPress={onRemoveExercise}>
            <Trash2 size={15} color={colors.danger} strokeWidth={2} />
          </IconButton>
        </View>
      </View>

      {total > 0 ? (
        <View style={styles.miniProgress}>
          <View
            style={[
              styles.miniProgressFill,
              { width: `${(completed / total) * 100}%` },
              allDone && { backgroundColor: colors.success },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text variant="caption" color="muted" style={[styles.colSet, styles.headerCell]}>
            SET
          </Text>
          <Text variant="caption" color="muted" style={[styles.colReps, styles.headerCell]}>
            REPS
          </Text>
          <Text variant="caption" color="muted" style={[styles.colWeight, styles.headerCell]}>
            KG
          </Text>
          <View style={styles.colRemove} />
          <View style={styles.colDone} />
        </View>

        {exercise.sets.map((set, idx) => (
          <SetRow
            key={set.id}
            set={set}
            index={idx}
            onComplete={() => onCompleteSet(set.id)}
            onChange={patch => onChangeSet(set.id, patch)}
            onRemove={exercise.sets.length > 1 ? () => onRemoveSet(set.id) : undefined}
            onTypePress={() => onSetTypePress(set.id, idx)}
          />
        ))}

        <Pressable
          onPress={onAddSet}
          style={({ pressed }) => [styles.addSetBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Add set"
        >
          <Plus size={14} color={colors.primary} strokeWidth={2.5} />
          <Text variant="bodySmall" weight="700" color="brand">
            Add set
          </Text>
        </Pressable>
      </View>
    </View>
  );
}


interface SetRowProps {
  set: LiveSet;
  index: number;
  onComplete: () => void;
  onChange: (patch: Partial<LiveSet>) => void;
  onRemove?: () => void;
  onTypePress: () => void;
}

function SetRow({ set, index, onComplete, onChange, onRemove, onTypePress }: SetRowProps) {
  const meta = setTypeMeta(set.setType);
  const isNormal = (set.setType ?? 'NORMAL') === 'NORMAL';

  return (
    <View
      style={[
        styles.row,
        set.completed && styles.rowDone,
      ]}
    >
      <View style={styles.colSet}>
        <Pressable
          onPress={onTypePress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.setBadge,
            {
              backgroundColor: meta.badgeBg,
              borderColor: isNormal ? colors.line : meta.badgeFg,
            },
            set.completed && styles.setBadgeDone,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel={`Set ${index + 1} type: ${meta.fullLabel}. Tap to change.`}
        >
          <Text
            variant="bodySmall"
            weight="800"
            mono
            tabular
            style={{ color: set.completed ? colors.white : meta.badgeFg }}
          >
            {isNormal ? String(index + 1) : meta.shortLabel}
          </Text>
        </Pressable>
      </View>

      <View style={styles.colReps}>
        <NumberControl
          value={set.reps}
          min={0}
          max={50}
          step={1}
          integer
          disabled={set.completed}
          onChange={reps => onChange({ reps })}
        />
      </View>

      <View style={styles.colWeight}>
        <NumberControl
          value={set.weightKg}
          min={0}
          max={500}
          step={0.25}
          disabled={set.completed}
          onChange={weightKg => onChange({ weightKg })}
        />
      </View>

      <View style={styles.colRemove}>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.5 }]}
            accessibilityLabel={`Remove set ${index + 1}`}
          >
            <X size={14} color={colors.inkMuted} strokeWidth={2.25} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.colDone}>
        <Pressable
          onPress={onComplete}
          hitSlop={4}
          style={({ pressed }) => [
            styles.checkbox,
            set.completed ? styles.checkboxOn : styles.checkboxOff,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.completed }}
        >
          {set.completed ? <Check size={20} color={colors.white} strokeWidth={3} /> : null}
        </Pressable>
      </View>
    </View>
  );
}


interface NumberControlProps {
  value: number;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
  disabled?: boolean;
  onChange: (next: number) => void;
}

function NumberControl({
  value,
  min,
  max,
  step,
  integer = false,
  disabled,
  onChange,
}: NumberControlProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatNumber(value));
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!editing) setDraft(formatNumber(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [editing]);

  const commitDraft = () => {
    setEditing(false);
    const cleaned = draft.replace(',', '.').trim();
    const parsed = Number(cleaned);
    if (cleaned === '' || Number.isNaN(parsed)) {
      setDraft(formatNumber(value));
      return;
    }
    const snapped = integer ? Math.round(parsed) : parsed;
    const clamped = clamp(snapped, min, max);
    if (clamped !== value) onChange(clamped);
    setDraft(formatNumber(clamped));
  };

  const dec = () => onChange(clamp(round(value - step), min, max));
  const inc = () => onChange(clamp(round(value + step), min, max));

  return (
    <View style={[styles.numWrap, disabled && styles.numWrapDisabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Pressable
        onPress={dec}
        hitSlop={8}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
        accessibilityLabel="Decrease"
      >
        <Text variant="bodySmall" weight="700" color="secondary">
          −
        </Text>
      </Pressable>
      {editing ? (
        <View style={styles.numValueWrap}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType={integer ? 'number-pad' : 'decimal-pad'}
            returnKeyType="done"
            selectTextOnFocus
            style={styles.numInput}
            maxLength={6}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setDraft(formatNumber(value));
            setEditing(true);
          }}
          hitSlop={6}
          style={styles.numValueWrap}
        >
          <Text mono tabular weight="800" style={styles.numValue}>
            {formatNumber(value)}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={inc}
        hitSlop={8}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
        accessibilityLabel="Increase"
      >
        <Text variant="bodySmall" weight="700" color="secondary">
          +
        </Text>
      </Pressable>
    </View>
  );
}


function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardDone: { borderColor: colors.success, backgroundColor: colors.successSoft },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 44, height: 44 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  exerciseName: { letterSpacing: -0.2 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressLabel: { color: colors.inkSecondary, letterSpacing: 0.3 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.inkMuted,
    opacity: 0.6,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  miniProgress: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  table: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerCell: { fontSize: 10, letterSpacing: 0.6, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  rowDone: { backgroundColor: colors.successSoft },

  colSet: { width: 36, alignItems: 'flex-start' },
  colReps: { flex: 1, alignItems: 'center' },
  colWeight: { flex: 1.2, alignItems: 'center' },
  colRemove: { width: 24, alignItems: 'center' },
  colDone: { width: 40, alignItems: 'flex-end' },

  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  setBadgeDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOff: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  checkboxOn: {
    backgroundColor: colors.success,
  },

  numWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  numWrapDisabled: { opacity: 0.5 },
  numValueWrap: {
    minWidth: 44,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numValue: { fontSize: 15, lineHeight: 18, letterSpacing: -0.2 },
  numInput: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.inkPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    paddingVertical: 0,
    paddingHorizontal: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    textAlign: 'center',
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepBtnPressed: { opacity: 0.5 },

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radii.md,
  },
});
