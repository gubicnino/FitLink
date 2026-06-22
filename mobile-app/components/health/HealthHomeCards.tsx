import { useFocusEffect } from '@react-navigation/native';
import { Activity, ChevronRight, Flame, Scale } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Sparkline, Text } from '../ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useHealthConnect } from '../../hooks/useHealthConnect';
import type { WeightPoint } from '../../types/health';

interface Props {
  onViewAll: () => void;
  onConnect: () => void;
}


export function HealthHomeCards({ onViewAll, onConnect }: Props) {
  const { status, snapshot, refreshSnapshot } = useHealthConnect();

  useFocusEffect(
    useCallback(() => {
      if (status === 'granted' || status === 'partial') {
        refreshSnapshot();
      }
    }, [status, refreshSnapshot]),
  );

  if (status === 'unavailable') {
    return null;
  }

  if (status === 'unknown' || status === 'denied') {
    return (
      <Pressable onPress={onConnect}>
        <Card style={styles.connectCard}>
          <View style={styles.connectIcon}>
            <Activity size={20} color={colors.white} strokeWidth={2.25} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="micro" weight="700" style={{ color: colors.primary, letterSpacing: 0.5 }}>
              HEALTH CONNECT
            </Text>
            <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
              Connect to see your health stats
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} />
        </Card>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.row}>
        <MetricTile
          icon={<Activity size={16} color={colors.primary} strokeWidth={2.25} />}
          label="STEPS"
          value={formatCompact(snapshot.stepsToday)}
          unit="today"
        />
        <MetricTile
          icon={<Flame size={16} color={colors.accent} strokeWidth={2.25} />}
          label="CALORIES"
          value={formatCompact(Math.round(snapshot.activeCaloriesToday))}
          unit="kcal"
        />
      </View>

      <Card style={styles.weightCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.metricHeader}>
            <Scale size={14} color={colors.primary} strokeWidth={2.25} />
            <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
              WEIGHT TREND
            </Text>
          </View>
          <Text variant="h3" weight="700" style={{ color: colors.inkPrimary, marginTop: 4 }}>
            {snapshot.latestWeight ? `${snapshot.latestWeight.kg.toFixed(1)} kg` : '—'}
          </Text>
          {snapshot.weightTrend.length > 1 ? (
            <Text variant="micro" style={{ color: colors.inkMuted, marginTop: 2 }}>
              {summariseWeight(snapshot.weightTrend)}
            </Text>
          ) : null}
        </View>
        {snapshot.weightTrend.length > 1 ? (
          <View style={styles.spark}>
            <Sparkline data={snapshot.weightTrend.map(w => w.kg)} />
          </View>
        ) : null}
      </Card>

      <Pressable onPress={onViewAll} style={({ pressed }) => [
        styles.viewAll,
        pressed && { opacity: 0.7 },
      ]}>
        <Text variant="bodySmall" weight="700" style={{ color: colors.primary }}>
          View all health data
        </Text>
        <ChevronRight size={16} color={colors.primary} strokeWidth={2.25} />
      </Pressable>
    </View>
  );
}

function MetricTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card style={styles.tile}>
      <View style={styles.metricHeader}>
        {icon}
        <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>
      <Text variant="h3" weight="700" style={{ color: colors.inkPrimary, marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="micro" style={{ color: colors.inkMuted }}>
        {unit}
      </Text>
    </Card>
  );
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function summariseWeight(trend: WeightPoint[]): string {
  if (trend.length < 2) return '';
  const first = trend[0].kg;
  const last = trend[trend.length - 1].kg;
  const diff = last - first;
  if (Math.abs(diff) < 0.1) return `Steady over ${trend.length} readings`;
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${Math.abs(diff).toFixed(1)} kg over ${trend.length} readings`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightCard: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  spark: {
    width: 90,
    height: 40,
    justifyContent: 'center',
  },
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
  },
  connectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAll: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
