import { useFocusEffect } from '@react-navigation/native';
import { Flame, Footprints, HeartPulse, Scale } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatCard, Text } from '../ui';
import { colors, spacing } from '@/constants/theme';
import { useHealthConnect } from '../../hooks/useHealthConnect';


export function HealthStatsGrid() {
  const { status, snapshot, refreshSnapshot } = useHealthConnect();

  useFocusEffect(
    useCallback(() => {
      if (status === 'granted' || status === 'partial') {
        refreshSnapshot();
      }
    }, [status, refreshSnapshot]),
  );

  const showLive = status === 'granted' || status === 'partial';

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatCard
          label="Steps"
          value={showLive ? formatCompact(snapshot.stepsToday) : '—'}
          footer={
            <View style={styles.footerRow}>
              <Footprints size={12} color={colors.primary} strokeWidth={2} />
              <Text variant="micro" color="secondary">today</Text>
            </View>
          }
        />
        <StatCard
          label="Active kcal"
          value={showLive ? formatCompact(Math.round(snapshot.activeCaloriesToday)) : '—'}
          valueColor="accent"
          footer={
            <View style={styles.footerRow}>
              <Flame size={12} color={colors.accent} strokeWidth={2} />
              <Text variant="micro" color="secondary">today</Text>
            </View>
          }
        />
      </View>
      <View style={styles.row}>
        <StatCard
          label="Weight"
          value={showLive && snapshot.latestWeight ? `${snapshot.latestWeight.kg.toFixed(1)}` : '—'}
          unit={showLive && snapshot.latestWeight ? 'kg' : undefined}
          footer={
            <View style={styles.footerRow}>
              <Scale size={12} color={colors.primary} strokeWidth={2} />
              <Text variant="micro" color="secondary">
                {showLive ? weightSubtitle(snapshot.latestWeight?.at) : 'no data'}
              </Text>
            </View>
          }
        />
        <StatCard
          label="Resting HR"
          value={showLive && snapshot.restingHeartRate ? String(snapshot.restingHeartRate) : '—'}
          unit={showLive && snapshot.restingHeartRate ? 'bpm' : undefined}
          footer={
            <View style={styles.footerRow}>
              <HeartPulse size={12} color={colors.danger} strokeWidth={2} />
              <Text variant="micro" color="secondary">recovery</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
}

function weightSubtitle(at: string | undefined): string {
  if (!at) return 'no data';
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
