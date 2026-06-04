import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    Activity,
    Calculator,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Dumbbell,
    Flame,
    Play,
    Plus,
    Scale,
    Search,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { workoutApi } from '../../api/workoutApi';
import { TraineeCalendarCard } from '../../components/calendar/TraineeCalendarCard';
import { HealthHomeCards } from '../../components/health/HealthHomeCards';
import { ScreenHeader } from '../../components/layout';
import { Avatar, BadgeCheck, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { colors, radii, shadows, spacing } from '../../theme';
import type { CheckIn } from '../../types/checkin';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';
import type { WorkoutSession, WorkoutTemplate } from '../../types/workout';
import {
    CHECK_IN_INTERVAL_DAYS,
    getEarliestCheckIn,
    getLatestCheckIn,
} from '../../utils/clientCoaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TraineeDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [activeCoaching, setActiveCoaching] = useState<Coaching | null>(null);
  const [trainer, setTrainer] = useState<User | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, coachings, t, s] = await Promise.all([
        authService.getUser(),
        coachingApi.getMyCoachings().catch(() => [] as Coaching[]),
        workoutApi.listTemplates().catch(() => [] as WorkoutTemplate[]),
        workoutApi.listSessions().catch(() => [] as WorkoutSession[]),
      ]);
      setUser(u);
      const active = coachings.find(c => c.status === 'ACTIVE') ?? null;
      setActiveCoaching(active);
      setTemplates(t);
      setSessions(s);

      if (active) {
        try {
          const tr =
            (await userApi.getUserById(active.trainerId).catch(() => null)) ||
            (await userApi.getUserByFirebaseUid(active.trainerId).catch(() => null));
          setTrainer(tr);
        } catch {
          setTrainer(null);
        }
      } else {
        setTrainer(null);
      }
    } catch (e) {
      console.error('Dashboard load failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const stats = useMemo(() => buildTraineeStats(sessions), [sessions]);
  const nextTemplate = useMemo(() => pickNextTemplate(templates, sessions), [templates, sessions]);
  const recentSessions = useMemo(() => [...sessions].sort(byNewestSession).slice(0, 3), [sessions]);

  return (
    <Screen edges={['top']}>
      {loading ? (
        <>
          <ScreenHeader title="Home" />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Hero ------------------------------------------------ */}
          <View style={styles.heroWrap}>
            <View style={[styles.hero, shadows.card]}>
              <View style={styles.heroGlow} />
              <View style={styles.heroGlowBottom} />

              <View style={styles.heroTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroEyebrow}>{formatTodayEyebrow()}</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {greeting()},
                  </Text>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {user?.displayName || 'Athlete'}
                  </Text>
                </View>
                <View style={styles.heroRight}>
                  <View style={styles.heroAvatarRing}>
                    <Avatar source={getUserAvatarSource(user)} size="lg" />
                  </View>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <HeroStat value={String(stats.total)} label={stats.total === 1 ? 'workout' : 'workouts'} />
                <View style={styles.heroStatDivider} />
                <HeroStat value={String(stats.thisWeek)} label="this week" />
                <View style={styles.heroStatDivider} />
                <HeroStat
                  value={String(stats.streak)}
                  label={stats.streak === 1 ? 'wk streak' : 'wk streak'}
                  accent={stats.streak > 0}
                  icon={stats.streak > 0 ? <Flame size={11} color={colors.accent} fill={colors.accent} strokeWidth={0} /> : undefined}
                />
              </View>
            </View>
          </View>

          {/* Quick actions ------------------------------------ */}
          <View style={styles.gutter}>
            <View style={styles.quickRow}>
              <QuickAction
                icon={<Dumbbell size={18} color={colors.primary} strokeWidth={2.25} />}
                label="My workouts"
                hint={templates.length === 0 ? 'Start building' : `${templates.length} templates`}
                onPress={() => navigation.navigate('TraineeRoot', { screen: 'Workouts' })}
              />
              <QuickAction
                icon={<Calculator size={18} color={colors.accent} strokeWidth={2.25} />}
                label="Calorie calc"
                hint="BMR & macros"
                onPress={() => navigation.navigate('CalorieCalculator')}
                accent
              />
            </View>
          </View>

          {/* Next workout ------------------------------------ */}
          <SectionHeader label="UP NEXT" />
          <View style={styles.gutter}>
            {nextTemplate ? (
              <NextWorkoutCard
                template={nextTemplate}
                onStart={() =>
                  navigation.navigate('TemplateDetail', { templateId: nextTemplate.id, canStart: true })
                }
              />
            ) : (
              <EmptyCta
                icon={<Plus size={20} color={colors.primary} strokeWidth={2.25} />}
                title="Build your first workout"
                hint="Pick exercises from the library and save a template you can run anytime."
                cta="Create template"
                onPress={() => navigation.navigate('ExercisePicker', { mode: 'select' })}
              />
            )}
          </View>

          {/* Activity calendar ---------------------------------- */}
          <SectionHeader label="CALENDAR" />
          <View style={styles.gutter}>
            <TraineeCalendarCard />
          </View>

          {/* Health ------------------------------------------- */}
          <SectionHeader label="HEALTH" />
          <View style={styles.gutter}>
            <HealthHomeCards
              onViewAll={() => navigation.navigate('Health')}
              onConnect={() => navigation.navigate('Health')}
            />
          </View>

          {/* Coach -------------------------------------------- */}
          <SectionHeader label="YOUR COACH" />
          <View style={styles.gutter}>
            {activeCoaching && trainer ? (
              <CoachStrip
                trainer={trainer}
                checkInsCount={activeCoaching.checkIns?.length ?? 0}
                onPress={()=>{}}
              />
            ) : (
              <EmptyCta
                icon={<Search size={20} color={colors.primary} strokeWidth={2.25} />}
                title="Find a coach"
                hint="Connect with a verified trainer to get a personalised plan and accountability."
                cta="Browse trainers"
                onPress={() => navigation.navigate('FindTrainer')}
              />
            )}
          </View>

          {/* Check-ins ---------------------------------------- */}
          {activeCoaching ? (
            <>
              <SectionHeader
                label="CHECK-INS"
                count={activeCoaching.checkIns?.length ?? 0}
              />
              <View style={styles.gutter}>
                <CheckInSection
                  checkIns={activeCoaching.checkIns ?? []}
                  onOpen={(checkIn) => navigation.navigate('WeeklyCheckIn', { checkIn })}
                  onCreate={() => navigation.navigate('WeeklyCheckIn')}
                />
              </View>
            </>
          ) : null}

          {/* Recent activity --------------------------------- */}
          {recentSessions.length > 0 ? (
            <>
              <SectionHeader label="RECENT ACTIVITY" count={recentSessions.length} />
              <View style={styles.gutter}>
                <View style={styles.listCard}>
                  {recentSessions.map((s, idx) => (
                    <React.Fragment key={s.id}>
                      {idx > 0 ? <View style={styles.listDivider} /> : null}
                      <RecentSessionRow
                        session={s}
                        onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
                      />
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </Screen>
  );
}


function HeroStat({
  value,
  label,
  accent,
  icon,
}: {
  value: string;
  label: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        {icon ? <View style={{ marginRight: 4 }}>{icon}</View> : null}
        <Text mono tabular style={[styles.heroStatValue, accent && { color: colors.accent }]}>
          {value}
        </Text>
      </View>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleLeft}>
        <View style={styles.sectionBar} />
        <Text variant="caption" weight="800" style={styles.sectionLabel}>
          {label}
        </Text>
      </View>
      {count != null ? (
        <View style={styles.sectionCount}>
          <Text variant="micro" weight="700" mono tabular style={styles.sectionCountText}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, accent && styles.quickActionAccent, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.quickIcon, accent && styles.quickIconAccent]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1} style={styles.quickLabel}>
          {label}
        </Text>
        <Text variant="micro" color="muted" numberOfLines={1}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function NextWorkoutCard({ template, onStart }: { template: WorkoutTemplate; onStart: () => void }) {
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const estMin = Math.max(1, Math.round((totalSets * 105) / 60));
  return (
    <Pressable
      onPress={onStart}
      style={({ pressed }) => [styles.nextCard, shadows.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.nextGlow} />
      <View style={styles.nextHeader}>
        <View style={styles.nextEyebrowPill}>
          <Sparkles size={11} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.nextEyebrowText}>NEXT WORKOUT</Text>
        </View>
      </View>
      <Text style={styles.nextTitle} numberOfLines={2}>
        {template.name}
      </Text>
      <View style={styles.nextMetaRow}>
        <View style={styles.nextMetaItem}>
          <Dumbbell size={12} color="rgba(255,255,255,0.78)" strokeWidth={2.5} />
          <Text style={styles.nextMetaText}>
            {template.exercises.length} {template.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        <View style={styles.nextMetaItem}>
          <Activity size={12} color="rgba(255,255,255,0.78)" strokeWidth={2.5} />
          <Text style={styles.nextMetaText}>{totalSets} sets</Text>
        </View>
        <View style={styles.nextMetaItem}>
          <Text style={styles.nextMetaText}>~{estMin} min</Text>
        </View>
      </View>
      <View style={styles.nextCta}>
        <View style={styles.nextCtaIcon}>
          <Play size={14} color={colors.white} fill={colors.white} strokeWidth={0} />
        </View>
        <Text style={styles.nextCtaText}>Start workout</Text>
        <ChevronRight size={16} color={colors.white} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

function CoachStrip({
  trainer,
  checkInsCount,
  onPress,
}: {
  trainer: User;
  checkInsCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.coachCard, pressed && { opacity: 0.92 }]}
    >
      <Avatar source={getUserAvatarSource(trainer)} size="xl" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.coachNameRow}>
          <Text variant="body" weight="800" numberOfLines={1} style={styles.coachName}>
            {trainer.displayName || 'Your coach'}
          </Text>
          <BadgeCheck size={14} />
        </View>
        <View style={styles.coachStatusRow}>
          <View style={styles.coachStatusDot} />
          <Text variant="micro" color="secondary" weight="600">
            Active · {checkInsCount} {checkInsCount === 1 ? 'check-in' : 'check-ins'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyCta({
  icon,
  title,
  hint,
  cta,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.emptyIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="800">{title}</Text>
        <Text variant="micro" color="muted" style={styles.emptyHint}>{hint}</Text>
        <View style={styles.emptyCtaRow}>
          <Text variant="micro" weight="800" color="brand" style={styles.emptyCtaText}>
            {cta.toUpperCase()}
          </Text>
          <ChevronRight size={12} color={colors.primary} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function RecentSessionRow({ session, onPress }: { session: WorkoutSession; onPress: () => void }) {
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const volume = session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, s) => s2 + s.reps * s.weightKg, 0),
    0,
  );
  const when = session.finishedAt ?? session.startedAt;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.recentIcon}>
        <TrendingUp size={14} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1}>{session.name}</Text>
        <Text variant="micro" color="muted">
          {formatRelative(when)} · {totalSets} sets · {volume > 0 ? formatVolume(volume) : '—'} kg
        </Text>
      </View>
      <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

function CheckInSection({
  checkIns,
  onOpen,
  onCreate,
}: {
  checkIns: CheckIn[];
  onOpen: (checkIn: CheckIn) => void;
  onCreate: () => void;
}) {
  const latest = getLatestCheckIn(checkIns);
  const earliest = getEarliestCheckIn(checkIns);

  const now = new Date();
  const latestStart = latest ? new Date(latest.start) : null;
  const daysSinceLast =
    latestStart && !Number.isNaN(latestStart.getTime())
      ? Math.floor((now.getTime() - latestStart.getTime()) / 86_400_000)
      : null;
  const daysUntilNext =
    daysSinceLast == null ? 0 : Math.max(0, CHECK_IN_INTERVAL_DAYS - daysSinceLast);
  const available = checkIns.length === 0 || daysUntilNext === 0;

  // Stats
  const totalCount = checkIns.length;
  const weightDelta =
    earliest?.weightKg != null && latest?.weightKg != null && earliest !== latest
      ? latest.weightKg - earliest.weightKg
      : null;

  // Two most-recent for the list preview
  const recent = useMemo(
    () =>
      [...checkIns]
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
        .slice(0, 2),
    [checkIns],
  );

  return (
    <View style={{ gap: spacing.md }}>
      {/* Next check-in CTA card */}
      <Pressable
        onPress={() => {
          if (available) {
            onCreate();
          }
        }}
        style={({ pressed }) => [
          styles.checkInHero,
          available ? styles.checkInHeroAvailable : styles.checkInHeroScheduled,
          pressed && { opacity: 0.92 },
        ]}
      >
        <View
          style={[
            styles.checkInHeroIcon,
            available ? styles.checkInHeroIconAvailable : styles.checkInHeroIconScheduled,
          ]}
        >
          <ClipboardCheck size={20} color={colors.white} strokeWidth={2.25} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.checkInHeroEyebrow}>
            {available
              ? totalCount === 0
                ? 'INITIAL CHECK-IN'
                : 'NEXT CHECK-IN · AVAILABLE NOW'
              : 'NEXT CHECK-IN'}
          </Text>
          <Text style={styles.checkInHeroTitle} numberOfLines={1}>
            {available
              ? totalCount === 0
                ? 'Start your journey'
                : 'Tap to log this week'
              : `In ${daysUntilNext} ${daysUntilNext === 1 ? 'day' : 'days'}`}
          </Text>
          <Text style={styles.checkInHeroSub} numberOfLines={1}>
            {latest
              ? `Last logged ${formatRelative(latest.start)}`
              : 'Weight · photos · energy level'}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.white} strokeWidth={2.5} />
      </Pressable>

      {/* Stat row */}
      <View style={styles.checkInStatsRow}>
        <CheckInStatTile
          icon={<ClipboardCheck size={13} color={colors.primary} strokeWidth={2.25} />}
          value={String(totalCount)}
          label={totalCount === 1 ? 'check-in' : 'check-ins'}
        />
        <CheckInStatTile
          icon={<Clock size={13} color={colors.primary} strokeWidth={2.25} />}
          value={daysSinceLast == null ? '—' : String(daysSinceLast)}
          label={daysSinceLast === 1 ? 'day ago' : 'days ago'}
        />
        <CheckInStatTile
          icon={
            weightDelta == null ? (
              <Scale size={13} color={colors.primary} strokeWidth={2.25} />
            ) : weightDelta > 0 ? (
              <TrendingUp size={13} color={colors.accent} strokeWidth={2.25} />
            ) : (
              <TrendingDown size={13} color={colors.success} strokeWidth={2.25} />
            )
          }
          value={
            weightDelta == null
              ? '—'
              : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}`
          }
          unit={weightDelta == null ? undefined : 'kg'}
          label="weight"
          accent={weightDelta != null && weightDelta < 0}
        />
      </View>

      {/* Recent check-ins list */}
      {recent.length > 0 ? (
        <View style={styles.listCard}>
          {recent.map((c, idx) => (
            <React.Fragment key={c.id ?? `${c.start}-${idx}`}>
              {idx > 0 ? <View style={styles.listDivider} /> : null}
              <CheckInRow checkIn={c} onPress={() => onOpen(c)} />
            </React.Fragment>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CheckInStatTile({
  icon,
  value,
  unit,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.checkInStat}>
      <View style={styles.checkInStatHeader}>
        <View style={styles.checkInStatIcon}>{icon}</View>
        <Text variant="micro" weight="800" style={styles.checkInStatLabel}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={styles.checkInStatValueRow}>
        <Text mono tabular style={[styles.checkInStatValue, accent && { color: colors.success }]}>
          {value}
        </Text>
        {unit ? <Text style={styles.checkInStatUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function CheckInRow({ checkIn, onPress }: { checkIn: CheckIn; onPress: () => void }) {
  const range = formatCheckInWeek(checkIn.start);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.recentIcon}>
        <ClipboardCheck size={14} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1}>{range}</Text>
        <Text variant="micro" color="muted" numberOfLines={1}>
          {[
            checkIn.weightKg != null ? `${checkIn.weightKg.toFixed(1)} kg` : null,
            `Energy ${checkIn.overallEnergyLevel}/10`,
            checkIn.trainerComment ? 'Coach replied' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

function getUserAvatarSource(user: User | null) {
  if (!user?.avatarUrl) return '';
  const url = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_ORIGIN}${user.avatarUrl}`;
  return { uri: url };
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
  const d = new Date();
  return d
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
    .toUpperCase();
}

function byNewestSession(a: WorkoutSession, b: WorkoutSession): number {
  return getTime(b.finishedAt ?? b.startedAt) - getTime(a.finishedAt ?? a.startedAt);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

interface TraineeStats {
  total: number;
  thisWeek: number;
  streak: number;
}

function buildTraineeStats(sessions: WorkoutSession[]): TraineeStats {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  let thisWeek = 0;
  const weeks = new Set<string>();
  for (const s of sessions) {
    const ts = s.finishedAt ?? s.startedAt;
    if (!ts) continue;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    if (d >= startOfWeek) thisWeek += 1;
    weeks.add(isoWeekKey(d));
  }

  // Streak: ZAPOREDNI weeks (current week counted regardless of count if any)
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    if (weeks.has(isoWeekKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    } else break;
  }

  return { total: sessions.length, thisWeek, streak };
}

function isoWeekKey(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${date.getFullYear()}-W${weekNum}`;
}

function pickNextTemplate(
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[],
): WorkoutTemplate | null {
  if (templates.length === 0) return null;
  const usageById = new Map<string, number>();
  for (const s of sessions) {
    if (!s.templateId) continue;
    const ts = getTime(s.finishedAt ?? s.startedAt);
    const prev = usageById.get(s.templateId) ?? 0;
    if (ts > prev) usageById.set(s.templateId, ts);
  }
  const sorted = [...templates].sort((a, b) => {
    const aUsed = usageById.get(a.id) ?? 0;
    const bUsed = usageById.get(b.id) ?? 0;
    if (aUsed !== bUsed) return bUsed - aUsed;
    return getTime(b.createdAt) - getTime(a.createdAt);
  });
  return sorted[0];
}

function formatRelative(iso?: string | null): string {
  if (!iso) return 'Unknown';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatVolume(n: number): string {
  if (n < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(0);
  return `${(n / 1000).toFixed(1)}k`;
}

function formatCheckInWeek(start?: string | null): string {
  if (!start) return 'Unknown week';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Unknown week';
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + CHECK_IN_INTERVAL_DAYS - 1);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}


const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 40 },
  gutter: { paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  bottomSpacer: { height: spacing.huge },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -130,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primaryDark,
    opacity: 0.35,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroName: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: colors.white,
  },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroAvatarRing: {
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  heroStat: { flex: 1, gap: 3 },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: {
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.8,
    fontWeight: '800',
    color: colors.white,
  },
  heroStatLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: spacing.md,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  sectionCountText: { color: colors.inkSecondary, fontSize: 10 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.xl },
  quickAction: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  quickActionAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconAccent: { backgroundColor: 'rgba(255,107,53,0.18)' },
  quickLabel: { letterSpacing: -0.1 },

  // Next workout card (dark gradient look)
  nextCard: {
    backgroundColor: colors.dark.bg,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  nextGlow: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center' },
  nextEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  nextEyebrowText: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nextTitle: {
    color: colors.white,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: '800',
  },
  nextMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  nextMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextMetaText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600' },
  nextCta: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  nextCtaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCtaText: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // Coach strip
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  coachNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  coachName: { letterSpacing: -0.2 },
  coachStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },

  // Empty CTA
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: { marginTop: 4, lineHeight: 15 },
  emptyCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm },
  emptyCtaText: { letterSpacing: 0.6 },

  // Recent activity list
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  listDivider: { height: 1, backgroundColor: colors.line, marginLeft: spacing.lg + 32 + spacing.md },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Check-in hero card
  checkInHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  checkInHeroAvailable: {
    backgroundColor: colors.accent,
  },
  checkInHeroScheduled: {
    backgroundColor: colors.primary,
  },
  checkInHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInHeroIconAvailable: { backgroundColor: 'rgba(255,255,255,0.2)' },
  checkInHeroIconScheduled: { backgroundColor: 'rgba(255,255,255,0.18)' },
  checkInHeroEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  checkInHeroTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  checkInHeroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Check-in stat tiles
  checkInStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkInStat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 6,
  },
  checkInStatHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkInStatIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInStatLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.inkMuted,
  },
  checkInStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  checkInStatValue: {
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -0.4,
    fontWeight: '800',
    color: colors.inkPrimary,
  },
  checkInStatUnit: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
});
