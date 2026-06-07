import { Clock, Dumbbell, MessageSquareText } from "lucide-react";

import { useState } from "react";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import TabButton from "../../../components/ui/TabButton";
import Tag from "../../../components/ui/Tag";
import { WorkoutTemplateCard } from "../../../components/WorkoutTemplateCard";
import { colors, radii, spacing, typography } from "../../../theme";
import type { WorkoutSession, WorkoutTemplate } from "../../../types/workout";
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
}
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

export default function WorkoutsTab({ sessions, templates }: WorkoutsTabProps) {
    const [activeTab, setActiveTab] = useState('sessions');
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
    <>
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

    {activeTab === 'templates' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {templates?.map((t) => (
                <WorkoutTemplateCard key={t.id} template={toCardTemplate(t)} />
            ))}
        </div>
    ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {sorted.map((s) => (
            <WorkoutRow key={s.id} session={s} />
        ))}
        </div>
    )}
    
    </>
  );
}

function WorkoutRow({ session }: { session: WorkoutSession }) {
  const when = session.finishedAt ?? session.startedAt;
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
      </div>
    </Card>
  );
}