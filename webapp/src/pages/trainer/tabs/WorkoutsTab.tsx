import { ChevronDown, Clock, Dumbbell, MessageSquareText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { exerciseApi } from '../../../api/exerciseApi';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import SectionHeader from '../../../components/ui/SectionHeader';
import TabButton from '../../../components/ui/TabButton';
import Tag from '../../../components/ui/Tag';
import { WorkoutTemplateCard } from '../../../components/WorkoutTemplateCard';
import { colors, radii, spacing, typography } from '../../../theme';
import type { SessionExercise, WorkoutSession, WorkoutTemplate } from '../../../types/workout';
import TemplateDetailModal from '../templates/TemplateDetailModal';
import TemplateEditorModal from '../templates/TemplateEditorModal';

export interface CardTemplate {
  id: string;
  name: string;
  exerciseCount: number;
  setCount?: number;
  durationMinutes?: number;
  lastUsed?: string;
  tag?: string;
}

interface WorkoutsTabProps {
  sessions: WorkoutSession[] | null;
  templates: WorkoutTemplate[] | null;
  traineeId: string;
  onTemplatesChanged: () => void;
}

type EditorMode =
  | { kind: 'create'; traineeId: string }
  | { kind: 'edit'; templateId: string };

function toCardTemplate(t: WorkoutTemplate): CardTemplate {
  const exerciseCount = t.exercises?.length ?? 0;
  const setCount = t.exercises?.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0) ?? 0;
  return {
    id: t.id,
    name: t.name,
    exerciseCount,
    setCount,
    durationMinutes: setCount > 0 ? Math.max(1, Math.round((setCount * 105) / 60)) : undefined,
  };
}

export default function WorkoutsTab({
  sessions,
  templates,
  traineeId,
  onTemplatesChanged,
}: WorkoutsTabProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'templates'>('sessions');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);

  const renderTabs = () => (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: colors.surface,
        border: `1px solid ${colors.line}`,
        borderRadius: radii.lg,
        width: 'fit-content',
      }}
    >
      <TabButton
        active={activeTab === 'sessions'}
        onClick={() => setActiveTab('sessions')}
        label={`Sessions${sessions ? ` · ${sessions.length}` : ''}`}
        icon={<Dumbbell size={14} />}
      />
      <TabButton
        active={activeTab === 'templates'}
        onClick={() => setActiveTab('templates')}
        label={`Templates${templates ? ` · ${templates.length}` : ''}`}
        icon={<Dumbbell size={14} />}
      />
    </div>
  );

  return (
    <>
      {renderTabs()}

      {activeTab === 'sessions' ? (
        <SessionsView sessions={sessions} />
      ) : (
        <TemplatesView
          templates={templates}
          onOpenDetail={(id) => setDetailId(id)}
          onCreate={() => setEditorMode({ kind: 'create', traineeId })}
        />
      )}

      {/* Detail modal (opens from card click) */}
      <TemplateDetailModal
        open={detailId !== null}
        templateId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => {
          setDetailId(null);
          setEditorMode({ kind: 'edit', templateId: id });
        }}
        onDeleted={() => {
          setDetailId(null);
          onTemplatesChanged();
        }}
      />

      {/* Editor modal (create OR edit) */}
      <TemplateEditorModal
        open={editorMode !== null}
        mode={editorMode}
        onClose={() => setEditorMode(null)}
        onSaved={() => {
          setEditorMode(null);
          onTemplatesChanged();
        }}
      />
    </>
  );
}


function SessionsView({ sessions }: { sessions: WorkoutSession[] | null }) {
  const [nameCache, setNameCache] = useState<Map<string, string>>(new Map());

  const resolveNames = async (ids: string[]) => {
    const missing = ids.filter((id) => !nameCache.has(id));
    if (missing.length === 0) return;
    const results = await Promise.all(
      missing.map((id) =>
        exerciseApi
          .getById(id)
          .then((ex) => [id, ex.name] as const)
          .catch(() => [id, 'Unknown exercise'] as const),
      ),
    );
    setNameCache((prev) => {
      const next = new Map(prev);
      for (const [id, name] of results) next.set(id, name);
      return next;
    });
  };

  if (sessions === null) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
          <LoadingSpinner size={28} />
        </div>
      </Card>
    );
  }
  if (sessions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Dumbbell size={26} />}
          title="No workouts logged yet"
          description="When your client completes a session in the mobile app, it will appear here."
        />
      </Card>
    );
  }
  const sorted = [...sessions].sort((a, b) => {
    const at = a.finishedAt ?? a.startedAt ?? '';
    const bt = b.finishedAt ?? b.startedAt ?? '';
    return bt.localeCompare(at);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {sorted.map((s) => (
        <WorkoutRow
          key={s.id}
          session={s}
          nameCache={nameCache}
          onExpand={() => resolveNames(s.exercises.map((ex) => ex.exerciseId))}
        />
      ))}
    </div>
  );
}

