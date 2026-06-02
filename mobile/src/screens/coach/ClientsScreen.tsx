import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { ScreenHeader } from '../../components/layout';
import { Avatar, ProgressBar, Screen, Text } from '../../components/ui';
import { useClientWeight } from '../../hooks/useClientWeight';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, shadows, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';
import {
  CHECK_IN_INTERVAL_DAYS,
  getDaysSince,
  getLatestCheckIn,
  getWeightChange,
} from '../../utils/clientCoaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ClientCoachingInfo {
  coaching: Coaching;
  client: User;
  latestCheckIn: ReturnType<typeof getLatestCheckIn>;
  daysSinceLast: number | null;
}

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'ONTRACK', label: 'On track' },
] as const;
type FilterValue = (typeof FILTERS)[number]['value'];

export function ClientsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ClientCoachingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const load = useCallback(async () => {
    try {
      const response = await coachingApi.getActiveCoachingsForTrainer();
      const hydrated: ClientCoachingInfo[] = [];
      for (const coaching of response) {
        try {
          const client = await userApi.getUserByFirebaseUid(coaching.traineeId);
          const latestCheckIn = getLatestCheckIn(coaching.checkIns);
          const daysSinceLast = latestCheckIn ? getDaysSince(latestCheckIn.start) : null;
          hydrated.push({ coaching, client, latestCheckIn, daysSinceLast });
        } catch (e) {
          console.error(`Failed to load client ${coaching.traineeId}:`, e);
        }
      }
      hydrated.sort((a, b) => clientOverdueRank(b) - clientOverdueRank(a));
      setItems(hydrated);
    } catch (e) {
      console.error('Clients load failed:', e);
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

  // Stats
  const activeCount = items.length;
  const overdueCount = useMemo(
    () =>
      items.filter(
        c => c.daysSinceLast == null || c.daysSinceLast >= CHECK_IN_INTERVAL_DAYS,
      ).length,
    [items],
  );
  const avgEnergy = useMemo(() => {
    const withCheckin = items.filter(i => i.latestCheckIn != null);
    if (withCheckin.length === 0) return null;
    const total = withCheckin.reduce(
      (sum, i) => sum + (i.latestCheckIn?.overallEnergyLevel ?? 0),
      0,
    );
    return total / withCheckin.length;
  }, [items]);

  // Filter + search
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter(i => {
      if (filter === 'OVERDUE') {
        const overdue =
          i.daysSinceLast == null || i.daysSinceLast >= CHECK_IN_INTERVAL_DAYS;
        if (!overdue) return false;
      } else if (filter === 'ONTRACK') {
        const onTrack =
          i.daysSinceLast != null && i.daysSinceLast < CHECK_IN_INTERVAL_DAYS;
        if (!onTrack) return false;
      }
      if (!normalized) return true;
      return (
        i.client.displayName?.toLowerCase().includes(normalized) ||
        i.client.email?.toLowerCase().includes(normalized)
      );
    });
  }, [items, filter, query]);

  if (loading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Clients" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Clients" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero ----------------------------------------------- */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, shadows.card]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroGlowBottom} />

            <Text style={styles.heroEyebrow}>MY CLIENTS</Text>
            <Text style={styles.heroTitle}>{activeCount} active</Text>
            <Text style={styles.heroSub}>
              {overdueCount > 0
                ? `${overdueCount} ${overdueCount === 1 ? 'client needs' : 'clients need'} a check-in`
                : 'Everyone is on track'}
            </Text>

            <View style={styles.heroStatsRow}>
              <HeroStat value={String(activeCount)} label={activeCount === 1 ? 'client' : 'clients'} />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={String(overdueCount)}
                label="overdue"
                accent={overdueCount > 0}
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={avgEnergy == null ? '—' : avgEnergy.toFixed(1)}
                unit={avgEnergy == null ? undefined : '/ 5'}
                label="avg energy"
              />
            </View>
          </View>
        </View>

        {/* Search + filter ----------------------------------- */}
        {activeCount > 0 ? (
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={17} color={colors.inkMuted} strokeWidth={2.25} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search clients"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  style={({ pressed }) => [styles.searchClear, pressed && { opacity: 0.6 }]}
                >
                  <X size={16} color={colors.inkMuted} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.segment}>
              {FILTERS.map(f => {
                const active = f.value === filter;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setFilter(f.value)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    <Text
                      variant="bodySmall"
                      weight={active ? '800' : '600'}
                      style={{
                        color: active ? colors.inkPrimary : colors.inkMuted,
                        letterSpacing: 0.1,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Section header ---------------------------------- */}
        {activeCount > 0 ? (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionBar} />
              <Text variant="caption" weight="800" style={styles.sectionLabel}>
                {filter === 'OVERDUE'
                  ? 'OVERDUE'
                  : filter === 'ONTRACK'
                    ? 'ON TRACK'
                    : 'ALL CLIENTS'}
              </Text>
            </View>
            <View style={styles.sectionCount}>
              <Text variant="micro" weight="700" mono tabular style={styles.sectionCountText}>
                {visible.length}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Cards ------------------------------------------- */}
        {activeCount === 0 ? (
          <View style={styles.gutter}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Users size={28} color={colors.primary} strokeWidth={2} />
              </View>
              <Text variant="h3" weight="800" align="center">No active clients yet</Text>
              <Text variant="bodySmall" color="secondary" align="center" style={styles.emptyHint}>
                Once a trainee sends a coaching request and you accept it, they'll appear here.
              </Text>
            </View>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.gutter}>
            <View style={styles.emptyInline}>
              <View style={styles.emptyInlineIcon}>
                <Search size={16} color={colors.inkSecondary} strokeWidth={2.25} />
              </View>
              <Text variant="bodySmall" weight="700" style={{ flex: 1 }}>
                No matches
              </Text>
              <Pressable
                onPress={() => {
                  setQuery('');
                  setFilter('ALL');
                }}
                hitSlop={6}
              >
                <Text variant="micro" weight="800" color="brand">CLEAR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.gutter, { gap: spacing.md }]}>
            {visible.map(info => (
              <ClientCard
                key={info.coaching.id}
                info={info}
                onPress={() =>
                  navigation.navigate('ClientDetail', {
                    coaching: info.coaching,
                    client: info.client,
                  })
                }
              />
            ))}
          </View>
        )}

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}


function HeroStat({
  value,
  unit,
  label,
  accent,
}: {
  value: string;
  unit?: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        <Text mono tabular style={[styles.heroStatValue, accent && { color: colors.accent }]}>
          {value}
        </Text>
        {unit ? <Text style={styles.heroStatUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ClientCard({
  info,
  onPress,
}: {
  info: ClientCoachingInfo;
  onPress: () => void;
}) {
  const daysSince = info.daysSinceLast;
  const overdue = daysSince == null || daysSince >= CHECK_IN_INTERVAL_DAYS;
  const progress =
    daysSince == null ? 1 : Math.min(1, Math.max(0, daysSince / CHECK_IN_INTERVAL_DAYS));
  const daysLeft = daysSince == null ? null : Math.max(0, CHECK_IN_INTERVAL_DAYS - daysSince);
  const checkInsCount = info.coaching.checkIns?.length ?? 0;
  const weightDelta = getWeightChange(info.coaching.checkIns);
  const energy = info.latestCheckIn?.overallEnergyLevel ?? null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      {/* Top row: avatar + name + status pill */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarRing}>
          <Avatar source={getUserAvatarSource(info.client)} size="xl" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" weight="800" numberOfLines={1} style={styles.cardName}>
            {info.client.displayName || 'Client'}
          </Text>
          <Text variant="micro" color="muted" numberOfLines={1}>
            {info.client.email || 'No email'}
          </Text>
        </View>
        <View style={[styles.statusPill, overdue ? styles.statusPillOverdue : styles.statusPillActive]}>
          {overdue ? (
            <AlertCircle size={10} color={colors.accent} strokeWidth={2.5} />
          ) : (
            <View style={styles.statusDotGreen} />
          )}
          <Text
            style={[styles.statusPillText, { color: overdue ? colors.accent : colors.success }]}
          >
            {overdue ? 'OVERDUE' : 'ON TRACK'}
          </Text>
        </View>
      </View>

      {/* Progress + hint */}
      <View style={styles.cardProgress}>
        <ProgressBar value={progress} height={5} />
        <View style={styles.cardProgressHint}>
          {overdue ? (
            <>
              <AlertCircle size={11} color={colors.accent} strokeWidth={2.5} />
              <Text variant="micro" weight="700" style={{ color: colors.accent, flex: 1 }}>
                {daysSince == null
                  ? 'No check-ins yet'
                  : `Check-in overdue · ${daysSince}d since last`}
              </Text>
            </>
          ) : (
            <>
              <Clock size={11} color={colors.inkMuted} strokeWidth={2.25} />
              <Text variant="micro" color="muted" weight="600" style={{ flex: 1 }}>
                {daysLeft === 0 ? 'Due today' : `${daysLeft}d until next check-in`}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <ClientWeightStat
          traineeId={info.client.firebaseUid}
          checkInWeightKg={info.latestCheckIn?.weightKg ?? null}
          delta={weightDelta}
        />
        <View style={styles.statTile}>
          <View style={styles.statTileHeader}>
            <View style={[styles.statTileIcon, { backgroundColor: 'rgba(255,107,53,0.14)' }]}>
              <Zap size={11} color={colors.accent} strokeWidth={2.5} />
            </View>
            <Text variant="micro" weight="800" style={styles.statTileLabel}>ENERGY</Text>
          </View>
          <View style={styles.statTileValueRow}>
            <Text mono tabular style={styles.statTileValue} numberOfLines={1}>
              {energy != null ? (
                <>
                  {energy}
                  <Text style={styles.statTileUnit}>/5</Text>
                </>
              ) : (
                '—'
              )}
            </Text>
          </View>
        </View>
        <View style={styles.statTile}>
          <View style={styles.statTileHeader}>
            <View style={styles.statTileIcon}>
              <ClipboardCheck size={11} color={colors.primary} strokeWidth={2.5} />
            </View>
            <Text variant="micro" weight="800" style={styles.statTileLabel}>CHECK-INS</Text>
          </View>
          <View style={styles.statTileValueRow}>
            <Text mono tabular style={styles.statTileValue} numberOfLines={1}>{checkInsCount}</Text>
          </View>
        </View>
      </View>

      {/* Footer chevron */}
      <View style={styles.cardFooter}>
        <Text variant="micro" color="muted" weight="600">
          Tap to open · {checkInsCount} {checkInsCount === 1 ? 'check-in' : 'check-ins'} logged
        </Text>
        <ChevronRight size={14} color={colors.inkMuted} strokeWidth={2.25} />
      </View>
    </Pressable>
  );
}

function ClientWeightStat({
  traineeId,
  checkInWeightKg,
  delta,
}: {
  traineeId: string;
  checkInWeightKg: number | null;
  delta: number | null;
}) {
  const hcWeight = useClientWeight(traineeId);
  const kg = hcWeight ?? checkInWeightKg;
  const hasDelta = delta != null && !Number.isNaN(delta) && Math.abs(delta) >= 0.05;
  const losing = hasDelta && (delta as number) < 0;

  return (
    <View style={styles.statTile}>
      <View style={styles.statTileHeader}>
        <View style={styles.statTileIcon}>
          {hasDelta ? (
            losing ? (
              <TrendingDown size={11} color={colors.success} strokeWidth={2.5} />
            ) : (
              <TrendingUp size={11} color={colors.accent} strokeWidth={2.5} />
            )
          ) : (
            <TrendingUp size={11} color={colors.primary} strokeWidth={2.5} />
          )}
        </View>
        <Text variant="micro" weight="800" style={styles.statTileLabel}>WEIGHT</Text>
      </View>
      <View style={styles.statTileValueRow}>
        <Text mono tabular style={styles.statTileValue} numberOfLines={1}>
          {kg != null ? (
            <>
              {kg.toFixed(1)}
              <Text style={styles.statTileUnit}> kg</Text>
            </>
          ) : (
            '—'
          )}
        </Text>
      </View>
      {hasDelta ? (
        <Text
          variant="micro"
          weight="700"
          style={{
            marginTop: 2,
            fontSize: 9,
            color: losing ? colors.success : colors.accent,
          }}
        >
          {(delta as number) > 0 ? '+' : ''}
          {(delta as number).toFixed(1)} kg total
        </Text>
      ) : null}
    </View>
  );
}


function getUserAvatarSource(user: User | null) {
  if (!user?.avatarUrl) return '';
  const url = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_ORIGIN}${user.avatarUrl}`;
  return { uri: url };
}

function clientOverdueRank(c: ClientCoachingInfo): number {
  if (c.daysSinceLast == null) return 9999;
  return c.daysSinceLast;
}


const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 40 },
  gutter: { paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: 4,
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
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  heroStat: { flex: 1, gap: 3 },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: {
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: colors.white,
  },
  heroStatUnit: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
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

  // Filter bar
  filterBar: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.inkPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
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

  // Client card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  cardName: { letterSpacing: -0.2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.32)',
  },
  statusPillOverdue: {
    backgroundColor: 'rgba(255,107,53,0.14)',
    borderColor: 'rgba(255,107,53,0.35)',
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Progress
  cardProgress: { gap: 6 },
  cardProgressHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    gap: 4,
  },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTileIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.inkSecondary,
  },
  statTileValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap' },
  statTileValue: {
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontWeight: '800',
    color: colors.inkPrimary,
  },
  statTileUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSecondary,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  // Empty states
  emptyCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: { lineHeight: 16, paddingHorizontal: spacing.lg, maxWidth: 320 },
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyInlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
