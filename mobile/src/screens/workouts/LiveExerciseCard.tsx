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
import { colors, radii, spacing } from '../../theme';
import { IconButton, Text } from '../../components/ui';
import type { LiveExercise, LiveSet } from '../../types/workout';
import { setTypeMeta } from '../../utils/setTypeMeta';

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
  const allDone = exercise.sets.length > 0 && exercise.sets.every(s => s.completed);

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
          <Text variant="body" weight="600" numberOfLines={1}>
            {exercise.name}
          </Text>
          <View style={styles.headerMeta}>
            {exercise.category ? (
              <Text variant="micro" color="secondary">
                {capitalize(exercise.category)}
              </Text>
            ) : null}
            {exercise.addedLive ? (
              <View style={styles.addedLiveBadge}>
                <Text variant="micro" weight="700" color="brand">
                  Added live
                </Text>
              </View>
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

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text variant="caption" color="muted" style={[styles.colSet, styles.headerAlignStart]}>
            Set
          </Text>
          <Text variant="caption" color="muted" style={[styles.colReps, styles.headerAlignCenter]}>
            Reps
          </Text>
          <Text variant="caption" color="muted" style={[styles.colWeight, styles.headerAlignCenter]}>
            Weight
          </Text>
          <View style={styles.colRemove} />
          <Text variant="caption" color="muted" style={[styles.colDone, styles.headerAlignEnd]}>
            ✓
          </Text>
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
        >
          <Plus size={12} color={colors.primary} strokeWidth={2.25} />
          <Text variant="micro" weight="700" color="brand">
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
          hitSlop={6}
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
            variant="micro"
            weight="700"
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
          unit="kg"
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
            <X size={14} color={colors.inkMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.colDone}>
        <Pressable
          onPress={onComplete}
          hitSlop={8}
          style={({ pressed }) => [
            styles.checkbox,
            set.completed ? styles.checkboxOn : styles.checkboxOff,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.completed }}
        >
          {set.completed ? <Check size={16} color={colors.white} strokeWidth={3} /> : null}
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
  unit?: string;
  disabled?: boolean;
  onChange: (next: number) => void;
}

function NumberControl({
  value,
  min,
  max,
  step,
  integer = false,
  unit,
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
          {unit ? (
            <Text variant="micro" color="muted" style={styles.numUnit}>
              {unit}
            </Text>
          ) : null}
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
          <Text mono tabular weight="700" style={styles.numValue}>
            {formatNumber(value)}
          </Text>
          {unit ? (
            <Text variant="micro" color="muted" style={styles.numUnit}>
              {unit}
            </Text>
          ) : null}
        </Pressable>
      )}
      <Pressable
        onPress={inc}
        hitSlop={8}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
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
    gap: spacing.lg,
  },
  cardDone: { borderColor: colors.success, backgroundColor: colors.successSoft },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 36, height: 36 },
  headerText: { flex: 1, minWidth: 0 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 1 },
  addedLiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.xs,
    backgroundColor: colors.primarySoftStrong,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  table: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerAlignStart: { textAlign: 'left' },
  headerAlignCenter: { textAlign: 'center' },
  headerAlignEnd: { textAlign: 'right' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  rowDone: { backgroundColor: colors.successSoft },

  colSet: { width: 36, alignItems: 'flex-start' },
  colReps: { flex: 1, alignItems: 'center' },
  colWeight: { flex: 1.3, alignItems: 'center' },
  colRemove: { width: 28, alignItems: 'center' },
  colDone: { width: 44, alignItems: 'flex-end' },

  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  setBadgeDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
  numWrapDisabled: { opacity: 0.4 },
  numValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 2,
  },
  numValue: { fontSize: 15, lineHeight: 18 },
  numUnit: { marginLeft: 2, fontSize: 10 },
  numInput: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.inkPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    textAlign: 'center',
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: { opacity: 0.5 },

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
  },
});
