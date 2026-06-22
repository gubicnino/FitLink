import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Info,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { IconButton, Text } from '@/components/ui';
import type { SetType } from '@/types/workout';
import { setTypeMeta } from '@/utils/setTypeMeta';
import { SetTypePickerSheet } from './SetTypePickerSheet';

// single set znotraj vaje v template formi
export interface FormSet {
  reps: number;
  weightKg: number;
  restSeconds: number | null;
  setType: SetType;
}

export interface TemplateFormExercise {
  exerciseId: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  sets: FormSet[];
}

interface Props {
  item: TemplateFormExercise;
  index: number;
  total: number;
  onChange: (patch: Partial<TemplateFormExercise>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInfoPress?: () => void;
}

const DEFAULT_NEW_SET: FormSet = { reps: 10, weightKg: 0, restSeconds: null, setType: 'NORMAL' };


export function TemplateExerciseRow({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInfoPress,
}: Props) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const updateSet = (setIdx: number, patch: Partial<FormSet>) => {
    onChange({
      sets: item.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)),
    });
  };

  const addSet = () => {
    const last = item.sets[item.sets.length - 1] ?? DEFAULT_NEW_SET;
    // OBDRZIMO INFO OD PREJSNJOGA SETA TAKKA TE SAMO ZHRIHTAMO DEJANSKI DIFF.
    // setType pa vedno by deafult starta z NORMAL ker user redko hoce dva warm-upa zaporedoma
    onChange({
      sets: [
        ...item.sets,
        {
          reps: last.reps,
          weightKg: last.weightKg,
          restSeconds: last.restSeconds,
          setType: 'NORMAL',
        },
      ],
    });
  };

  const removeLastSet = () => {
    if (item.sets.length <= 1) return;
    onChange({ sets: item.sets.slice(0, -1) });
  };

  const [pickerForSetIdx, setPickerForSetIdx] = useState<number | null>(null);
  const pickerSet = pickerForSetIdx != null ? item.sets[pickerForSetIdx] : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.gripCol}>
          <Text variant="micro" weight="700" color="muted" mono tabular style={styles.gripIdx}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.thumb}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImage} />
          ) : (
            <Dumbbell size={16} color={colors.primary} strokeWidth={2} />
          )}
        </View>

        <View style={styles.headerText}>
          <Text variant="body" weight="700" numberOfLines={1}>
            {item.name}
          </Text>
          {item.category ? (
            <Text variant="micro" color="secondary">
              {capitalize(item.category)}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <View style={styles.reorderPill}>
            <Pressable
              onPress={onMoveUp}
              disabled={isFirst}
              hitSlop={4}
              style={({ pressed }) => [
                styles.reorderBtn,
                isFirst && styles.reorderBtnDisabled,
                pressed && !isFirst && { opacity: 0.5 },
              ]}
              accessibilityLabel="Move up"
            >
              <ChevronUp
                size={14}
                color={isFirst ? colors.inkMuted : colors.inkPrimary}
                strokeWidth={2.5}
              />
            </Pressable>
            <View style={styles.reorderDivider} />
            <Pressable
              onPress={onMoveDown}
              disabled={isLast}
              hitSlop={4}
              style={({ pressed }) => [
                styles.reorderBtn,
                isLast && styles.reorderBtnDisabled,
                pressed && !isLast && { opacity: 0.5 },
              ]}
              accessibilityLabel="Move down"
            >
              <ChevronDown
                size={14}
                color={isLast ? colors.inkMuted : colors.inkPrimary}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>

          {onInfoPress ? (
            <IconButton variant="ghost" size="sm" onPress={onInfoPress}>
              <Info size={16} color={colors.inkSecondary} strokeWidth={2} />
            </IconButton>
          ) : null}
          <IconButton variant="ghost" size="sm" onPress={onRemove}>
            <Trash2 size={15} color={colors.danger} strokeWidth={2} />
          </IconButton>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text
            variant="caption"
            color="muted"
            style={[styles.colSet, styles.headerLabel, styles.headerAlignStart]}
          >
            Set
          </Text>
          <Text
            variant="caption"
            color="muted"
            style={[styles.colReps, styles.headerLabel, styles.headerAlignCenter]}
          >
            Reps
          </Text>
          <Text
            variant="caption"
            color="muted"
            style={[styles.colWeight, styles.headerLabel, styles.headerAlignCenter]}
          >
            Weight
          </Text>
          <Text
            variant="caption"
            color="muted"
            style={[styles.colRest, styles.headerLabel, styles.headerAlignEnd]}
          >
            Rest
          </Text>
        </View>

        {item.sets.map((set, idx) => {
          const meta = setTypeMeta(set.setType);
          const isNormal = (set.setType ?? 'NORMAL') === 'NORMAL';
          return (
          <View key={idx} style={styles.row}>
            <View style={styles.colSet}>
              <Pressable
                onPress={() => setPickerForSetIdx(idx)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.setBadge,
                  {
                    backgroundColor: meta.badgeBg,
                    borderColor: isNormal ? colors.line : meta.badgeFg,
                  },
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityLabel={`Set ${idx + 1} type: ${meta.fullLabel}. Tap to change.`}
              >
                <Text
                  variant="micro"
                  weight="700"
                  mono
                  tabular
                  style={{ color: meta.badgeFg }}
                >
                  {isNormal ? String(idx + 1) : meta.shortLabel}
                </Text>
              </Pressable>
            </View>

            <View style={styles.colReps}>
              <NumberControl
                value={set.reps}
                min={1}
                max={50}
                step={1}
                integer
                onChange={reps => updateSet(idx, { reps })}
              />
            </View>

            <View style={styles.colWeight}>
              <NumberControl
                value={set.weightKg}
                min={0}
                max={500}
                step={0.25}
                unit="kg"
                onChange={weightKg => updateSet(idx, { weightKg })}
              />
            </View>

            <View style={styles.colRest}>
              {set.restSeconds != null ? (
                <RestPill
                  seconds={set.restSeconds}
                  onChange={s => updateSet(idx, { restSeconds: s })}
                  onRemove={() => updateSet(idx, { restSeconds: null })}
                />
              ) : (
                <Pressable
                  onPress={() => updateSet(idx, { restSeconds: 90 })}
                  hitSlop={6}
                  style={({ pressed }) => [styles.addRest, pressed && { opacity: 0.6 }]}
                >
                  <Plus size={11} color={colors.inkSecondary} strokeWidth={2.25} />
                  <Text variant="micro" color="secondary" weight="600">
                    Add
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          );
        })}

        <View style={styles.setActions}>
          <Pressable
            onPress={addSet}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Plus size={12} color={colors.primary} strokeWidth={2.25} />
            <Text variant="micro" weight="700" color="brand">
              Add set
            </Text>
          </Pressable>

          {item.sets.length > 1 ? (
            <Pressable
              onPress={removeLastSet}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            >
              <Text variant="micro" weight="700" color="secondary">
                − Remove last
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <SetTypePickerSheet
        visible={pickerForSetIdx !== null}
        value={pickerSet?.setType ?? 'NORMAL'}
        setIndex={pickerForSetIdx ?? 0}
        onSelect={next => {
          if (pickerForSetIdx !== null) {
            updateSet(pickerForSetIdx, { setType: next });
          }
          setPickerForSetIdx(null);
        }}
        onCancel={() => setPickerForSetIdx(null)}
      />
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
  onChange: (next: number) => void;
}


// Numbver control z + pa - za reps in weight.
// klikneš na value -> postane input field (ka nejtrbej preveckrat + al pa - klikate)

function NumberControl({
  value,
  min,
  max,
  step,
  integer = false,
  unit,
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
      // Small delay takka je TextInput mounted pred dejanskin focus().
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
      // Invalid → reverta nazaj na kak je blo prlej.
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
    <View style={styles.numWrap}>
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

function RestPill({
  seconds,
  onChange,
  onRemove,
}: {
  seconds: number;
  onChange: (next: number) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.restPill}>
      <Pressable
        onPress={() => onChange(Math.max(0, seconds - 15))}
        hitSlop={6}
        style={({ pressed }) => [styles.restStep, pressed && styles.stepBtnPressed]}
      >
        <Text variant="micro" weight="700" color="secondary">
          −
        </Text>
      </Pressable>
      <Text mono tabular weight="700" variant="micro" style={styles.restValue}>
        {formatSeconds(seconds)}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(600, seconds + 15))}
        hitSlop={6}
        style={({ pressed }) => [styles.restStep, pressed && styles.stepBtnPressed]}
      >
        <Text variant="micro" weight="700" color="secondary">
          +
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={6} style={styles.restRemove}>
        <Text variant="micro" color="muted">
          ×
        </Text>
      </Pressable>
    </View>
  );
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
function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
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

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grip: { paddingVertical: spacing.xs },
  gripCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingRight: 2,
  },
  gripIdx: { fontSize: 10, letterSpacing: 0.4 },

  reorderPill: {
    flexDirection: 'column',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 2,
  },
  reorderBtn: {
    width: 30,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnDisabled: { opacity: 0.35 },
  reorderDivider: { height: 1, backgroundColor: colors.line },

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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  disabled: { opacity: 0.35 },

  // Table
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
  headerLabel: { fontSize: 10, letterSpacing: 0.4 },
  headerAlignStart: { textAlign: 'left' },
  headerAlignCenter: { textAlign: 'center' },
  headerAlignEnd: { textAlign: 'right' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },

  colSet: { width: 36, alignItems: 'flex-start' },
  colReps: { flex: 1, alignItems: 'center' },
  colWeight: { flex: 1.2, alignItems: 'center' },
  colRest: { flex: 1.1, alignItems: 'flex-end' },

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

  // Number control (reps / weight)
  numWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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

  // Rest
  addRest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  restStep: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  restValue: { minWidth: 32, textAlign: 'center', fontSize: 11 },
  restRemove: { marginLeft: 2, paddingHorizontal: 2 },

  // Add / remove set actions
  setActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
});
