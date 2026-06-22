import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Clock, Dumbbell, TrendingUp, Trophy } from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { Text } from '@/components/ui';
import type { WorkoutSession } from '@/types/workout';

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
  const dayOfWeek = dateLabel ? formatDayOfWeek(dateLabel) : null;
  const relativeDate = dateLabel ? formatRelativeDate(dateLabel) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open workout ${session.name}`}
    >
      {dayOfWeek ? (
        <View style={styles.dateCol}>
          <Text variant="micro" weight="700" style={styles.dateDow}>
            {dayOfWeek.dow}
          </Text>
          <Text mono tabular weight="800" style={styles.dateDay}>
            {dayOfWeek.day}
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text variant="h3" weight="700" numberOfLines={1} style={styles.title}>
            {session.name}
          </Text>
          <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2.25} />
        </View>

        <View style={styles.metaRow}>
          {relativeDate ? (
            <Text variant="micro" color="muted">
              {relativeDate}
            </Text>
          ) : null}
          {session.durationMinutes > 0 ? (
            <>
              <View style={styles.metaDot} />
              <View style={styles.metaInline}>
                <Clock size={10} color={colors.inkMuted} strokeWidth={2} />
                <Text variant="micro" color="muted">
                  {' '}
                  {session.durationMinutes} min
                </Text>
              </View>
            </>
          ) : null}
          <View style={styles.metaDot} />
          <Text variant="micro" color="muted">
            {totalSets} sets
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat
            icon={<Dumbbell size={12} color={colors.primary} strokeWidth={2.25} />}
            value={String(session.exercises.length)}
            label="exercises"
          />
          <Stat
            icon={<TrendingUp size={12} color={colors.success} strokeWidth={2.25} />}
            value={totalVolume > 0 ? formatVolume(totalVolume) : '—'}
            unit={totalVolume > 0 ? 'kg' : undefined}
            label="volume"
          />
          <Stat
            icon={<Trophy size={12} color={colors.accent} fill={colors.accent} strokeWidth={0} />}
            value={heaviest > 0 ? formatNumber(heaviest) : '—'}
            unit={heaviest > 0 ? 'kg' : undefined}
            label="top set"
            highlight
          />
        </View>
      </View>
    </Pressable>
  );
}

interface StatProps {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  highlight?: boolean;
}

function Stat({ icon, value, unit, label, highlight }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        {icon}
        <Text variant="micro" color="muted" style={styles.statLabel}>
          {label}
        </Text>
      </View>
      <View style={styles.statValueRow}>
        <Text
          mono
          tabular
          weight="800"
          style={[styles.statValue, highlight && { color: colors.accent }]}
        >
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="muted" style={styles.statUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatDayOfWeek(iso: string): { dow: string; day: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    dow: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase().slice(0, 3),
    day: String(d.getDate()),
  };
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
  cardPressed: { opacity: 0.92 },

  dateCol: {
    width: 56,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  dateDow: {
    color: colors.primary,
    letterSpacing: 1,
    fontSize: 10,
  },
  dateDay: { fontSize: 22, lineHeight: 24, color: colors.primary },

  body: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, letterSpacing: -0.2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaInline: { flexDirection: 'row', alignItems: 'center' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.inkMuted,
    opacity: 0.6,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stat: { flex: 1, gap: 2 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { letterSpacing: 0.3, textTransform: 'uppercase', fontSize: 9 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 17, lineHeight: 20, letterSpacing: -0.3 },
  statUnit: { marginLeft: 3 },
});
