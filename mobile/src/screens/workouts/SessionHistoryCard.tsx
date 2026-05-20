import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Calendar, Clock, Dumbbell, TrendingUp, Trophy } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Dot, Text } from '../../components/ui';
import type { WorkoutSession } from '../../types/workout';

interface Props {
  session: WorkoutSession;
  onPress?: () => void;
}


export function SessionHistoryCard({ session, onPress }: Props) {
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, set) => s2 + set.reps * set.weightKg, 0),
    0,
  );
  const heaviest = session.exercises.reduce((max, e) => {
    const exMax = e.sets.reduce((m, s) => Math.max(m, s.weightKg), 0);
    return Math.max(max, exMax);
  }, 0);

  const dateLabel = (session.finishedAt ?? session.startedAt) || null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.accent} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          {dateLabel ? (
            <View style={styles.datePill}>
              <Calendar size={11} color={colors.primary} strokeWidth={2.25} />
              <Text variant="micro" weight="700" color="brand">
                {' '}
                {formatRelativeDate(dateLabel)}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            {session.durationMinutes > 0 ? (
              <>
                <View style={styles.metaItem}>
                  <Clock size={11} color={colors.inkMuted} strokeWidth={2} />
                  <Text variant="micro" color="muted">
                    {' '}
                    {session.durationMinutes} min
                  </Text>
                </View>
                <Dot />
              </>
            ) : null}
            <Text variant="micro" color="muted">
              {totalSets} sets
            </Text>
          </View>
        </View>

        <Text variant="h3" weight="700" numberOfLines={1} style={styles.title}>
          {session.name}
        </Text>

        <View style={styles.stats}>
          <StatTile
            icon={<Dumbbell size={14} color={colors.primary} strokeWidth={2} />}
            value={String(session.exercises.length)}
            label={session.exercises.length === 1 ? 'exercise' : 'exercises'}
          />
          <View style={styles.statDivider} />
          <StatTile
            icon={<TrendingUp size={14} color={colors.success} strokeWidth={2} />}
            value={totalVolume > 0 ? formatVolume(totalVolume) : '—'}
            label="volume"
            unit={totalVolume > 0 ? 'kg' : undefined}
          />
          <View style={styles.statDivider} />
          <StatTile
            icon={
              <Trophy
                size={14}
                color={colors.accent}
                fill={colors.accent}
                strokeWidth={0}
              />
            }
            value={heaviest > 0 ? formatNumber(heaviest) : '—'}
            label="heaviest"
            unit={heaviest > 0 ? 'kg' : undefined}
            highlight
          />
        </View>
      </View>
    </Pressable>
  );
}

interface StatTileProps {
  icon?: React.ReactNode;
  value: string;
  label: string;
  unit?: string;
  highlight?: boolean;
}

function StatTile({ icon, value, label, unit, highlight }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      {icon ? <View style={styles.statIcon}>{icon}</View> : null}
      <View style={styles.statValueRow}>
        <Text
          mono
          tabular
          weight="700"
          style={[styles.statValue, highlight && styles.statValueHighlight]}
        >
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="muted" style={styles.statUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="micro" color="muted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}


function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(then.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatVolume(n: number): string {
  if (n < 1000) return formatNumber(n);
  return `${(n / 1000).toFixed(1)}k`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  body: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
    backgroundColor: colors.primarySoftStrong,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center' },

  title: { letterSpacing: -0.2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.xs,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: { marginBottom: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 18, lineHeight: 20 },
  statValueHighlight: { color: colors.accent },
  statUnit: { marginLeft: 3 },
  statLabel: { fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
});
