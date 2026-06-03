import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  MessageSquareText,
  Moon,
  RefreshCw,
  Scale,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coachingApi } from '../../api/coachingApi';
import { healthApi, type HealthSnapshotResponse } from '../../api/healthApi';
import { API_ORIGIN } from '../../api/apiClient';
import { userApi } from '../../api/userApi';
import { workoutApi } from '../../api/workoutApi';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import SectionHeader from '../../components/ui/SectionHeader';
import StatTile from '../../components/ui/StatTile';
import Tag from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { CheckIn } from '../../types/checkin';
import type { Coaching } from '../../types/coaching';
import type { User } from '../../types/types';
import type { WorkoutSession } from '../../types/workout';

type Tab = 'health' | 'workouts' | 'checkins';

const SYNC_POLL_INTERVAL_MS = 3_000;
const SYNC_POLL_MAX_MS = 30_000;
const CHECK_IN_INTERVAL_DAYS = 7;

export default function TrainerClientDetailPage() {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<HealthSnapshotResponse | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('health');

  const [syncing, setSyncing] = useState(false);
  const syncStartedAt = useRef<number | null>(null);
  const initialSnapshotUploadedAt = useRef<string | null>(null);

  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const loadAll = useCallback(async () => {
    if (!traineeId) return;
    try {
      const [coachings, user, snap, sess] = await Promise.all([
        coachingApi.getActiveCoachingsForTrainer(),
        userApi.getUserByFirebaseUid(traineeId).catch(() => null),
        healthApi.getForClient(traineeId).catch(() => null),
        workoutApi.listSessionsForTraineeOfTrainer(traineeId).catch(() => [] as WorkoutSession[]),
      ]);
      const c = coachings.find((x) => x.traineeId === traineeId) ?? null;
      if (!c) {
        setLoadError('This client is not in your active list.');
        return;
      }
      setCoaching(c);
      setClient(user);
      setSnapshot(snap);
      setSessions(sess);
    } catch (err) {
      console.error(err);
      setLoadError('Failed to load client data.');
    }
  }, [traineeId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!syncing || !traineeId) return;
    let cancelled = false;
    const tick = async () => {
      const fresh = await healthApi.getForClient(traineeId).catch(() => null);
      if (cancelled) return;
      const newUploadedAt = fresh?.uploadedAt ?? null;
      if (
        fresh &&
        newUploadedAt &&
        newUploadedAt !== initialSnapshotUploadedAt.current
      ) {
        setSnapshot(fresh);
        toast.success('Client data updated.');
        setSyncing(false);
        return;
      }
      const startedAt = syncStartedAt.current ?? Date.now();
      if (Date.now() - startedAt > SYNC_POLL_MAX_MS) {
        setSyncing(false);
        toast.info('Client device did not respond in time. They may be offline.');
        return;
      }
      window.setTimeout(tick, SYNC_POLL_INTERVAL_MS);
    };
    window.setTimeout(tick, SYNC_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
    };
  }, [syncing, traineeId, toast]);

  const handleEndCoaching = async () => {
    if (!coaching) return;
    setEnding(true);
    try {
      await coachingApi.endCoaching(coaching.id);
      toast.success('Coaching ended.');
      navigate('/trainer');
    } catch (err) {
      console.error(err);
      toast.error('Could not end coaching.');
      setEnding(false);
    }
  };

  const handleRequestSync = async () => {
    if (!traineeId || syncing) return;
    setSyncing(true);
    syncStartedAt.current = Date.now();
    initialSnapshotUploadedAt.current = snapshot?.uploadedAt ?? null;
    try {
      await healthApi.requestClientSync(traineeId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send refresh request.');
      setSyncing(false);
    }
  };

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <BackLink onClick={() => navigate('/trainer')} />
        <Card>
          <p style={{ ...typography.body, color: colors.danger, margin: 0 }}>{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!coaching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const checkIns = [...(coaching.checkIns ?? [])]
    .filter((c) => c.id)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  // Client status: overdue?
  const latestCheckIn = checkIns[0];
  const daysSinceLast = latestCheckIn ? daysSince(latestCheckIn.start) : null;
  const overdue = daysSinceLast == null || daysSinceLast >= CHECK_IN_INTERVAL_DAYS;
  const avgEnergy =
    checkIns.length > 0
      ? checkIns.reduce((s, c) => s + (c.overallEnergyLevel ?? 0), 0) / checkIns.length
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      <BackLink onClick={() => navigate('/trainer')} />

      {/* Client identity hero ---------------------------------------- */}
      <div
        style={{
          background: colors.primary,
          color: colors.white,
          borderRadius: radii.xxl,
          padding: spacing.xl,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: shadows.card,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -100,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: colors.primaryDark,
            opacity: 0.5,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -140,
            left: -100,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: colors.primaryDark,
            opacity: 0.3,
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: spacing.lg,
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ padding: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }}>
            <Avatar name={client?.displayName ?? traineeId} url={client?.avatarUrl} size={84} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.4px',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              CLIENT PROFILE
            </div>
            <h1
              style={{
                fontSize: 32,
                lineHeight: '36px',
                letterSpacing: '-0.6px',
                fontWeight: 800,
                margin: 0,
                marginTop: 4,
                color: colors.white,
              }}
            >
              {client?.displayName ?? 'Client'}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.78)',
                margin: 0,
                marginTop: 2,
                fontWeight: 500,
              }}
            >
              {client?.email ?? traineeId}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
              {overdue ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: radii.pill,
                    background: 'rgba(255,107,53,0.18)',
                    border: '1px solid rgba(255,107,53,0.45)',
                    color: colors.accent,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '1px',
                  }}
                >
                  <AlertTriangle size={11} />
                  OVERDUE
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: radii.pill,
                    background: 'rgba(16,185,129,0.18)',
                    border: '1px solid rgba(16,185,129,0.45)',
                    color: '#34D399',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '1px',
                  }}
                >
                  ON TRACK
                </span>
              )}
              {coaching.startedAt ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Coaching since {new Date(coaching.startedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          </div>
          <Button
            label="End coaching"
            variant="ghost"
            size="md"
            onClick={() => setEndOpen(true)}
            disabled={ending}
            leftIcon={<XCircle size={14} />}
          />
        </div>
      </div>

      <Modal
        open={endOpen}
        onClose={() => (ending ? undefined : setEndOpen(false))}
        title="End coaching?"
        footer={
          <>
            <Button label="Cancel" variant="ghost" onClick={() => setEndOpen(false)} disabled={ending} />
            <Button label="End coaching" variant="danger" onClick={handleEndCoaching} disabled={ending} />
          </>
        }
      >
        <p style={{ ...typography.body, color: colors.inkSecondary, margin: 0 }}>
          {client?.displayName ?? 'This client'} will no longer be in your active list. Past
          workouts and check-ins stay in history. The client can request coaching again later.
        </p>
      </Modal>

      {/* Quick stat tiles ------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: spacing.md,
        }}
      >
        <StatTile
          icon={<Scale size={14} />}
          label="WEIGHT"
          value={snapshot?.latestWeightKg != null ? snapshot.latestWeightKg.toFixed(1) : '—'}
          unit={snapshot?.latestWeightKg != null ? 'kg' : undefined}
          tone="primary"
        />
        <StatTile
          icon={<Zap size={14} />}
          label="AVG ENERGY"
          value={avgEnergy != null ? avgEnergy.toFixed(1) : '—'}
          unit={avgEnergy != null ? '/5' : undefined}
          tone="accent"
        />
        <StatTile
          icon={<CalendarDays size={14} />}
          label="CHECK-INS"
          value={checkIns.length}
          tone="success"
        />
        <StatTile
          icon={<Dumbbell size={14} />}
          label="WORKOUTS"
          value={sessions?.length ?? 0}
          tone="warning"
        />
      </div>

      {/* Tabs --------------------------------------------------------- */}
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
          active={activeTab === 'health'}
          onClick={() => setActiveTab('health')}
          label="Health"
          icon={<Heart size={14} />}
        />
        <TabButton
          active={activeTab === 'workouts'}
          onClick={() => setActiveTab('workouts')}
          label={`Workouts${sessions ? ` · ${sessions.length}` : ''}`}
          icon={<Dumbbell size={14} />}
        />
        <TabButton
          active={activeTab === 'checkins'}
          onClick={() => setActiveTab('checkins')}
          label={`Check-ins · ${checkIns.length}`}
          icon={<CalendarDays size={14} />}
        />
      </div>

      {activeTab === 'health' ? (
        <HealthTab snapshot={snapshot} syncing={syncing} onRequestSync={handleRequestSync} />
      ) : null}
      {activeTab === 'workouts' ? <WorkoutsTab sessions={sessions} /> : null}
      {activeTab === 'checkins' ? <CheckInsTab checkIns={checkIns} /> : null}
    </div>
  );
}


function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `8px 16px`,
        borderRadius: radii.md,
        background: active ? colors.primary : 'transparent',
        color: active ? colors.white : colors.inkSecondary,
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        letterSpacing: '0.1px',
        transition: 'all 0.12s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}


function HealthTab({
  snapshot,
  syncing,
  onRequestSync,
}: {
  snapshot: HealthSnapshotResponse | null;
  syncing: boolean;
  onRequestSync: () => void;
}) {
  if (!snapshot) {
    return (
      <Card>
        <EmptyState
          icon={<Heart size={26} />}
          title="No health data yet"
          description="When your client syncs their Health Connect data from the mobile app, the latest values will appear here."
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: spacing.lg }}>
          <SyncButton syncing={syncing} onClick={onRequestSync} />
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Refresh strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
          Last updated {formatRelative(snapshot.uploadedAt)}
        </div>
        <SyncButton syncing={syncing} onClick={onRequestSync} />
      </div>

      {/* Today */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader label="TODAY" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md }}>
          <StatTile
            icon={<Footprints size={14} />}
            label="STEPS"
            value={formatNumber(snapshot.stepsToday)}
            tone="primary"
          />
          <StatTile
            icon={<Flame size={14} />}
            label="CALORIES"
            value={formatNumber(snapshot.activeCaloriesToday)}
            unit="kcal"
            tone="accent"
          />
          <StatTile
            icon={<Droplets size={14} />}
            label="HYDRATION"
            value={formatNumber(snapshot.hydrationMlToday)}
            unit="ml"
            tone="primary"
          />
          <StatTile
            icon={<Activity size={14} />}
            label="DISTANCE"
            value={(snapshot.distanceMetersToday / 1000).toFixed(2)}
            unit="km"
            tone="success"
          />
        </div>
      </section>

      {/* Body */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader label="BODY" />
        <Card padding="xl">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg }}>
            <MetricInline
              icon={<Scale size={14} color={colors.primary} />}
              label="WEIGHT"
              value={snapshot.latestWeightKg != null ? `${snapshot.latestWeightKg.toFixed(1)} kg` : '—'}
              sub={snapshot.latestWeightAt ? formatRelative(snapshot.latestWeightAt) : undefined}
            />
            <MetricInline
              icon={<Activity size={14} color={colors.accent} />}
              label="BODY FAT"
              value={snapshot.bodyFatPercent != null ? `${snapshot.bodyFatPercent.toFixed(1)} %` : '—'}
            />
            <MetricInline
              icon={<Flame size={14} color={colors.warning} />}
              label="BMR"
              value={snapshot.bmrKcal != null ? `${formatNumber(snapshot.bmrKcal)} kcal` : '—'}
            />
          </div>

          {snapshot.weightTrend && snapshot.weightTrend.length > 1 ? (
            <div style={{ marginTop: spacing.xl }}>
              <div
                style={{
                  ...typography.caption,
                  color: colors.inkMuted,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  fontSize: 10,
                  marginBottom: spacing.sm,
                }}
              >
                WEIGHT TREND
              </div>
              <WeightSparkline points={snapshot.weightTrend} />
            </div>
          ) : null}
        </Card>
      </section>

      {/* Vitals + sleep */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader label="VITALS & SLEEP" />
        <Card padding="xl">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.lg }}>
            <MetricInline
              icon={<Heart size={14} color={colors.danger} />}
              label="HEART RATE"
              value={snapshot.latestHeartRateBpm != null ? `${snapshot.latestHeartRateBpm} bpm` : '—'}
              sub={snapshot.latestHeartRateAt ? formatRelative(snapshot.latestHeartRateAt) : undefined}
            />
            <MetricInline
              icon={<Heart size={14} color={colors.inkMuted} />}
              label="RESTING HR"
              value={snapshot.restingHeartRate != null ? `${snapshot.restingHeartRate} bpm` : '—'}
            />
            <MetricInline
              icon={<Moon size={14} color={colors.primary} />}
              label="LAST SLEEP"
              value={snapshot.lastSleepMinutes != null ? formatDuration(snapshot.lastSleepMinutes) : '—'}
              sub={snapshot.lastSleepEndedAt ? formatRelative(snapshot.lastSleepEndedAt) : undefined}
            />
            <MetricInline
              icon={<Moon size={14} color={colors.inkMuted} />}
              label="AVG SLEEP · 7D"
              value={snapshot.avgSleepMinutes7d != null ? formatDuration(snapshot.avgSleepMinutes7d) : '—'}
            />
          </div>
        </Card>
      </section>

      {/* Recent exercises */}
      {snapshot.recentExercises && snapshot.recentExercises.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <SectionHeader
            label="RECENT ACTIVITY · HEALTH CONNECT"
            count={snapshot.recentExercises.length}
          />
          <Card padding="md">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {snapshot.recentExercises.slice(0, 6).map((ex, i, arr) => (
                <div
                  key={`${ex.startAt}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: `${spacing.sm}px ${spacing.sm}px`,
                    borderBottom: i < arr.length - 1 ? `1px solid ${colors.line}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radii.lg,
                      background: colors.accentSoft,
                      color: colors.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Activity size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...typography.bodySmall, color: colors.inkPrimary, fontWeight: 800 }}>
                      {ex.title ?? 'Workout'}
                    </div>
                    <div style={{ ...typography.micro, color: colors.inkMuted }}>
                      {new Date(ex.startAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ ...typography.bodySmall, color: colors.inkSecondary, fontWeight: 700 }}>
                    {ex.durationMinutes} min
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function SyncButton({ syncing, onClick }: { syncing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={syncing}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: syncing ? colors.surfaceElevated : colors.primary,
        color: syncing ? colors.inkSecondary : colors.white,
        border: `1px solid ${syncing ? colors.line : colors.primaryDark}`,
        borderRadius: radii.lg,
        padding: `8px 14px`,
        cursor: syncing ? 'wait' : 'pointer',
        ...typography.bodySmall,
        fontWeight: 700,
      }}
    >
      <RefreshCw size={14} style={{ animation: syncing ? 'ls-spin 1s linear infinite' : 'none' }} />
      {syncing ? 'Waiting for device…' : 'Refresh from device'}
    </button>
  );
}

function MetricInline({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: colors.inkMuted,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.4px',
          color: colors.inkPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {sub ? <div style={{ ...typography.micro, color: colors.inkMuted }}>{sub}</div> : null}
    </div>
  );
}

function WeightSparkline({ points }: { points: { at: string; kg: number }[] }) {
  const sorted = [...points].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const kg = sorted.map((p) => p.kg);
  const min = Math.min(...kg);
  const max = Math.max(...kg);
  const range = Math.max(0.001, max - min);
  const W = 600;
  const H = 80;
  const points2d = sorted.map((p, i) => {
    const x = (i / (sorted.length - 1)) * W;
    const y = H - ((p.kg - min) / range) * H;
    return `${x},${y}`;
  });
  const last = sorted[sorted.length - 1];
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: 80,
          background: colors.bg,
          borderRadius: radii.md,
          border: `1px solid ${colors.line}`,
        }}
      >
        <polyline
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points2d.join(' ')}
        />
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          ...typography.micro,
          color: colors.inkMuted,
          marginTop: 4,
        }}
      >
        <span>{min.toFixed(1)} kg · {new Date(sorted[0].at).toLocaleDateString()}</span>
        <span>{last.kg.toFixed(1)} kg · {new Date(last.at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}


function WorkoutsTab({ sessions }: { sessions: WorkoutSession[] | null }) {
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
        <WorkoutRow key={s.id} session={s} />
      ))}
    </div>
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


