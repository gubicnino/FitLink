import {
  ChevronDown,
  Clock,
  Dumbbell,
  Hash,
  Pencil,
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
import type { WorkoutTemplate } from '../../../types/workout';

interface TemplateDetailModalProps {
  open: boolean;
  templateId: string | null;
  onClose: () => void;
  onEdit: (templateId: string) => void;
  onDeleted: () => void;
}

interface HydratedExercise {
  exerciseId: string;
  name: string;
  category: string | null;
}

export default function TemplateDetailModal({
  open,
  templateId,
  onClose,
  onEdit,
  onDeleted,
}: TemplateDetailModalProps) {
  const toast = useToast();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [details, setDetails] = useState<Map<string, HydratedExercise>>(new Map());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !templateId) return;
    let cancelled = false;
    setLoading(true);
    setConfirmDelete(false);
    (async () => {
      try {
        const t = await workoutApi.getTemplate(templateId);
        if (cancelled) return;
        const fetched = await Promise.all(
          t.exercises.map((e) => exerciseApi.getById(e.exerciseId).catch(() => null)),
        );
        if (cancelled) return;
        const map = new Map<string, HydratedExercise>();
        fetched.forEach((d, i) => {
          const ex = t.exercises[i];
          map.set(ex.exerciseId, {
            exerciseId: ex.exerciseId,
            name: d?.name ?? ex.exerciseId,
            category: d?.category ?? null,
          });
        });
        setTemplate(t);
        setDetails(map);
        setExpandedIdx(0);
      } catch (err) {
        console.error(err);
        toast.error('Could not load the template.');
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, templateId, toast, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const totalSets = useMemo(
    () => template?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0,
    [template],
  );
  const estMin = useMemo(() => {
    if (!template) return 0;
    let total = 0;
    for (const e of template.exercises) {
      for (const s of e.sets) total += 45 + (s.restSeconds ?? 60);
    }
    return Math.max(0, Math.round(total / 60));
  }, [template]);

  const handleDelete = async () => {
    if (!template) return;
    setDeleting(true);
    try {
      await workoutApi.deleteTemplate(template.id);
      toast.success(`"${template.name}" deleted.`);
      onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Could not delete template.');
      setDeleting(false);
    }
  };

  if (!open || !templateId) return null;

  return (
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
          maxWidth: 720,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Hero header */}
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
                WORKOUT TEMPLATE
              </div>
              <h1
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  margin: 0,
                  marginTop: 4,
                  color: colors.white,
                }}
              >
                {loading ? '…' : template?.name ?? 'Template'}
              </h1>
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
                    {template?.exercises.length ?? 0}
                  </strong>{' '}
                  exercises
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
              aria-label="Close"
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
            background: colors.bg,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.lg,
          }}
        >
          {loading || !template ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <SectionHeader label="EXERCISES" count={template.exercises.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {template.exercises.map((ex, i) => {
                  const detail = details.get(ex.exerciseId);
                  const isOpen = expandedIdx === i;
                  return (
                    <div
                      key={`${ex.exerciseId}-${i}`}
                      style={{
                        background: colors.surface,
                        border: `1px solid ${isOpen ? colors.primaryBorder : colors.line}`,
                        borderRadius: radii.xl,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isOpen ? null : i)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                          padding: `${spacing.sm}px ${spacing.md}px`,
                          background: 'transparent',
                          border: 'none',
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
                          {String(i + 1).padStart(2, '0')}
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
                            {detail?.name ?? ex.exerciseId}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: colors.inkMuted,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          >
                            {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
                            {detail?.category ? ` · ${detail.category}` : ''}
                          </div>
                        </div>
                        <ChevronDown
                          size={16}
                          color={colors.inkMuted}
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.15s',
                          }}
                        />
                      </button>

                      {isOpen ? (
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
                            <span>
                              <Hash size={10} style={{ verticalAlign: 'middle' }} /> REPS
                            </span>
                            <span>
                              <Dumbbell size={10} style={{ verticalAlign: 'middle' }} /> WEIGHT
                            </span>
                            <span>
                              <Clock size={10} style={{ verticalAlign: 'middle' }} /> REST
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {ex.sets.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '40px 1fr 1fr 1fr',
                                  gap: spacing.sm,
                                  alignItems: 'center',
                                  padding: `8px ${spacing.xs}px`,
                                  background: colors.surface,
                                  borderRadius: radii.md,
                                  border: `1px solid ${colors.line}`,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  fontVariantNumeric: 'tabular-nums',
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
                                  }}
                                >
                                  {sIdx + 1}
                                </div>
                                <span style={{ color: colors.inkPrimary }}>{s.targetReps}</span>
                                <span style={{ color: colors.inkPrimary }}>
                                  {s.targetWeightKg > 0
                                    ? `${formatWeight(s.targetWeightKg)} kg`
                                    : '—'}
                                </span>
                                <span style={{ color: colors.inkSecondary }}>
                                  {s.restSeconds != null ? formatRest(s.restSeconds) : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Action bar */}
        <div
          style={{
            padding: `${spacing.md}px ${spacing.xl}px`,
            borderTop: `1px solid ${colors.line}`,
            background: colors.surface,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {confirmDelete ? (
            <>
              <span
                style={{
                  ...typography.bodySmall,
                  color: colors.danger,
                  fontWeight: 700,
                  flex: 1,
                }}
              >
                Delete this template?
              </span>
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              />
              <Button
                label={deleting ? 'Deleting…' : 'Delete'}
                variant="danger"
                size="md"
                onClick={handleDelete}
                disabled={deleting}
                leftIcon={<Trash2 size={14} />}
              />
            </>
          ) : (
            <>
              <Button
                label="Delete"
                variant="ghost"
                size="md"
                onClick={() => setConfirmDelete(true)}
                disabled={!template || loading}
                leftIcon={<Trash2 size={14} />}
              />
              <div style={{ flex: 1 }} />
              <Button label="Close" variant="ghost" size="md" onClick={onClose} />
              <Button
                label="Edit"
                variant="primary"
                size="md"
                onClick={() => template && onEdit(template.id)}
                disabled={!template || loading}
                leftIcon={<Pencil size={14} />}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatRest(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
