import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Dumbbell,
  Hash,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { exerciseApi } from '../../../api/exerciseApi';
import { workoutApi } from '../../../api/workoutApi';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import SectionHeader from '../../../components/ui/SectionHeader';
import { useToast } from '../../../components/ui/Toast';
import { colors, radii, shadows, spacing, typography } from '../../../theme';
import type { ExerciseSummary } from '../../../types/exercise';
import type {
  SetTarget,
  TemplateUpsertRequest,
  WorkoutTemplate,
} from '../../../types/workout';
import ExercisePickerModal from './ExercisePickerModal';

type Mode =
  | { kind: 'create'; traineeId: string }
  | { kind: 'edit'; templateId: string };

interface FormSet {
  reps: number;
  weightKg: number;
  restSeconds: number | null;
}

interface FormExercise {
  exerciseId: string;
  name: string;
  category: string | null;
  sets: FormSet[];
  expanded: boolean;
}

interface TemplateEditorModalProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_WEIGHT = 0;

function defaultSets(): FormSet[] {
  return Array.from({ length: DEFAULT_SETS }, () => ({
    reps: DEFAULT_REPS,
    weightKg: DEFAULT_WEIGHT,
    restSeconds: null,
  }));
}

export default function TemplateEditorModal({
  open,
  mode,
  onClose,
  onSaved,
}: TemplateEditorModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [items, setItems] = useState<FormExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEdit = mode?.kind === 'edit';

  // Reset / hydrate on open
  useEffect(() => {
    if (!open || !mode) return;
    let cancelled = false;
    setError(null);
    setName('');
    setItems([]);

    if (mode.kind === 'create') {
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const tpl = await workoutApi.getTemplate(mode.templateId);
        if (cancelled) return;
        const detail = await Promise.all(
          tpl.exercises.map((e) =>
            exerciseApi.getById(e.exerciseId).catch(() => null),
          ),
        );
        if (cancelled) return;
        const formItems: FormExercise[] = tpl.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          name: detail[i]?.name ?? e.exerciseId,
          category: detail[i]?.category ?? null,
          expanded: i === 0,
          sets:
            e.sets.length > 0
              ? e.sets.map((s) => ({
                  reps: s.targetReps,
                  weightKg: s.targetWeightKg,
                  restSeconds: s.restSeconds,
                }))
              : [{ reps: DEFAULT_REPS, weightKg: DEFAULT_WEIGHT, restSeconds: null }],
        }));
        setName(tpl.name);
        setItems(formItems);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load the template.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pickerOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, pickerOpen]);

  const totalSets = useMemo(
    () => items.reduce((sum, it) => sum + it.sets.length, 0),
    [items],
  );
  const estMin = useMemo(() => {
    let total = 0;
    for (const it of items) {
      for (const s of it.sets) total += 45 + (s.restSeconds ?? 60);
    }
    return Math.max(0, Math.round(total / 60));
  }, [items]);

  const handleAddPicked = (picked: ExerciseSummary[]) => {
    setItems((prev) => [
      ...prev,
      ...picked.map<FormExercise>((p) => ({
        exerciseId: p.id,
        name: p.name,
        category: p.category,
        expanded: false,
        sets: defaultSets(),
      })),
    ]);
    setPickerOpen(false);
  };

  const updateExercise = (idx: number, patch: Partial<FormExercise>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeExercise = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const moveExercise = (from: number, dir: -1 | 1) => {
    setItems((prev) => {
      const to = from + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<FormSet>) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === exIdx
          ? { ...it, sets: it.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
          : it,
      ),
    );
  };

  const addSet = (exIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== exIdx) return it;
        const last = it.sets[it.sets.length - 1];
        return {
          ...it,
          sets: [
            ...it.sets,
            last
              ? { reps: last.reps, weightKg: last.weightKg, restSeconds: last.restSeconds }
              : { reps: DEFAULT_REPS, weightKg: DEFAULT_WEIGHT, restSeconds: null },
          ],
        };
      }),
    );
  };

  const removeLastSet = (exIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== exIdx) return it;
        if (it.sets.length <= 1) return it;
        return { ...it, sets: it.sets.slice(0, -1) };
      }),
    );
  };

  const handleSave = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your template a name.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one exercise.');
      return;
    }
    const emptyExercise = items.find((it) => it.sets.length === 0);
    if (emptyExercise) {
      setError(`"${emptyExercise.name}" needs at least one set.`);
      return;
    }

    const body: TemplateUpsertRequest = {
      name: trimmed,
      exercises: items.map((it, idx) => ({
        exerciseId: it.exerciseId,
        order: idx,
        notes: null,
        sets: it.sets.map<SetTarget>((s) => ({
          targetReps: s.reps,
          targetWeightKg: s.weightKg,
          restSeconds: s.restSeconds,
          setType: 'NORMAL',
        })),
      })),
    };

    setSaving(true);
    try {
      let saved: WorkoutTemplate;
      if (mode?.kind === 'edit') {
        saved = await workoutApi.updateTemplate(mode.templateId, body);
        toast.success(`"${saved.name}" updated.`);
      } else if (mode?.kind === 'create') {
        saved = await workoutApi.createTemplateForTrainee(mode.traineeId, body);
        toast.success(`"${saved.name}" assigned to your client.`);
      } else {
        return;
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Could not save the template.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const excludeIds = useMemo(
    () => new Set(items.map((i) => i.exerciseId)),
    [items],
  );

  if (!open || !mode) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: colors.overlayDarker,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: spacing.lg,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: colors.surface,
            borderRadius: radii.xxl,
            boxShadow: shadows.modal,
            width: '100%',
            maxWidth: 820,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Athletic hero header */}
          <div
            style={{
              background: colors.primary,
              color: colors.white,
              padding: `${spacing.lg}px ${spacing.xl}px`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -80,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: colors.primaryDark,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: spacing.md,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '1.4px',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {isEdit ? 'EDITING TEMPLATE' : 'NEW TEMPLATE FOR CLIENT'}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Push Day · Strength Phase 1"
                  autoFocus={!isEdit}
                  maxLength={120}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: colors.white,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    padding: 0,
                    marginTop: 4,
                    borderBottom: '1.5px solid rgba(255,255,255,0.22)',
                  }}
                />
                {/* Live stats */}
                <div
                  style={{
                    display: 'flex',
                    gap: spacing.lg,
                    marginTop: spacing.md,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.78)',
                  }}
                >
                  <span>
                    <strong style={{ color: colors.white, fontVariantNumeric: 'tabular-nums' }}>
                      {items.length}
                    </strong>{' '}
                    {items.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                  <span>
                    <strong style={{ color: colors.white, fontVariantNumeric: 'tabular-nums' }}>
                      {totalSets}
                    </strong>{' '}
                    sets
                  </span>
                  <span>
                    <strong style={{ color: colors.white, fontVariantNumeric: 'tabular-nums' }}>
                      ~{estMin}
                    </strong>{' '}
                    min
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.10)',
                  color: colors.white,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-label="Close editor"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: spacing.xl,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.lg,
              background: colors.bg,
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
                <LoadingSpinner size={28} />
              </div>
            ) : (
              <>
                <SectionHeader
                  label="EXERCISES"
                  count={items.length}
                  countTone={items.length > 0 ? 'neutral' : 'neutral'}
                />

                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.xxl}px ${spacing.lg}px`,
                      border: `2px dashed ${colors.primaryBorder}`,
                      background: colors.primarySoft,
                      borderRadius: radii.xl,
                      color: colors.primary,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: colors.primary,
                        color: colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={20} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.1px' }}>
                      Pick exercises from the library
                    </div>
                    <div style={{ fontSize: 12, color: colors.inkSecondary }}>
                      Browse, search and add as many as you need
                    </div>
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.md,
                    }}
                  >
                    {items.map((it, idx) => (
                      <ExerciseEditor
                        key={`${it.exerciseId}-${idx}`}
                        item={it}
                        index={idx}
                        total={items.length}
                        onToggle={() => updateExercise(idx, { expanded: !it.expanded })}
                        onMoveUp={() => moveExercise(idx, -1)}
                        onMoveDown={() => moveExercise(idx, 1)}
                        onRemove={() => removeExercise(idx)}
                        onUpdateSet={(sIdx, patch) => updateSet(idx, sIdx, patch)}
                        onAddSet={() => addSet(idx)}
                        onRemoveLastSet={() => removeLastSet(idx)}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        padding: spacing.md,
                        borderRadius: radii.lg,
                        border: `1.5px dashed ${colors.primaryBorder}`,
                        background: colors.primarySoft,
                        color: colors.primary,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: '0.1px',
                      }}
                    >
                      <Plus size={16} />
                      Add more exercises
                    </button>
                  </div>
                )}

                {error ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: `10px 14px`,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.28)',
                      borderRadius: radii.md,
                      color: colors.danger,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={14} />
                    {error}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Sticky save bar */}
          <div
            style={{
              padding: `${spacing.md}px ${spacing.xl}px`,
              borderTop: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              background: colors.surface,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  color: colors.inkMuted,
                }}
              >
                {isEdit ? 'EDITING' : 'CREATING'}
              </div>
              <div
                style={{
                  ...typography.bodySmall,
                  color: colors.inkPrimary,
                  fontWeight: 800,
                  letterSpacing: '-0.1px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name.trim() || (isEdit ? 'Edit template' : 'New template')}
              </div>
            </div>
            <Button label="Cancel" variant="ghost" size="md" onClick={onClose} disabled={saving} />
            <Button
              label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={saving || loading}
              leftIcon={<Save size={14} />}
            />
          </div>
        </div>
      </div>

      <ExercisePickerModal
        open={pickerOpen}
        excludeIds={excludeIds}
        onCancel={() => setPickerOpen(false)}
        onConfirm={handleAddPicked}
      />
    </>
  );
}


function ExerciseEditor({
  item,
  index,
  total,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateSet,
  onAddSet,
  onRemoveLastSet,
}: {
  item: FormExercise;
  index: number;
  total: number;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdateSet: (setIdx: number, patch: Partial<FormSet>) => void;
  onAddSet: () => void;
  onRemoveLastSet: () => void;
}) {
  const setCount = item.sets.length;
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.xl,
        border: `1px solid ${item.expanded ? colors.primaryBorder : colors.line}`,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.sm}px ${spacing.md}px`,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.6px',
              color: colors.inkMuted,
              minWidth: 18,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radii.md,
              background: colors.primarySoft,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Dumbbell size={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: colors.inkPrimary,
                textTransform: 'capitalize',
                letterSpacing: '-0.1px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: colors.inkMuted,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {setCount} {setCount === 1 ? 'set' : 'sets'}
              {item.category ? ` · ${item.category}` : ''}
            </div>
          </div>
          <ChevronDown
            size={16}
            color={colors.inkMuted}
            style={{
              transform: item.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {/* Reorder + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconChip onClick={onMoveUp} disabled={index === 0} aria-label="Move up">
            <ArrowUp size={13} />
          </IconChip>
          <IconChip
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown size={13} />
          </IconChip>
          <IconChip onClick={onRemove} tone="danger" aria-label="Remove exercise">
            <Trash2 size={13} />
          </IconChip>
        </div>
      </div>

      {/* Sets editor (expanded) */}
      {item.expanded ? (
        <div
          style={{
            padding: spacing.md,
            background: colors.bg,
            borderTop: `1px solid ${colors.line}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: spacing.sm,
              padding: `0 ${spacing.xs}px`,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.6px',
              color: colors.inkMuted,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            <span>SET</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Hash size={10} /> REPS
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Dumbbell size={10} /> WEIGHT
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> REST
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.sets.map((s, sIdx) => (
              <SetRow
                key={sIdx}
                index={sIdx}
                set={s}
                onChange={(patch) => onUpdateSet(sIdx, patch)}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.sm,
              paddingInline: spacing.xs,
            }}
          >
            <button
              type="button"
              onClick={onAddSet}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: 'none',
                color: colors.primary,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.2px',
                cursor: 'pointer',
                padding: '6px 8px',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={12} /> ADD SET
            </button>
            {setCount > 1 ? (
              <button
                type="button"
                onClick={onRemoveLastSet}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'transparent',
                  border: 'none',
                  color: colors.inkMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontFamily: 'inherit',
                }}
              >
                − Remove last
              </button>
            ) : (
              <span style={{ ...typography.micro, color: colors.inkMuted }}>
                <AlertCircle size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                At least one set required
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SetRow({
  index,
  set,
  onChange,
}: {
  index: number;
  set: FormSet;
  onChange: (patch: Partial<FormSet>) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 1fr 1fr',
        gap: spacing.sm,
        alignItems: 'center',
        padding: `6px ${spacing.xs}px`,
        background: colors.surface,
        borderRadius: radii.md,
        border: `1px solid ${colors.line}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: colors.primarySoft,
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {index + 1}
      </div>
      <NumberStepper
        value={set.reps}
        min={1}
        max={99}
        step={1}
        onChange={(v) => onChange({ reps: v })}
      />
      <NumberStepper
        value={set.weightKg}
        min={0}
        max={500}
        step={2.5}
        suffix="kg"
        decimals
        onChange={(v) => onChange({ weightKg: v })}
      />
      <RestStepper
        value={set.restSeconds}
        onChange={(v) => onChange({ restSeconds: v })}
      />
    </div>
  );
}

function NumberStepper({
  value,
  min,
  max,
  step,
  suffix,
  decimals,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  decimals?: boolean;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const fmt = (n: number) => (decimals && !Number.isInteger(n) ? n.toFixed(1) : String(n));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: colors.bg,
        borderRadius: radii.md,
        border: `1px solid ${colors.line}`,
        padding: '2px 4px',
        height: 32,
      }}
    >
      <StepBtn label="−" onClick={() => onChange(clamp(Number((value - step).toFixed(2))))} />
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(clamp(n));
        }}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 800,
          color: colors.inkPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      {suffix ? (
        <span
          style={{
            fontSize: 10,
            color: colors.inkMuted,
            fontWeight: 700,
            marginRight: 4,
          }}
        >
          {suffix}
        </span>
      ) : null}
      <StepBtn label="+" onClick={() => onChange(clamp(Number((value + step).toFixed(2))))} />
      <span style={{ display: 'none' }}>{fmt(value)}</span>
    </div>
  );
}

function RestStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  if (value == null) {
    return (
      <button
        type="button"
        onClick={() => onChange(90)}
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: 'transparent',
          border: `1px dashed ${colors.line}`,
          borderRadius: radii.md,
          color: colors.inkSecondary,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Plus size={11} /> Add rest
      </button>
    );
  }
  const label = formatRest(value);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: colors.primarySoft,
        border: `1px solid ${colors.primaryBorder}`,
        borderRadius: radii.md,
        padding: '2px 4px',
        height: 32,
      }}
    >
      <StepBtn label="−" onClick={() => onChange(Math.max(0, value - 15))} />
      <span
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: colors.primary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {label}
      </span>
      <StepBtn label="+" onClick={() => onChange(Math.min(600, value + 15))} />
      <button
        type="button"
        onClick={() => onChange(null)}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: colors.inkMuted,
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
        aria-label="Remove rest"
      >
        ×
      </button>
    </div>
  );
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: 'none',
        background: colors.surface,
        color: colors.inkSecondary,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {label}
    </button>
  );
}

function IconChip({
  children,
  onClick,
  disabled,
  tone,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger';
  'aria-label': string;
}) {
  const fg = tone === 'danger' ? colors.danger : colors.inkSecondary;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 30,
        height: 30,
        borderRadius: radii.md,
        border: `1px solid ${colors.line}`,
        background: colors.surface,
        color: fg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
