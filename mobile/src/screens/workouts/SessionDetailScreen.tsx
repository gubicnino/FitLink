import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Dumbbell,
  Info,
  Trophy,
} from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import {
  Dot,
  IconButton,
  Screen,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { exerciseApi } from '../../api/exerciseApi';
import { workoutApi } from '../../api/workoutApi';
import type { SetResult, WorkoutSession } from '../../types/workout';
import type { RootStackParamList } from '../../navigation/types';
import { setTypeMeta } from '../../utils/setTypeMeta';

type Nav = NavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SessionDetail'>;

interface ExerciseLookup {
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
}

export function SessionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { sessionId } = useRoute<Route>().params;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [details, setDetails] = useState<Map<string, ExerciseLookup>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const s = await workoutApi.getSession(sessionId);
        const ids = Array.from(new Set(s.exercises.map(e => e.exerciseId)));
        const fetched = await Promise.all(ids.map(id => exerciseApi.getById(id)));
        if (cancelled) return;
        const map = new Map<string, ExerciseLookup>();
        for (const e of fetched) {
          map.set(e.id, {
            name: e.name,
            category: e.category,
            thumbnailUrl: pickThumb(e.images),
          });
        }
        setSession(s);
        setDetails(map);
      } catch (err) {
        if (!cancelled) setError(extractMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const onInfoPress = useCallback(
    (exerciseId: string) => {
      navigation.navigate('ExerciseDetail', { exerciseId });
    },
    [navigation],
  );

  if (loading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Workout"
          left={
            <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
              <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
          }
        />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !session) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Workout"
          left={
            <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
              <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
          }
        />
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600" align="center">
            Could not load workout
          </Text>
          {error ? (
            <Text variant="bodySmall" color="secondary" align="center" style={styles.errorDetail}>
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, set) => s2 + set.reps * set.weightKg, 0),
    0,
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Workout"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text variant="display" style={styles.heroTitle}>
            {session.name}
          </Text>
          <View style={styles.metaRow}>
            {session.finishedAt ? (
              <Text variant="bodySmall" color="secondary">
                {formatDate(session.finishedAt)}
              </Text>
            ) : session.startedAt ? (
              <Text variant="bodySmall" color="secondary">
                {formatDate(session.startedAt)}
              </Text>
            ) : null}
            {session.durationMinutes > 0 ? (
              <>
                <Dot />
                <View style={styles.metaItem}>
                  <Clock size={13} color={colors.inkSecondary} strokeWidth={2} />
                  <Text variant="bodySmall" color="secondary">
                    {' '}
                    {session.durationMinutes} min
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat label="Exercises" value={String(session.exercises.length)} />
          <Stat label="Sets" value={String(totalSets)} />
          <Stat
            label="Volume"
            value={totalVolume > 0 ? `${formatNumber(totalVolume)} kg` : '—'}
          />
        </View>

        {/* Exercise list with top-set summary */}
        <View style={styles.list}>
          {session.exercises.map((ex, idx) => {
            const detail = details.get(ex.exerciseId);
            const isOpen = expandedIdx === idx;
            const topSet = pickTopSet(ex.sets);
            return (
              <View key={`${ex.exerciseId}-${idx}`} style={styles.row}>
                <Pressable
                  onPress={() => setExpandedIdx(isOpen ? null : idx)}
                  style={({ pressed }) => [styles.rowHeader, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={styles.rowIndex}>
                    <Text variant="micro" color="muted" weight="700" mono tabular>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>

                  <View style={styles.rowThumb}>
                    {detail?.thumbnailUrl ? (
                      <Image source={{ uri: detail.thumbnailUrl }} style={styles.thumbImg} />
                    ) : (
                      <Dumbbell size={16} color={colors.primary} strokeWidth={2} />
                    )}
                  </View>

                  <View style={styles.rowBody}>
                    <Text variant="body" weight="600" numberOfLines={1}>
                      {detail?.name ?? ex.exerciseId}
                    </Text>
                    <View style={styles.rowMeta}>
                      {topSet ? (
                        <View style={styles.topSetBadge}>
                          <Trophy
                            size={11}
                            color={colors.warning}
                            fill={colors.warning}
                            strokeWidth={0}
                          />
                          <Text variant="micro" color="secondary" weight="700">
                            {' '}
                            {topSet.reps} ×{' '}
                            {topSet.weightKg > 0 ? `${formatNumber(topSet.weightKg)} kg` : 'BW'}
                          </Text>
                        </View>
                      ) : null}
                      <Text variant="micro" color="muted">
                        {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => onInfoPress(ex.exerciseId)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}
                    accessibilityLabel="Exercise details"
                  >
                    <Info size={16} color={colors.inkSecondary} strokeWidth={2} />
                  </Pressable>

                  <View
                    style={[styles.chevronWrap, isOpen && styles.chevronWrapOpen]}
                  >
                    <ChevronDown
                      size={16}
                      color={isOpen ? colors.primary : colors.inkMuted}
                      strokeWidth={2.25}
                    />
                  </View>
                </Pressable>

                {isOpen ? <SetTable sets={ex.sets} topSet={topSet} /> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text mono tabular weight="700" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="micro" color="muted">
        {label}
      </Text>
    </View>
  );
}

function SetTable({
  sets,
  topSet,
}: {
  sets: SetResult[];
  topSet: SetResult | null;
}) {
  return (
    <View style={styles.setTable}>
      <View style={styles.setTableHeader}>
        <Text variant="caption" color="muted" style={styles.setColIdx}>
          Set
        </Text>
        <Text variant="caption" color="muted" style={styles.setColReps}>
          Reps
        </Text>
        <Text variant="caption" color="muted" style={styles.setColWeight}>
          Weight
        </Text>
        <Text variant="caption" color="muted" style={styles.setColVolume}>
          Volume
        </Text>
      </View>
      {sets.map((s, sIdx) => {
        const isTop = topSet != null && s === topSet;
        const meta = setTypeMeta(s.setType);
        const isNormal = (s.setType ?? 'NORMAL') === 'NORMAL';
        return (
          <View key={sIdx} style={[styles.setTableRow, isTop && styles.setTableRowTop]}>
            <View style={styles.setColIdx}>
              <View
                style={[
                  styles.setBadge,
                  {
                    backgroundColor: meta.badgeBg,
                    borderColor: isNormal ? colors.line : meta.badgeFg,
                  },
                ]}
              >
                <Text
                  variant="micro"
                  weight="700"
                  mono
                  tabular
                  style={{ color: meta.badgeFg }}
                >
                  {isNormal ? String(sIdx + 1) : meta.shortLabel}
                </Text>
              </View>
            </View>
            <Text mono tabular variant="bodySmall" style={styles.setColReps}>
              {s.reps}
            </Text>
            <Text mono tabular variant="bodySmall" style={styles.setColWeight}>
              {s.weightKg > 0 ? `${formatNumber(s.weightKg)} kg` : '—'}
            </Text>
            <Text
              mono
              tabular
              variant="bodySmall"
              color="secondary"
              style={styles.setColVolume}
            >
              {s.weightKg > 0 ? `${formatNumber(s.reps * s.weightKg)}` : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}


function pickThumb(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images.length > 1 ? images[1] : images[0];
}


// "Top set" je dejansko samo set z navecjo WEIGHT. Za bodyweight vaje (weight 0) pa max reps.
function pickTopSet(sets: SetResult[]): SetResult | null {
  if (sets.length === 0) return null;
  const maxWeight = sets.reduce((m, s) => Math.max(m, s.weightKg), 0);
  if (maxWeight > 0) {
    return sets.find(s => s.weightKg === maxWeight) ?? sets[0];
  }
  // Za Bodyweight fallback: max reps
  const maxReps = sets.reduce((m, s) => Math.max(m, s.reps), 0);
  return sets.find(s => s.reps === maxReps) ?? sets[0];
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },

  hero: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  heroTitle: { letterSpacing: -0.4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.xl,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, lineHeight: 26 },

  list: { paddingHorizontal: spacing.xxl, gap: spacing.sm },
  row: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIndex: { width: 24, alignItems: 'center' },
  rowThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: 40, height: 40 },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  topSetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
    backgroundColor: colors.warningSoft,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapOpen: { transform: [{ rotate: '180deg' }] },

  setTable: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: spacing.xs,
  },
  setTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: radii.xs,
  },
  setTableRowTop: {
    backgroundColor: colors.warningSoft,
  },
  setColIdx: { width: 32, textAlign: 'left', alignItems: 'flex-start', justifyContent: 'center' },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  setColReps: { flex: 1, textAlign: 'center' },
  setColWeight: { flex: 1.2, textAlign: 'center' },
  setColVolume: { flex: 1, textAlign: 'right' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  errorDetail: { paddingHorizontal: spacing.xl },
});
