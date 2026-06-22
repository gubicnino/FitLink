import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Flame, Play } from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { Text } from '@/components/ui';
import type { LiveSessionState, WorkoutSession } from '@/types/workout';

interface ResumeHeroProps {
  session: LiveSessionState;
  onResume: () => void;
}

export function ResumeHero({ session, onResume }: ResumeHeroProps) {
  const completed = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0,
  );
  const total = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const startedMin = minutesSince(session.startedAt);

  return (
    <Pressable
      onPress={onResume}
      style={({ pressed }) => [styles.resumeCard, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel="Resume workout"
    >
      <View style={styles.resumeIcon}>
        <Play size={20} color={colors.white} fill={colors.white} strokeWidth={0} />
      </View>
      <View style={styles.resumeBody}>
        <Text variant="micro" weight="700" style={styles.resumeEyebrow}>
          IN PROGRESS · {startedMin}m
        </Text>
        <Text variant="bodyLarge" weight="700" numberOfLines={1} style={styles.resumeTitle}>
          {session.name}
        </Text>
        <Text variant="micro" style={styles.resumeMeta}>
          {completed}/{total} sets completed · tap to resume
        </Text>
      </View>
      <ChevronRight size={18} color={colors.white} strokeWidth={2.5} />
    </Pressable>
  );
}

interface WeeklySummaryProps {
  sessions: WorkoutSession[];
}


export function WeeklySummary({ sessions }: WeeklySummaryProps) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday

  const thisWeek = sessions.filter(s => {
    const ts = s.finishedAt ?? s.startedAt;
    if (!ts) return false;
    const d = new Date(ts);
    return d >= startOfWeek;
  });

  const weekVolume = thisWeek.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (s2, e) => s2 + e.sets.reduce((s3, set) => s3 + set.reps * set.weightKg, 0),
        0,
      ),
    0,
  );

  const streak = computeWeeklyStreak(sessions);

  return (
    <View style={styles.weekCard}>
      <View style={styles.weekHeader}>
        <Text variant="caption" color="muted" style={styles.weekEyebrow}>
          THIS WEEK
        </Text>
        {streak > 0 ? (
          <View style={styles.streakPill}>
            <Flame size={11} color={colors.accent} fill={colors.accent} strokeWidth={0} />
            <Text variant="micro" weight="700" style={{ color: colors.accent }}>
              {' '}
              {streak} week{streak === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.weekStats}>
        <WeekStat value={String(thisWeek.length)} label="workouts" />
        <View style={styles.weekDivider} />
        <WeekStat
          value={weekVolume > 0 ? formatVolume(weekVolume) : '0'}
          unit={weekVolume > 0 ? 'kg' : undefined}
          label="volume"
        />
        <View style={styles.weekDivider} />
        <WeekStat
          value={String(thisWeek.reduce((s, x) => s + x.durationMinutes, 0))}
          unit="min"
          label="time"
        />
      </View>
    </View>
  );
}

function WeekStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.weekStat}>
      <View style={styles.weekStatValueRow}>
        <Text mono tabular weight="800" style={styles.weekStatValue}>
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="muted" style={styles.weekStatUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="micro" color="muted" style={styles.weekStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function minutesSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

function formatVolume(n: number): string {
  if (n < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(0);
  return `${(n / 1000).toFixed(1)}k`;
}


function computeWeeklyStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  const weeks = new Set<string>();
  for (const s of sessions) {
    const ts = s.finishedAt ?? s.startedAt;
    if (!ts) continue;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    weeks.add(isoWeekKey(d));
  }
  if (weeks.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  for (;;) {
    if (weeks.has(isoWeekKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
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

const styles = StyleSheet.create({
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  resumeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBody: { flex: 1, minWidth: 0, gap: 2 },
  resumeEyebrow: { color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  resumeTitle: { color: colors.white, letterSpacing: -0.2 },
  resumeMeta: { color: 'rgba(255,255,255,0.85)' },

  // Weekly summary
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekEyebrow: { letterSpacing: 1, fontSize: 10 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  weekStats: { flexDirection: 'row', alignItems: 'stretch' },
  weekDivider: { width: 1, backgroundColor: colors.line, marginVertical: 4 },
  weekStat: { flex: 1, gap: 2, alignItems: 'flex-start' },
  weekStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  weekStatValue: { fontSize: 22, lineHeight: 24, letterSpacing: -0.5 },
  weekStatUnit: { marginLeft: 4 },
  weekStatLabel: { letterSpacing: 0.3, textTransform: 'uppercase', fontSize: 9 },
});
