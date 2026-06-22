import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Activity,
  ChevronLeft,
  Droplet,
  Flame,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  Mountain,
  Moon,
  RefreshCw,
  Ruler,
  Scale,
  Thermometer,
  TrendingUp,
  Wind,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { ScreenHeader } from '@/components/layout';
import { Card, IconButton, Screen, Text } from '@/components/ui';
import { healthApi, type HealthSnapshotResponse } from '@/api/healthApi';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, spacing } from '@/constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ClientHealth'>;

export function ClientHealthScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute();
  const { traineeId, traineeName } = route.params;

  const [snapshot, setSnapshot] = useState<HealthSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    return healthApi.getForClient(traineeId);
  }, [traineeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSnapshot();
      setSnapshot(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) setError('You no longer have access to this trainee\'s data.');
      else setError(err?.message ?? 'Could not load health data');
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    load();
  }, [load]);

  // Stops the active poller, if any. Safe to call multiple times.
  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  // Trainer-initiated remote sync. Fires a silent FCM push to the trainee,
  // then polls getForClient until either uploadedAt advances or we time
  // out at ~30 s. Keeps the UI in "refreshing" state during the wait so
  // the user knows something is happening.
  const requestRemoteSync = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const before = snapshot?.uploadedAt ?? '';
    try {
      await healthApi.requestClientSync(traineeId);
    } catch (err: any) {
      setRefreshing(false);
      Alert.alert(
        'Could not request sync',
        err?.response?.data?.message ?? err?.message ?? 'Unknown error',
      );
      return;
    }

    const startedAt = Date.now();
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        const fresh = await fetchSnapshot();
        if (fresh && fresh.uploadedAt !== before) {
          setSnapshot(fresh);
          stopPolling();
          setRefreshing(false);
          return;
        }
      } catch {
        // ignore individual poll failures; the timeout below will end it
      }
      if (Date.now() - startedAt > 30_000) {
        stopPolling();
        setRefreshing(false);
        Alert.alert(
          'No fresh data yet',
          `${traineeName} did not respond. They may be offline or have FitLink closed.`,
        );
      }
    }, 3000);
  }, [refreshing, snapshot?.uploadedAt, traineeId, traineeName, fetchSnapshot, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow={traineeName}
        title="Client health"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <Card style={styles.emptyCard}>
            <Text variant="body" weight="700" style={{ color: colors.inkPrimary, textAlign: 'center' }}>
              {error}
            </Text>
          </Card>
        ) : !snapshot ? (
          <Card style={styles.emptyCard}>
            <HeartPulse size={36} color={colors.primary} strokeWidth={1.5} />
            <Text variant="body" weight="700" style={{ color: colors.inkPrimary, marginTop: spacing.md }}>
              No data yet
            </Text>
            <Text variant="bodySmall" style={{ color: colors.inkSecondary, marginTop: 4, textAlign: 'center' }}>
              {traineeName} has not synced their Health Connect data yet. Ask them to open FitLink
              on their device.
            </Text>
          </Card>
        ) : (
          <>
            <Card style={styles.lastSync}>
              <View style={{ flex: 1 }}>
                <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
                  LAST SYNCED
                </Text>
                <Text variant="bodySmall" weight="700" style={{ color: colors.inkPrimary, marginTop: 2 }}>
                  {refreshing ? 'Waiting for fresh data…' : formatRelative(snapshot.uploadedAt)}
                </Text>
              </View>
              <Pressable
                onPress={requestRemoteSync}
                disabled={refreshing}
                style={({ pressed }) => [
                  styles.refreshBtn,
                  pressed && { opacity: 0.7 },
                  refreshing && { opacity: 0.6 },
                ]}
                accessibilityLabel="Request fresh data from trainee"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={16} color={colors.primary} strokeWidth={2.25} />
                )}
              </Pressable>
            </Card>

            <Section title="ACTIVITY TODAY">
              <View style={styles.grid2}>
                <Metric
                  icon={<Footprints size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Steps"
                  value={fmtInt(snapshot.stepsToday)}
                />
                <Metric
                  icon={<Flame size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Active kcal"
                  value={fmtInt(Math.round(snapshot.activeCaloriesToday))}
                />
                <Metric
                  icon={<TrendingUp size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Distance"
                  value={fmtDistance(snapshot.distanceMetersToday)}
                />
                <Metric
                  icon={<Mountain size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="Floors"
                  value={String(snapshot.floorsToday)}
                />
              </View>
            </Section>

            {snapshot.steps7d && snapshot.steps7d.length > 0 ? (
              <Section title="7-DAY STEPS">
                <Card style={styles.chartCard}>
                  <BarChart
                    data={snapshot.steps7d.map(d => ({
                      value: d.value,
                      label: dayLabel(d.date),
                      frontColor: colors.primary,
                    }))}
                    width={280}
                    height={140}
                    barWidth={26}
                    spacing={14}
                    roundedTop
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={0}
                    xAxisLabelTextStyle={{ color: colors.inkMuted, fontSize: 10 }}
                    yAxisTextStyle={{ color: colors.inkMuted, fontSize: 10 }}
                    noOfSections={3}
                  />
                </Card>
              </Section>
            ) : null}

            <Section title="BODY">
              <View style={styles.grid2}>
                <Metric
                  icon={<Scale size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Weight"
                  value={snapshot.latestWeightKg ? `${snapshot.latestWeightKg.toFixed(1)} kg` : '—'}
                  unit={snapshot.latestWeightAt ? timeAgo(snapshot.latestWeightAt) : ''}
                />
                <Metric
                  icon={<Gauge size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Body fat"
                  value={snapshot.bodyFatPercent ? `${snapshot.bodyFatPercent.toFixed(1)}%` : '—'}
                />
                <Metric
                  icon={<Ruler size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Height"
                  value={snapshot.heightCm ? `${Math.round(snapshot.heightCm)} cm` : '—'}
                />
                <Metric
                  icon={<Zap size={16} color={colors.warning} strokeWidth={2.25} />}
                  label="BMR"
                  value={snapshot.bmrKcal ? `${Math.round(snapshot.bmrKcal)} kcal` : '—'}
                />
              </View>
            </Section>

            {snapshot.weightTrend && snapshot.weightTrend.length > 1 ? (
              <Section title="WEIGHT TREND">
                <Card style={styles.chartCard}>
                  <LineChart
                    data={snapshot.weightTrend.map(w => ({
                      value: w.kg,
                      label: w.at.slice(5, 10),
                    }))}
                    width={280}
                    height={140}
                    color={colors.primary}
                    thickness={2.5}
                    dataPointsColor={colors.primary}
                    dataPointsRadius={3}
                    curved
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={0}
                    xAxisLabelTextStyle={{ color: colors.inkMuted, fontSize: 9 }}
                    yAxisTextStyle={{ color: colors.inkMuted, fontSize: 10 }}
                    noOfSections={3}
                    initialSpacing={10}
                    endSpacing={10}
                    scrollToEnd
                    scrollAnimation={false}
                  />
                </Card>
              </Section>
            ) : null}

            <Section title="HEART & RECOVERY">
              <View style={styles.grid2}>
                <Metric
                  icon={<HeartPulse size={16} color={colors.danger} strokeWidth={2.25} />}
                  label="Heart rate"
                  value={snapshot.latestHeartRateBpm ? `${snapshot.latestHeartRateBpm}` : '—'}
                  unit="bpm"
                />
                <Metric
                  icon={<Heart size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Resting HR"
                  value={snapshot.restingHeartRate ? `${snapshot.restingHeartRate}` : '—'}
                  unit="bpm"
                />
                <Metric
                  icon={<Moon size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="Last sleep"
                  value={snapshot.lastSleepMinutes ? formatDuration(snapshot.lastSleepMinutes) : '—'}
                  unit={snapshot.avgSleepMinutes7d ? `avg ${formatDuration(snapshot.avgSleepMinutes7d)}` : ''}
                />
                <Metric
                  icon={<Activity size={16} color={colors.success} strokeWidth={2.25} />}
                  label="VO2 max"
                  value={snapshot.vo2Max ? snapshot.vo2Max.toFixed(1) : '—'}
                />
              </View>
            </Section>

            <Section title="VITALS">
              <View style={styles.grid2}>
                <Metric
                  icon={<Gauge size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Blood pressure"
                  value={snapshot.bloodPressureSystolic && snapshot.bloodPressureDiastolic
                    ? `${Math.round(snapshot.bloodPressureSystolic)}/${Math.round(snapshot.bloodPressureDiastolic)}`
                    : '—'}
                  unit="mmHg"
                />
                <Metric
                  icon={<Wind size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="SpO₂"
                  value={snapshot.oxygenSaturation ? `${snapshot.oxygenSaturation.toFixed(0)}%` : '—'}
                />
                <Metric
                  icon={<Wind size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Respiratory"
                  value={snapshot.respiratoryRate ? snapshot.respiratoryRate.toFixed(0) : '—'}
                  unit="/ min"
                />
                <Metric
                  icon={<Thermometer size={16} color={colors.warning} strokeWidth={2.25} />}
                  label="Body temp"
                  value={snapshot.bodyTemperatureC ? `${snapshot.bodyTemperatureC.toFixed(1)}°C` : '—'}
                />
              </View>
            </Section>

            <Section title="HYDRATION">
              <Card style={styles.fullCard}>
                <View style={styles.hydrationRow}>
                  <View style={styles.hydrationIcon}>
                    <Droplet size={20} color={colors.white} strokeWidth={2.25} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
                      TODAY
                    </Text>
                    <Text variant="h3" weight="700" style={{ color: colors.inkPrimary, marginTop: 2 }}>
                      {snapshot.hydrationMlToday > 0
                        ? `${(snapshot.hydrationMlToday / 1000).toFixed(2)} L`
                        : 'No data'}
                    </Text>
                  </View>
                </View>
              </Card>
            </Section>

            {snapshot.recentExercises && snapshot.recentExercises.length > 0 ? (
              <Section title="RECENT WORKOUTS">
                <View style={{ gap: spacing.sm }}>
                  {snapshot.recentExercises.slice(0, 8).map((ex, i) => (
                    <Card key={`${ex.startAt}-${i}`} style={styles.exerciseRow}>
                      <View style={styles.exerciseIcon}>
                        <Activity size={18} color={colors.primary} strokeWidth={2.25} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
                          {ex.title ?? 'Workout'}
                        </Text>
                        <Text variant="micro" style={{ color: colors.inkMuted, marginTop: 2 }}>
                          {formatDateTime(ex.startAt)} · {formatDuration(ex.durationMinutes)}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="caption" weight="700" style={{ color: colors.inkSecondary }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        {icon}
        <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text variant="h3" weight="700" style={{ color: colors.inkPrimary, marginTop: 4 }}>
        {value}
      </Text>
      {unit ? (
        <Text variant="micro" style={{ color: colors.inkMuted, marginTop: 2 }}>
          {unit}
        </Text>
      ) : null}
    </Card>
  );
}


function fmtInt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function dayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  center: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  lastSync: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullCard: {
    padding: spacing.lg,
  },
  chartCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  hydrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  hydrationIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
});
