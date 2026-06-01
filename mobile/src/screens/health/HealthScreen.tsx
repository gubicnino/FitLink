import { useNavigation } from '@react-navigation/native';
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
  Plus,
  Ruler,
  Scale,
  Settings,
  Sparkles,
  Thermometer,
  TrendingUp,
  Wind,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { ScreenHeader } from '../../components/layout';
import { Card, IconButton, Screen, Text } from '../../components/ui';
import { useHealthConnect } from '../../hooks/useHealthConnect';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import type { ExerciseSession } from '../../types/health';
import { QuickAddSheet } from './QuickAddSheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HealthScreen() {
  const navigation = useNavigation<Nav>();
  const {
    status,
    snapshot,
    loading,
    refreshSnapshot,
    requestPermissions,
    openSettings,
    logWeightKg,
    logStepsNow,
    logHydrationMl,
    logHeartRateBpm,
    seedDemoData,
  } = useHealthConnect();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (status === 'granted' || status === 'partial') {
      refreshSnapshot();
    }
  }, [status, refreshSnapshot]);

  const onSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      await refreshSnapshot();
      Alert.alert('Sample data added', '7 days of demo data are now in Health Connect.');
    } catch (err: any) {
      Alert.alert('Could not seed data', err?.message ?? 'Unknown error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Health"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton variant="surface" withBorder onPress={openSettings}>
              <Settings size={16} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
            <Pressable
              onPress={() => setQuickAddOpen(true)}
              style={({ pressed }) => [styles.headerPrimaryBtn, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Quick add health data"
            >
              <Plus size={16} color={colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {status === 'unavailable' ? (
          <UnavailableBlock />
        ) : status === 'unknown' || status === 'denied' || status === 'partial' ? (
          <PermissionBlock status={status} onRequest={requestPermissions} onSettings={openSettings} />
        ) : null}

        {loading && (status === 'granted' || status === 'partial') ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodySmall" style={{ color: colors.inkSecondary, marginLeft: spacing.sm }}>
              Reading your latest data…
            </Text>
          </View>
        ) : null}

        {(status === 'granted' || status === 'partial') ? (
          <>

            <Section title="ACTIVITY">
              <View style={styles.grid2}>
                <MetricCard
                  icon={<Footprints size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Steps"
                  value={formatNumber(snapshot.stepsToday)}
                  unit="today"
                />
                <MetricCard
                  icon={<Flame size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Active kcal"
                  value={formatNumber(Math.round(snapshot.activeCaloriesToday))}
                  unit={snapshot.totalCaloriesToday > 0 ? `${Math.round(snapshot.totalCaloriesToday)} total` : 'today'}
                />
                <MetricCard
                  icon={<TrendingUp size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Distance"
                  value={formatDistance(snapshot.distanceMetersToday)}
                  unit="today"
                />
                <MetricCard
                  icon={<Mountain size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="Floors"
                  value={String(snapshot.floorsToday)}
                  unit="climbed"
                />
              </View>
            </Section>

            {snapshot.steps7d.length > 0 ? (
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
                <MetricCard
                  icon={<Scale size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Weight"
                  value={snapshot.latestWeight ? `${snapshot.latestWeight.kg.toFixed(1)} kg` : '—'}
                  unit={snapshot.latestWeight ? timeAgo(snapshot.latestWeight.at) : 'no data'}
                />
                <MetricCard
                  icon={<Gauge size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Body fat"
                  value={snapshot.bodyFatPercent ? `${snapshot.bodyFatPercent.toFixed(1)}%` : '—'}
                />
                <MetricCard
                  icon={<Ruler size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Height"
                  value={snapshot.heightCm ? `${Math.round(snapshot.heightCm)} cm` : '—'}
                />
                <MetricCard
                  icon={<Zap size={16} color={colors.warning} strokeWidth={2.25} />}
                  label="BMR"
                  value={snapshot.bmrKcal ? `${Math.round(snapshot.bmrKcal)} kcal` : '—'}
                  unit="per day"
                />
              </View>
            </Section>

            {snapshot.weightTrend.length > 1 ? (
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
                <MetricCard
                  icon={<HeartPulse size={16} color={colors.danger} strokeWidth={2.25} />}
                  label="Heart rate"
                  value={snapshot.latestHeartRate ? `${snapshot.latestHeartRate.bpm}` : '—'}
                  unit="bpm"
                />
                <MetricCard
                  icon={<Heart size={16} color={colors.accent} strokeWidth={2.25} />}
                  label="Resting HR"
                  value={snapshot.restingHeartRate ? `${snapshot.restingHeartRate}` : '—'}
                  unit="bpm"
                />
                <MetricCard
                  icon={<Moon size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="Last sleep"
                  value={snapshot.lastSleep ? formatDuration(snapshot.lastSleep.durationMinutes) : '—'}
                  unit={snapshot.avgSleepMinutes7d ? `avg ${formatDuration(snapshot.avgSleepMinutes7d)}` : ''}
                />
                <MetricCard
                  icon={<Activity size={16} color={colors.success} strokeWidth={2.25} />}
                  label="VO2 max"
                  value={snapshot.vo2Max ? snapshot.vo2Max.toFixed(1) : '—'}
                  unit="ml/kg/min"
                />
              </View>
            </Section>

            <Section title="VITALS">
              <View style={styles.grid2}>
                <MetricCard
                  icon={<Gauge size={16} color={colors.primary} strokeWidth={2.25} />}
                  label="Blood pressure"
                  value={snapshot.bloodPressure
                    ? `${Math.round(snapshot.bloodPressure.systolic)}/${Math.round(snapshot.bloodPressure.diastolic)}`
                    : '—'}
                  unit="mmHg"
                />
                <MetricCard
                  icon={<Wind size={16} color={colors.primaryDark} strokeWidth={2.25} />}
                  label="SpO₂"
                  value={snapshot.oxygenSaturation ? `${snapshot.oxygenSaturation.toFixed(0)}%` : '—'}
                />
                <MetricCard
                  icon={<Wind size={16} color={colors.success} strokeWidth={2.25} />}
                  label="Respiratory"
                  value={snapshot.respiratoryRate ? snapshot.respiratoryRate.toFixed(0) : '—'}
                  unit="/ min"
                />
                <MetricCard
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
                    <Droplet size={22} color={colors.white} strokeWidth={2.25} />
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

            {snapshot.recentExercises.length > 0 ? (
              <Section title="RECENT WORKOUTS">
                <View style={{ gap: spacing.sm }}>
                  {snapshot.recentExercises.slice(0, 8).map((ex, i) => (
                    <ExerciseRow key={`${ex.startAt}-${i}`} session={ex} />
                  ))}
                </View>
              </Section>
            ) : null}

            <View style={styles.footer}>
              <Pressable
                onPress={onSeed}
                disabled={seeding}
                style={({ pressed }) => [
                  styles.seedBtn,
                  pressed && { opacity: 0.7 },
                  seeding && { opacity: 0.6 },
                ]}
              >
                {seeding ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Sparkles size={14} color={colors.primary} strokeWidth={2.25} />
                    <Text variant="bodySmall" weight="700" style={{ color: colors.primary, marginLeft: 6 }}>
                      Add sample data
                    </Text>
                  </>
                )}
              </Pressable>
              <Text variant="micro" style={styles.footerNote}>
                Data is read locally from Health Connect. Nothing is shared with FitLink servers
                until you accept a coaching invitation.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <QuickAddSheet
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onWeight={async kg => {
          await logWeightKg(kg);
          await refreshSnapshot();
          setTimeout(() => refreshSnapshot(), 600);
        }}
        onSteps={async count => {
          await logStepsNow(count);
          await refreshSnapshot();
          setTimeout(() => refreshSnapshot(), 600);
        }}
        onWater={async ml => {
          await logHydrationMl(ml);
          await refreshSnapshot();
          setTimeout(() => refreshSnapshot(), 600);
        }}
        onHeartRate={async bpm => {
          await logHeartRateBpm(bpm);
          await refreshSnapshot();
          setTimeout(() => refreshSnapshot(), 600);
        }}
      />
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

function MetricCard({
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
      <View style={styles.metricCardHeader}>
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

function ExerciseRow({ session }: { session: ExerciseSession }) {
  return (
    <Card style={styles.exerciseRow}>
      <View style={styles.exerciseIcon}>
        <Activity size={18} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
          {session.title ?? mapExerciseType(session.exerciseType)}
        </Text>
        <Text variant="micro" style={{ color: colors.inkMuted, marginTop: 2 }}>
          {formatDateTime(session.startAt)} · {formatDuration(session.durationMinutes)}
        </Text>
      </View>
    </Card>
  );
}

function PermissionBlock({
  status,
  onRequest,
  onSettings,
}: {
  status: 'unknown' | 'denied' | 'partial';
  onRequest: () => void;
  onSettings: () => void;
}) {
  const title = status === 'partial' ? 'Some permissions are missing' : 'Connect to Health Connect';
  const body =
    status === 'partial'
      ? 'FitLink can show more metrics if you grant the remaining permissions.'
      : 'Allow FitLink to read your steps, weight, heart rate, and other metrics from Health Connect.';
  return (
    <Card style={styles.permCard}>
      <View style={styles.permIcon}>
        <Activity size={22} color={colors.white} strokeWidth={2.25} />
      </View>
      <Text variant="body" weight="700" style={{ color: colors.inkPrimary, marginTop: spacing.md }}>
        {title}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.inkSecondary, marginTop: 4, textAlign: 'center' }}>
        {body}
      </Text>
      <Pressable onPress={onRequest} style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.85 }]}>
        <Text variant="body" weight="700" style={{ color: colors.white }}>
          {status === 'partial' ? 'Update permissions' : 'Connect'}
        </Text>
      </Pressable>
      <Pressable onPress={onSettings} style={styles.permLink}>
        <Text variant="micro" weight="700" style={{ color: colors.primary }}>
          Open Health Connect settings
        </Text>
      </Pressable>
    </Card>
  );
}

function UnavailableBlock() {
  return (
    <Card style={styles.permCard}>
      <View style={[styles.permIcon, { backgroundColor: colors.inkMuted }]}>
        <Activity size={22} color={colors.white} strokeWidth={2.25} />
      </View>
      <Text variant="body" weight="700" style={{ color: colors.inkPrimary, marginTop: spacing.md }}>
        Health Connect unavailable
      </Text>
      <Text variant="bodySmall" style={{ color: colors.inkSecondary, marginTop: 4, textAlign: 'center' }}>
        Your device does not have Health Connect installed. Update to Android 14+ or install it from
        the Play Store.
      </Text>
    </Card>
  );
}


function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return n.toLocaleString('en-US');
}

function formatDistance(meters: number): string {
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
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function mapExerciseType(code: number | null): string {
  if (code == null) return 'Workout';
  // Map only the common ones, VSE DRUGO JE "WORKOUT".
  switch (code) {
    case 8: return 'Biking';
    case 9: return 'Biking (stationary)';
    case 13: return 'Boxing';
    case 25: return 'Elliptical';
    case 37: return 'Hiking';
    case 56: return 'Running';
    case 57: return 'Running (treadmill)';
    case 64: return 'Strength training';
    case 70: return 'Swimming';
    case 79: return 'Walking';
    case 83: return 'Yoga';
    default: return 'Workout';
  }
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  headerPrimaryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
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
  metricCardHeader: {
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
  permCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  permIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  permLink: {
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
  },
  footerNote: {
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 14,
  },
});
