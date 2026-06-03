import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Inbox,
  Scale,
  UserPlus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coachingApi } from '../../api/coachingApi';
import { healthApi } from '../../api/healthApi';
import { userApi } from '../../api/userApi';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Hero from '../../components/ui/Hero';
import HeroStat from '../../components/ui/HeroStat';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SectionHeader from '../../components/ui/SectionHeader';
import Tag from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { Coaching } from '../../types/coaching';
import type { User } from '../../types/types';

const CHECK_IN_INTERVAL_DAYS = 7;

interface ClientRow {
  coaching: Coaching;
  client: User | null;
  latestWeightKg: number | null;
  weightSource: 'health' | 'checkin' | 'profile' | null;
  lastCheckInAt: string | null;
  daysSinceCheckIn: number | null;
  overdue: boolean;
}

export default function TrainerDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pending, setPending] = useState<Coaching[] | null>(null);
  const [active, setActive] = useState<ClientRow[] | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [pendingList, activeList] = await Promise.all([
        coachingApi.getCoachingRequestsForTrainer(),
        coachingApi.getActiveCoachingsForTrainer(),
      ]);
      setPending(pendingList);
      const rows = await Promise.all(activeList.map((c) => buildClientRow(c)));
      rows.sort((a, b) => clientOverdueRank(b) - clientOverdueRank(a));
      setActive(rows);
    } catch (err) {
      console.error(err);
      toast.error('Could not load dashboard data.');
      setPending([]);
      setActive([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const totalClients = active?.length ?? 0;
    const pendingRequests = pending?.length ?? 0;
    const overdueClients = active?.filter((r) => r.overdue).length ?? 0;
    return { totalClients, pendingRequests, overdueClients };
  }, [active, pending]);

  const handleAccept = async (coachingId: string) => {
    setPendingActionId(coachingId);
    try {
      await coachingApi.acceptCoachingRequest(coachingId);
      toast.success('Coaching request accepted.');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not accept request.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleReject = async (coachingId: string) => {
    setPendingActionId(coachingId);
    try {
      await coachingApi.rejectCoachingRequest(coachingId);
      toast.success('Request rejected.');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not reject request.');
    } finally {
      setPendingActionId(null);
    }
  };

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const isLoading = active === null || pending === null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Hero --------------------------------------------------------- */}
      <Hero
        eyebrow={formatTodayEyebrow()}
        title={firstName ? `${greeting()}, Coach ${firstName}` : `${greeting()}, Coach`}
        subtitle={
          stats.overdueClients > 0
            ? `${stats.overdueClients} ${stats.overdueClients === 1 ? 'client needs' : 'clients need'} a check-in.`
            : 'Everyone is on track. Time to plan the week ahead.'
        }
        footer={
          <div style={{ display: 'flex', gap: spacing.xl, paddingTop: 4 }}>
            <HeroStat value={stats.totalClients} label={stats.totalClients === 1 ? 'client' : 'clients'} />
            <Divider />
            <HeroStat value={stats.overdueClients} label="overdue" accent={stats.overdueClients > 0} />
            <Divider />
            <HeroStat value={stats.pendingRequests} label={stats.pendingRequests === 1 ? 'request' : 'requests'} accent={stats.pendingRequests > 0} />
          </div>
        }
      />

      {/* Pending requests --------------------------------------------- */}
      {pending !== null && pending.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <SectionHeader label="PENDING REQUESTS" count={pending.length} countTone="accent" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {pending.map((c) => (
              <PendingRequestCard
                key={c.id}
                coaching={c}
                busy={pendingActionId === c.id}
                onAccept={() => handleAccept(c.id)}
                onReject={() => handleReject(c.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Active clients ------------------------------------------------ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SectionHeader label="ACTIVE CLIENTS" count={active?.length ?? null} />
        {isLoading ? (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.huge }}>
              <LoadingSpinner size={28} />
            </div>
          </Card>
        ) : active!.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox size={26} />}
              title="No active clients yet"
              description="When you accept a coaching request, your client will appear here."
            />
          </Card>
        ) : (
          <Card padding="xs">
            <ClientsTable
              rows={active!}
              onRowClick={(traineeId) => navigate(`/trainer/clients/${traineeId}`)}
            />
          </Card>
        )}
      </section>
    </div>
  );
}


function PendingRequestCard({
  coaching,
  busy,
  onAccept,
  onReject,
}: {
  coaching: Coaching;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [client, setClient] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getUserByFirebaseUid(coaching.traineeId)
      .then((u) => !cancelled && setClient(u))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [coaching.traineeId]);

  return (
    <div
      style={{
        position: 'relative',
        background: colors.surface,
        borderRadius: radii.xl,
        border: `1px solid ${colors.primaryBorder}`,
        padding: spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
      }}
    >
      {/* Accent dot */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: spacing.lg,
          right: spacing.lg,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colors.accent,
        }}
      />

      {/* Eyebrow pill */}
      <div
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          paddingInline: 10,
          paddingBlock: 4,
          borderRadius: radii.pill,
          background: 'rgba(255,107,53,0.14)',
          border: '1px solid rgba(255,107,53,0.32)',
          color: colors.accent,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '1px',
        }}
      >
        <UserPlus size={11} />
        NEW REQUEST
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={client?.displayName ?? coaching.traineeId} url={client?.avatarUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...typography.body,
              color: colors.inkPrimary,
              fontWeight: 800,
              letterSpacing: '-0.2px',
            }}
          >
            {client?.displayName ?? 'New trainee'}
          </div>
          <div
            style={{
              ...typography.bodySmall,
              color: colors.inkMuted,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 520,
            }}
          >
            {coaching.requestMessage
              ? `"${coaching.requestMessage}"`
              : 'No message provided.'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <Button
          label="Decline"
          variant="ghost"
          size="md"
          onClick={onReject}
          disabled={busy}
          leftIcon={<X size={14} />}
        />
        <div style={{ flex: 1 }}>
          <Button
            label="Accept"
            variant="primary"
            size="md"
            fullWidth
            onClick={onAccept}
            disabled={busy}
            leftIcon={<Check size={14} />}
          />
        </div>
      </div>
    </div>
  );
}


