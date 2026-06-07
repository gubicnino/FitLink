import { Check, Dumbbell, Layers, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { exerciseApi } from '../../../api/exerciseApi';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import SectionHeader from '../../../components/ui/SectionHeader';
import { colors, radii, shadows, spacing, typography } from '../../../theme';
import type { ExerciseSummary } from '../../../types/exercise';

interface ExercisePickerModalProps {
  open: boolean;
  /** IDs already in the template — picker shows them as already-added (cannot re-pick). */
  excludeIds: Set<string>;
  onCancel: () => void;
  onConfirm: (picked: ExerciseSummary[]) => void;
}

export default function ExercisePickerModal({
  open,
  excludeIds,
  onCancel,
  onConfirm,
}: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<ExerciseSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Map<string, ExerciseSummary>>(new Map());
  const [facets, setFacets] = useState<string[]>([]);

  // Load facets once
  useEffect(() => {
    if (!open) return;
    exerciseApi
      .facets()
      .then((f) => setFacets(f.categories))
      .catch(() => undefined);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const page = await exerciseApi.list({
          q: query.trim() || undefined,
          category,
          size: 40,
        });
        setItems(page.content);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, query, category]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setPicked(new Map());
      setQuery('');
      setCategory(undefined);
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  const togglePick = (ex: ExerciseSummary) => {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.set(ex.id, ex);
      return next;
    });
  };

  const pickedList = useMemo(() => [...picked.values()], [picked]);
  const hasActiveFilter = category !== undefined || query.trim().length > 0;

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.overlayDarker,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
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
            maxWidth: 760,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: `${spacing.lg}px ${spacing.xl}px`,
              borderBottom: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  color: colors.accent,
                  marginBottom: 2,
                }}
              >
                ADD EXERCISES
              </div>
              <h2
                style={{
                  ...typography.h2,
                  color: colors.inkPrimary,
                  margin: 0,
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                }}
              >
                Exercise library
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              style={closeBtnStyle}
              aria-label="Close picker"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search + filters */}
          <div
            style={{
              padding: `${spacing.md}px ${spacing.xl}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
              borderBottom: `1px solid ${colors.line}`,
              background: colors.bg,
            }}
          >
            <div style={searchBoxStyle}>
              <Search size={16} color={colors.inkMuted} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises (e.g. bench press, squat)…"
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.inkPrimary,
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} style={chipBareBtn} aria-label="Clear search">
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Category strip — horizontal scroll, brand chips */}
            {facets.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingInline: 4,
                    color: colors.inkMuted,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={11} />
                  CATEGORY
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    paddingBottom: 2,
                    scrollbarWidth: 'thin',
                  }}
                >
                  <CategoryChip
                    label="All"
                    active={category === undefined}
                    onClick={() => setCategory(undefined)}
                  />
                  {facets.map((c) => (
                    <CategoryChip
                      key={c}
                      label={c}
                      active={category === c}
                      onClick={() => setCategory(category === c ? undefined : c)}
                    />
                  ))}
                </div>
                {hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(undefined);
                      setQuery('');
                    }}
                    style={{
                      ...chipBareBtn,
                      paddingInline: 8,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.6px',
                      color: colors.inkMuted,
                    }}
                  >
                    CLEAR
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* List */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: `${spacing.md}px ${spacing.xl}px`,
            }}
          >
            {loading || items === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
                <LoadingSpinner size={28} />
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: spacing.huge,
                  color: colors.inkMuted,
                  ...typography.body,
                }}
              >
                No exercises found{query ? ` for "${query}"` : ''}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((ex) => {
                  const inTemplate = excludeIds.has(ex.id);
                  const isPicked = picked.has(ex.id);
                  return (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      inTemplate={inTemplate}
                      isPicked={isPicked}
                      onPick={() => !inTemplate && togglePick(ex)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: `${spacing.md}px ${spacing.xl}px`,
              borderTop: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              background: colors.bg,
            }}
          >
            <SectionHeader
              label="PICKED"
              count={pickedList.length}
              countTone={pickedList.length > 0 ? 'accent' : 'neutral'}
              style={{ flex: 1 }}
            />
            <Button label="Cancel" variant="ghost" size="md" onClick={onCancel} />
            <Button
              label={pickedList.length === 1 ? 'Add 1 exercise' : `Add ${pickedList.length} exercises`}
              variant="primary"
              size="md"
              disabled={pickedList.length === 0}
              onClick={() => onConfirm(pickedList)}
              leftIcon={<Check size={14} />}
            />
          </div>
        </div>
      </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? colors.primary : colors.line}`,
        background: active ? colors.primary : colors.surface,
        color: active ? colors.white : colors.inkSecondary,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.4px',
        cursor: 'pointer',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.12s ease',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

function ExerciseRow({
  ex,
  inTemplate,
  isPicked,
  onPick,
}: {
  ex: ExerciseSummary;
  inTemplate: boolean;
  isPicked: boolean;
  onPick: () => void;
}) {
  return (
    <div
      onClick={inTemplate ? undefined : onPick}
      role="button"
      tabIndex={inTemplate ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !inTemplate) {
          e.preventDefault();
          onPick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `8px ${spacing.sm}px`,
        background: isPicked ? colors.primarySoft : colors.surface,
        border: `1px solid ${isPicked ? colors.primaryBorder : colors.line}`,
        borderRadius: radii.lg,
        cursor: inTemplate ? 'not-allowed' : 'pointer',
        opacity: inTemplate ? 0.55 : 1,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.md,
          overflow: 'hidden',
          background: colors.surfaceElevated,
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${colors.line}`,
        }}
      >
        {ex.thumbnailUrl ? (
          <img
            src={ex.thumbnailUrl}
            alt={ex.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <Dumbbell size={20} color={colors.primary} />
        )}
        {/* Pick indicator — small check chip overlay when selected */}
        {isPicked ? (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: colors.primary,
              color: colors.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            <Check size={11} strokeWidth={3} />
          </div>
        ) : null}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...typography.body,
            color: colors.inkPrimary,
            fontWeight: 800,
            letterSpacing: '-0.1px',
            textTransform: 'capitalize',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ex.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            ...typography.micro,
            color: colors.inkMuted,
            textTransform: 'capitalize',
            marginTop: 2,
          }}
        >
          {[ex.category, ex.level, ex.equipment].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>

      {/* "Already in template" badge */}
      {inTemplate ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: colors.inkMuted,
            padding: '4px 8px',
            background: colors.surfaceElevated,
            borderRadius: 999,
          }}
        >
          IN TEMPLATE
        </span>
      ) : null}

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable inline styles                                                      */
/* -------------------------------------------------------------------------- */

const closeBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: `1px solid ${colors.line}`,
  background: colors.surfaceElevated,
  color: colors.inkSecondary,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  padding: `8px 12px`,
  border: `1px solid ${colors.line}`,
  borderRadius: radii.lg,
  background: colors.surface,
};

const chipBareBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: colors.inkMuted,
  display: 'inline-flex',
  alignItems: 'center',
  padding: 4,
  fontFamily: 'inherit',
};