function CheckInsTab({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays size={26} />}
          title="No check-ins yet"
          description="Weekly check-ins from your client will show up here."
        />
      </Card>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {checkIns.map((ci) => (
        <CheckInRow key={ci.id} checkIn={ci} />
      ))}
    </div>
  );
}

function resolvePhotoUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}

function CheckInRow({ checkIn }: { checkIn: CheckIn }) {
  const photos =
    checkIn.photoUrls && checkIn.photoUrls.length > 0
      ? checkIn.photoUrls
      : checkIn.photoUrl
        ? [checkIn.photoUrl]
        : [];

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start' }}>
        {/* Date block */}
        <div
          style={{
            minWidth: 64,
            padding: `${spacing.sm}px ${spacing.xs}px`,
            borderRadius: radii.lg,
            background: colors.primary,
            color: colors.white,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px' }}>
            {new Date(checkIn.start).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {new Date(checkIn.start).getDate()}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <h3
              style={{
                ...typography.h3,
                color: colors.inkPrimary,
                margin: 0,
                fontWeight: 800,
                letterSpacing: '-0.2px',
              }}
            >
              Weekly check-in
            </h3>
            <Tag
              label={`Energy ${checkIn.overallEnergyLevel}/5`}
              tone="primary"
              size="sm"
              icon={<Zap size={10} />}
            />
            {checkIn.trainerComment ? (
              <Tag label="Replied" tone="success" size="sm" icon={<MessageSquareText size={10} />} />
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: spacing.lg, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            {checkIn.weightKg != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale size={14} color={colors.inkSecondary} />
                <span
                  style={{
                    ...typography.body,
                    color: colors.inkPrimary,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {checkIn.weightKg.toFixed(1)} kg
                </span>
              </div>
            ) : null}
            <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
              {formatRelative(checkIn.start)}
            </div>
          </div>

          {checkIn.note ? (
            <p
              style={{
                ...typography.body,
                color: colors.inkSecondary,
                margin: 0,
                marginTop: spacing.sm,
                whiteSpace: 'pre-wrap',
              }}
            >
              "{checkIn.note}"
            </p>
          ) : null}

          {checkIn.trainerComment ? (
            <div
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                background: colors.successSoft,
                borderRadius: radii.lg,
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  color: colors.success,
                }}
              >
                YOUR REPLY
              </div>
              <div
                style={{
                  ...typography.body,
                  color: colors.inkPrimary,
                  marginTop: 4,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {checkIn.trainerComment.text}
              </div>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
              {photos.map((url, i) => (
                <a
                  key={url + i}
                  href={resolvePhotoUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: 96,
                    height: 96,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    border: `1px solid ${colors.line}`,
                    background: colors.surfaceElevated,
                  }}
                >
                  <img
                    src={resolvePhotoUrl(url)}
                    alt="check-in"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}


function BackLink({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        color: hovered ? colors.primary : colors.inkSecondary,
        cursor: 'pointer',
        padding: 0,
        ...typography.bodySmall,
        fontWeight: 700,
        transition: 'color 0.12s',
        alignSelf: 'flex-start',
      }}
    >
      <ArrowLeft size={16} />
      Back to clients
    </button>
  );
}

function daysSince(iso: string): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