function ClientsTable({
  rows,
  onRowClick,
}: {
  rows: ClientRow[];
  onRowClick: (traineeId: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1.1fr 1.4fr 1fr 28px',
          gap: spacing.md,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          ...typography.caption,
          color: colors.inkMuted,
          fontWeight: 800,
          letterSpacing: '0.8px',
          fontSize: 10,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <div>CLIENT</div>
        <div>WEIGHT</div>
        <div>LAST CHECK-IN</div>
        <div>STATUS</div>
        <div />
      </div>
      {rows.map((row) => (
        <ClientRowItem
          key={row.coaching.id}
          row={row}
          onClick={() => onRowClick(row.coaching.traineeId)}
        />
      ))}
    </div>
  );
}

function ClientRowItem({ row, onClick }: { row: ClientRow; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const name = row.client?.displayName ?? 'Unknown';
  const daysSince = row.daysSinceCheckIn;
  const daysLeft = daysSince == null ? null : Math.max(0, CHECK_IN_INTERVAL_DAYS - daysSince);
  const overdueByDays = daysSince == null ? null : daysSince - CHECK_IN_INTERVAL_DAYS;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1.1fr 1.4fr 1fr 28px',
        gap: spacing.md,
        padding: `${spacing.md}px ${spacing.lg}px`,
        alignItems: 'center',
        borderTop: `1px solid ${colors.line}`,
        cursor: 'pointer',
        background: hovered ? colors.bg : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      {/* Client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
        <Avatar name={name} url={row.client?.avatarUrl} size={36} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              ...typography.body,
              color: colors.inkPrimary,
              fontWeight: 800,
              letterSpacing: '-0.1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          <div
            style={{
              ...typography.micro,
              color: colors.inkMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.client?.email ?? row.coaching.traineeId}
          </div>
        </div>
      </div>

      {/* Weight */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Scale size={14} color={colors.inkMuted} />
        {row.latestWeightKg != null ? (
          <>
            <span
              style={{
                ...typography.body,
                color: colors.inkPrimary,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.latestWeightKg.toFixed(1)}
              <span style={{ fontWeight: 600, color: colors.inkSecondary, marginLeft: 2 }}>kg</span>
            </span>
            {row.weightSource === 'health' ? (
              <Tag label="Live" tone="success" size="sm" />
            ) : null}
          </>
        ) : (
          <span style={{ ...typography.bodySmall, color: colors.inkMuted }}>—</span>
        )}
      </div>

      {/* Last check-in */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color={colors.inkMuted} />
          <span
            style={{
              ...typography.body,
              color: colors.inkPrimary,
              fontWeight: 600,
            }}
          >
            {relativeTime(row.lastCheckInAt)}
          </span>
        </div>
        {row.lastCheckInAt && daysSince != null ? (
          <span style={{ ...typography.micro, color: colors.inkMuted }}>
            {overdueByDays! > 0
              ? `${overdueByDays}d overdue`
              : daysLeft === 0
                ? 'Due today'
                : `${daysLeft}d to go`}
          </span>
        ) : null}
      </div>

      {/* Status */}
      <div>
        {row.overdue ? (
          <Tag label="Overdue" tone="danger" size="sm" icon={<AlertTriangle size={10} />} />
        ) : (
          <Tag label="On track" tone="success" size="sm" icon={<Check size={10} />} />
        )}
      </div>

      {/* Chevron */}
      <ChevronRight size={18} color={colors.inkMuted} />
    </div>
  );
}


function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        background: 'rgba(255,255,255,0.14)',
        marginInline: spacing.xs,
      }}
    />
  );
}