function WorkoutRow({
  session,
  nameCache,
  onExpand,
}: {
  session: WorkoutSession;
  nameCache: Map<string, string>;
  onExpand: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const when = session.finishedAt ?? session.startedAt;
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  useEffect(() => {
    if (expanded) onExpand();
  }, [expanded]);

  const toggle = () => setExpanded((v) => !v);

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        border: `1px solid ${expanded ? colors.primaryBorder : colors.line}`,
        overflow: 'hidden',
        transition: 'border-color 0.12s',
      }}
    >
      {/* Header row (clickable) */}
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          width: '100%',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        aria-expanded={expanded}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.lg,
            background: colors.primarySoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
            flexShrink: 0,
          }}
        >
          <Dumbbell size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <div
              style={{
                ...typography.body,
                color: colors.inkPrimary,
                fontWeight: 800,
                letterSpacing: '-0.1px',
              }}
            >
              {session.name}
            </div>
            {session.trainerComment ? (
              <Tag label="Commented" tone="primary" size="sm" icon={<MessageSquareText size={10} />} />
            ) : null}
          </div>
          <div style={{ ...typography.bodySmall, color: colors.inkMuted, marginTop: 2 }}>
            {when ? new Date(when).toLocaleString() : 'No date'} ·{' '}
            {session.exercises.length} exercises · {totalSets} sets
          </div>
        </div>
        {session.durationMinutes > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Clock size={14} color={colors.inkMuted} />
            <span
              style={{
                ...typography.body,
                color: colors.inkPrimary,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {session.durationMinutes} min
            </span>
          </div>
        ) : null}
        <ChevronDown
          size={18}
          color={colors.inkMuted}
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* Expanded detail */}
      {expanded ? (
        <SessionDetail session={session} nameCache={nameCache} />
      ) : null}
    </div>
  );
}

function SessionDetail({
  session,
  nameCache,
}: {
  session: WorkoutSession;
  nameCache: Map<string, string>;
}) {
  const hasAllNames = session.exercises.every((ex) => nameCache.has(ex.exerciseId));
  return (
    <div
      style={{
        padding: spacing.md,
        background: colors.bg,
        borderTop: `1px solid ${colors.line}`,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
      }}
    >
      {!hasAllNames ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.md }}>
          <LoadingSpinner size={20} />
        </div>
      ) : null}

      {session.exercises.map((ex, idx) => (
        <SessionExerciseCard
          key={`${ex.exerciseId}-${idx}`}
          index={idx}
          exercise={ex}
          name={nameCache.get(ex.exerciseId) ?? '…'}
        />
      ))}

      {session.trainerComment ? (
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            padding: spacing.md,
            background: colors.primarySoft,
            border: `1px solid ${colors.primaryBorder}`,
            borderRadius: radii.md,
          }}
        >
          <MessageSquareText size={16} color={colors.primary} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.6px',
                color: colors.primary,
                marginBottom: 2,
              }}
            >
              TRAINER COMMENT
            </div>
            <div style={{ ...typography.bodySmall, color: colors.inkPrimary }}>
              {session.trainerComment.text}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SessionExerciseCard({
  index,
  exercise,
  name,
}: {
  index: number;
  exercise: SessionExercise;
  name: string;
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.line}`,
        borderRadius: radii.md,
        overflow: 'hidden',
      }}
    >
      {/* Exercise header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.line}`,
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
            fontSize: 13,
            fontWeight: 800,
            color: colors.inkPrimary,
            textTransform: 'capitalize',
            letterSpacing: '-0.1px',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <span
          style={{
            fontSize: 11,
            color: colors.inkMuted,
            fontWeight: 700,
          }}
        >
          {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
        </span>
      </div>

      {/* Sets table */}
      <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1fr 60px',
            gap: spacing.sm,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.6px',
            color: colors.inkMuted,
            textTransform: 'uppercase',
            paddingBlock: 4,
          }}
        >
          <span>SET</span>
          <span>REPS</span>
          <span>WEIGHT</span>
          <span style={{ textAlign: 'right' }}>DONE</span>
        </div>
        {exercise.sets.map((s, sIdx) => (
          <div
            key={sIdx}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 60px',
              gap: spacing.sm,
              alignItems: 'center',
              paddingBlock: 4,
              borderTop: `1px solid ${colors.line}`,
              fontSize: 13,
              color: colors.inkPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: colors.primarySoft,
                color: colors.primary,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {sIdx + 1}
            </div>
            <span style={{ fontWeight: 700 }}>{s.reps}</span>
            <span style={{ fontWeight: 700 }}>
              {s.weightKg}
              <span style={{ fontSize: 10, color: colors.inkMuted, marginLeft: 3, fontWeight: 600 }}>
                kg
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              {s.completed ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: colors.primary,
                    color: colors.white,
                    fontSize: 11,
                    fontWeight: 900,
                    lineHeight: '18px',
                    textAlign: 'center',
                  }}
                >
                  ✓
                </span>
              ) : (
                <span style={{ fontSize: 10, color: colors.inkMuted, fontWeight: 700 }}>—</span>
              )}
            </span>
          </div>
        ))}
        {exercise.notes ? (
          <div
            style={{
              marginTop: spacing.sm,
              padding: `${spacing.xs}px ${spacing.sm}px`,
              background: colors.bg,
              borderRadius: radii.sm,
              fontSize: 12,
              color: colors.inkSecondary,
              fontStyle: 'italic',
            }}
          >
            {exercise.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Templates view                                                              */
/* -------------------------------------------------------------------------- */

function TemplatesView({
  templates,
  onOpenDetail,
  onCreate,
}: {
  templates: WorkoutTemplate[] | null;
  onOpenDetail: (id: string) => void;
  onCreate: () => void;
}) {
  if (templates === null) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
          <LoadingSpinner size={28} />
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <SectionHeader
        label="WORKOUT TEMPLATES"
        count={templates.length}
        action={
          <Button
            label="New template"
            variant="primary"
            size="sm"
            onClick={onCreate}
            leftIcon={<Plus size={13} />}
          />
        }
      />

      {templates.length === 0 ? (
        <button
          type="button"
          onClick={onCreate}
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
            textAlign: 'center',
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
            Create the first template
          </div>
          <div style={{ fontSize: 12, color: colors.inkSecondary, maxWidth: 320 }}>
            Build a workout your client can run on their mobile app — exercises, sets, reps, rest.
          </div>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {templates.map((t) => (
            <WorkoutTemplateCard
              key={t.id}
              template={toCardTemplate(t)}
              onPress={() => onOpenDetail(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