async function buildClientRow(coaching: Coaching): Promise<ClientRow> {
  let client: User | null = null;
  let latestWeightKg: number | null = null;
  let weightSource: ClientRow['weightSource'] = null;

  try {
    client = await userApi.getUserByFirebaseUid(coaching.traineeId);
  } catch {
  }

  try {
    const snap = await healthApi.getForClient(coaching.traineeId);
    if (snap?.latestWeightKg != null) {
      latestWeightKg = snap.latestWeightKg;
      weightSource = 'health';
    }
  } catch {
  }

  if (latestWeightKg == null && coaching.checkIns && coaching.checkIns.length > 0) {
    const sorted = [...coaching.checkIns].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    );
    const w = sorted.find((c) => c.weightKg != null)?.weightKg ?? null;
    if (w != null) {
      latestWeightKg = w;
      weightSource = 'checkin';
    }
  }

  if (latestWeightKg == null && client?.profile?.currentWeightKg != null) {
    latestWeightKg = client.profile.currentWeightKg;
    weightSource = 'profile';
  }

  const checkIns = coaching.checkIns ?? [];
  const latestCheckIn =
    checkIns.length > 0
      ? checkIns.reduce((latest, curr) => {
          const lt = new Date(latest.start).getTime();
          const ct = new Date(curr.start).getTime();
          return ct > lt ? curr : latest;
        })
      : null;
  const lastCheckInAt = latestCheckIn?.start ?? null;
  const daysSinceCheckIn = lastCheckInAt ? daysSince(lastCheckInAt) : null;
  const overdue =
    daysSinceCheckIn === null ? true : daysSinceCheckIn >= CHECK_IN_INTERVAL_DAYS;

  return { coaching, client, latestWeightKg, weightSource, lastCheckInAt, daysSinceCheckIn, overdue };
}

function clientOverdueRank(c: ClientRow): number {
  if (c.daysSinceCheckIn == null) return 9999;
  return c.daysSinceCheckIn;
}

function daysSince(iso: string): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins < 1 ? 'Just now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}

function formatTodayEyebrow() {
  return new Date()
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
    .toUpperCase();
}

