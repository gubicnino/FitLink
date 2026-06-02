import { useFocusEffect } from '@react-navigation/native';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text } from '../ui';
import { colors, radii, shadows, spacing } from '../../theme';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { CHECK_IN_INTERVAL_DAYS } from '../../utils/clientCoaching';
import type { Coaching } from '../../types/coaching';
import type { User } from '../../types/types';
import type { CheckIn } from '../../types/checkin';

const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_WIDTH = 64;
const DAY_GAP = 8;
const BACK_DAYS = 7;
const FORWARD_DAYS = 14;

type DueStatus = 'DONE' | 'MISSED' | 'DUE_TODAY' | 'UPCOMING';

interface DueEntry {
  coachingId: string;
  client: User;
  dueDate: string;
  coveredBy: CheckIn | null;
  daysOffset: number;
  status: DueStatus;
}

interface CalendarDay {
  date: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  dues: DueEntry[];
  doneCount: number;
  missedCount: number;
  upcomingCount: number;
}


export function TrainerCalendarCard() {
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [clients, setClients] = useState<Map<string, User>>(new Map());
  const [openDay, setOpenDay] = useState<CalendarDay | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const actives = await coachingApi.getActiveCoachingsForTrainer();
      const clientMap = new Map<string, User>();
      for (const c of actives) {
        try {
          const user = await userApi.getUserByFirebaseUid(c.traineeId);
          clientMap.set(c.traineeId, user);
        } catch {
        }
      }
      setCoachings(actives);
      setClients(clientMap);
    } catch {
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const days = useMemo(() => buildCalendar(coachings, clients), [coachings, clients]);

  useEffect(() => {
    if (!scrollRef.current || days.length === 0) return;
    const todayIdx = days.findIndex(d => d.isToday);
    if (todayIdx <= 0) return;
    const cellWidth = DAY_WIDTH + DAY_GAP;
    scrollRef.current.scrollTo({
      x: todayIdx * cellWidth - 2,
      animated: false,
    });
  }, [days]);

  const overdueNow = useMemo(() => {
    return countOverdueNow(coachings);
  }, [coachings]);

  const totalDuesInWindow = useMemo(
    () => days.reduce((sum, d) => sum + d.dues.length, 0),
    [days],
  );

  if (coachings.length === 0) return null;

  return (
    <>
      <View style={[styles.card, shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.accentBar} />
            <Text variant="caption" weight="800" style={styles.cardTitle}>
              CHECK-IN SCHEDULE
            </Text>
          </View>
          {overdueNow > 0 ? (
            <View style={[styles.summaryPill, styles.summaryPillDanger]}>
              <AlertTriangle size={10} color={colors.danger} strokeWidth={2.5} />
              <Text style={[styles.summaryText, { color: colors.danger }]}>
                {overdueNow} overdue
              </Text>
            </View>
          ) : (
            <View style={styles.summaryPill}>
              <Text style={styles.summaryText}>
                {totalDuesInWindow} {totalDuesInWindow === 1 ? 'due' : 'dues'}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {days.map(d => (
            <DayCell key={d.date} day={d} onPress={() => setOpenDay(d)} />
          ))}
        </ScrollView>

        <Legend />
      </View>

      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </>
  );
}

function DayCell({ day, onPress }: { day: CalendarDay; onPress: () => void }) {
  const date = new Date(day.date + 'T00:00:00');
  const hasDues = day.dues.length > 0;

  const dominantStatus: DueStatus | null = useMemo(() => {
    if (!hasDues) return null;
    if (day.missedCount > 0) return 'MISSED';
    if (day.dues.some(d => d.status === 'DUE_TODAY')) return 'DUE_TODAY';
    if (day.doneCount > 0) return 'DONE';
    return 'UPCOMING';
  }, [day, hasDues]);

  if (day.isToday) {
    return <TodayCell day={day} hasDues={hasDues} date={date} onPress={onPress} />;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!hasDues}
      style={({ pressed }) => [
        styles.day,
        hasDues && styles.dayActive,
        pressed && hasDues && { opacity: 0.78 },
      ]}
    >
      <Text style={styles.dayName}>
        {DAY_NAME[date.getDay()]}
      </Text>
      <Text
        style={[
          styles.dayNum,
          day.isFuture && !hasDues && { color: colors.inkMuted },
        ]}
      >
        {date.getDate()}
      </Text>

      <View style={styles.dayMeta}>
        {hasDues ? (
          <View
            style={[
              styles.statusChip,
              statusChipStyle(dominantStatus, false),
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusDotColor(dominantStatus, false) },
              ]}
            />
            <Text
              style={[
                styles.statusChipText,
                { color: statusChipTextColor(dominantStatus, false) },
              ]}
            >
              {day.dues.length}
            </Text>
          </View>
        ) : (
          <View style={styles.activityPlaceholder} />
        )}
      </View>
    </Pressable>
  );
}

function TodayCell({
  day,
  hasDues,
  date,
  onPress,
}: {
  day: CalendarDay;
  hasDues: boolean;
  date: Date;
  onPress: () => void;
}) {
  // Pick chip variant based on what's pending today
  const todayAccent =
    day.missedCount > 0
      ? 'missed'
      : day.dues.some(d => d.status === 'DUE_TODAY')
        ? 'due'
        : day.doneCount > 0
          ? 'done'
          : 'idle';

  const chipAccentColor =
    todayAccent === 'missed'
      ? colors.danger
      : todayAccent === 'due'
        ? colors.accent
        : todayAccent === 'done'
          ? colors.success
          : colors.white;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.todayCell, pressed && { opacity: 0.92 }]}
    >
      {/* Subtle inner glow blob for athletic depth */}
      <View pointerEvents="none" style={styles.todayGlow} />

      <Text style={styles.todayEyebrow}>TODAY</Text>

      <Text style={styles.todayDayName}>{DAY_NAME[date.getDay()]}</Text>
      <Text style={styles.todayDayNum}>{date.getDate()}</Text>

      {hasDues ? (
        <View style={[styles.todayChip, { backgroundColor: chipAccentColor }]}>
          <Text
            style={[
              styles.todayChipText,
              { color: todayAccent === 'idle' ? colors.primary : colors.white },
            ]}
          >
            {day.dues.length} {day.dues.length === 1 ? 'due' : 'dues'}
          </Text>
        </View>
      ) : (
        <View style={styles.todayChipEmpty}>
          <Text style={styles.todayChipEmptyText}>No dues</Text>
        </View>
      )}
    </Pressable>
  );
}

function statusChipStyle(status: DueStatus | null, onToday: boolean) {
  if (onToday) {
    return {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderColor: 'rgba(255,255,255,0.32)',
    };
  }
  switch (status) {
    case 'MISSED':
      return {
        backgroundColor: 'rgba(239,68,68,0.10)',
        borderColor: 'rgba(239,68,68,0.32)',
      };
    case 'DUE_TODAY':
      return {
        backgroundColor: 'rgba(255,107,53,0.12)',
        borderColor: 'rgba(255,107,53,0.32)',
      };
    case 'DONE':
      return {
        backgroundColor: 'rgba(16,185,129,0.10)',
        borderColor: 'rgba(16,185,129,0.32)',
      };
    default:
      return { backgroundColor: colors.surface, borderColor: colors.line };
  }
}

function statusDotColor(status: DueStatus | null, onToday: boolean): string {
  if (onToday) return colors.white;
  switch (status) {
    case 'MISSED':
      return colors.danger;
    case 'DUE_TODAY':
      return colors.accent;
    case 'DONE':
      return colors.success;
    default:
      return colors.inkMuted;
  }
}

function statusChipTextColor(status: DueStatus | null, onToday: boolean): string {
  if (onToday) return colors.white;
  switch (status) {
    case 'MISSED':
      return colors.danger;
    case 'DUE_TODAY':
      return colors.accent;
    case 'DONE':
      return colors.success;
    default:
      return colors.inkSecondary;
  }
}


function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>Done</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendText}>Due today</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
        <Text style={styles.legendText}>Missed</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.inkMuted }]} />
        <Text style={styles.legendText}>Upcoming</Text>
      </View>
    </View>
  );
}


function DaySheet({ day, onClose }: { day: CalendarDay | null; onClose: () => void }) {
  if (!day) {
    return <Modal visible={false} transparent />;
  }
  const date = new Date(day.date + 'T00:00:00');
  const title = day.isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const eyebrow = day.isToday
    ? 'TODAY'
    : date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  const subSummary =
    day.dues.length === 0
      ? 'No check-ins scheduled'
      : `${day.dues.length} ${day.dues.length === 1 ? 'check-in' : 'check-ins'} scheduled`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, shadows.modal]} onPress={() => undefined}>
          <View style={styles.grabber} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.sheetSub}>{subSummary}</Text>
            </View>
            <IconButton variant="ghost" size="sm" withBorder onPress={onClose}>
              <X size={16} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
          </View>

          <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {day.dues.length > 0 ? (
              <View style={styles.dueList}>
                {day.dues.map(due => (
                  <DueRow key={`${due.coachingId}-${due.dueDate}`} due={due} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyDay}>
                <View style={styles.emptyIcon}>
                  <CalendarDays size={20} color={colors.inkMuted} strokeWidth={2} />
                </View>
                <Text style={styles.emptyText}>No clients are due on this day.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DueRow({ due }: { due: DueEntry }) {
  const tone = statusTone(due.status);
  return (
    <View style={styles.dueRow}>
      <Avatar source={getUserAvatarSource(due.client)} size="md" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1}>
          {due.client.displayName || 'Client'}
        </Text>
        <Text variant="micro" color="muted" numberOfLines={1} style={styles.dueRowSub}>
          {statusHint(due)}
        </Text>
      </View>
      <View style={[styles.dueStatusPill, { backgroundColor: tone.softBg, borderColor: tone.border }]}>
        {statusIcon(due.status, tone.fg)}
        <Text style={[styles.dueStatusText, { color: tone.fg }]}>
          {statusLabel(due.status).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function statusTone(status: DueStatus): { fg: string; softBg: string; border: string } {
  switch (status) {
    case 'DONE':
      return {
        fg: colors.success,
        softBg: 'rgba(16,185,129,0.10)',
        border: 'rgba(16,185,129,0.32)',
      };
    case 'MISSED':
      return {
        fg: colors.danger,
        softBg: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.32)',
      };
    case 'DUE_TODAY':
      return {
        fg: colors.accent,
        softBg: 'rgba(255,107,53,0.12)',
        border: 'rgba(255,107,53,0.32)',
      };
    case 'UPCOMING':
      return {
        fg: colors.inkSecondary,
        softBg: colors.surfaceElevated,
        border: colors.line,
      };
  }
}

function statusIcon(status: DueStatus, color: string): React.ReactNode {
  switch (status) {
    case 'DONE':
      return <CheckCircle2 size={11} color={color} strokeWidth={2.5} />;
    case 'MISSED':
      return <XCircle size={11} color={color} strokeWidth={2.5} />;
    case 'DUE_TODAY':
      return <AlertTriangle size={11} color={color} strokeWidth={2.5} />;
    case 'UPCOMING':
      return <Clock size={11} color={color} strokeWidth={2.5} />;
  }
}

function statusLabel(status: DueStatus): string {
  switch (status) {
    case 'DONE':
      return 'Done';
    case 'MISSED':
      return 'Missed';
    case 'DUE_TODAY':
      return 'Due today';
    case 'UPCOMING':
      return 'Upcoming';
  }
}

function statusHint(due: DueEntry): string {
  switch (due.status) {
    case 'DONE':
      return due.coveredBy
        ? `Logged ${formatRelative(due.coveredBy.start)}`
        : 'Logged';
    case 'MISSED':
      return due.daysOffset === 1
        ? '1 day overdue'
        : `${due.daysOffset} days overdue`;
    case 'DUE_TODAY':
      return 'Awaiting check-in today';
    case 'UPCOMING':
      return due.daysOffset === -1
        ? 'Tomorrow'
        : `In ${Math.abs(due.daysOffset)} days`;
  }
}


function buildCalendar(coachings: Coaching[], clients: Map<string, User>): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  // Initialize the window
  const days: CalendarDay[] = [];
  for (let offset = -BACK_DAYS; offset <= FORWARD_DAYS; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    days.push({
      date: formatDateKey(d),
      isToday: offset === 0,
      isPast: offset < 0,
      isFuture: offset > 0,
      dues: [],
      doneCount: 0,
      missedCount: 0,
      upcomingCount: 0,
    });
  }
  const dayByKey = new Map(days.map(d => [d.date, d]));
  const windowStartKey = days[0].date;
  const windowEndKey = days[days.length - 1].date;

  for (const coaching of coachings) {
    const client = clients.get(coaching.traineeId);
    if (!client) continue;

    const sortedCheckIns = [...(coaching.checkIns ?? [])].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    const anchor =
      sortedCheckIns[0]?.start ??
      coaching.startedAt ??
      null;
    if (!anchor) continue;

    const anchorDate = new Date(anchor);
    if (Number.isNaN(anchorDate.getTime())) continue;
    anchorDate.setHours(0, 0, 0, 0);

    let firstDue = new Date(anchorDate);
    if (sortedCheckIns.length > 0) {
      firstDue.setDate(firstDue.getDate() + CHECK_IN_INTERVAL_DAYS);
    }

    const dueDate = new Date(firstDue);
    let safety = 0;
    while (formatDateKey(dueDate) <= windowEndKey && safety < 100) {
      safety += 1;
      const dueKey = formatDateKey(dueDate);

      if (dueKey >= windowStartKey) {
        const dueDateCopy = new Date(dueDate);
        const due: DueEntry = classifyDue(
          coaching.id,
          client,
          dueDateCopy,
          today,
          sortedCheckIns,
        );
        const bucket = dayByKey.get(dueKey);
        if (bucket) {
          bucket.dues.push(due);
          if (due.status === 'DONE') bucket.doneCount += 1;
          else if (due.status === 'MISSED') bucket.missedCount += 1;
          else if (due.status === 'UPCOMING') bucket.upcomingCount += 1;
        }
      }
      dueDate.setDate(dueDate.getDate() + CHECK_IN_INTERVAL_DAYS);
    }
  }

  for (const day of days) {
    day.dues.sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
    void todayKey;
  }

  return days;
}

function classifyDue(
  coachingId: string,
  client: User,
  dueDate: Date,
  today: Date,
  sortedCheckIns: CheckIn[],
): DueEntry {
  const dueKey = formatDateKey(dueDate);
  const todayKey = formatDateKey(today);
  const daysOffset = daysBetween(dueDate, today); 
  // today - dueDate, in days
  // daysOffset > 0 → due is in the past
  // daysOffset === 0 → due today
  // daysOffset < 0 → due in the future

  const earlyMs = 3 * 86_400_000;
  const lateMs = CHECK_IN_INTERVAL_DAYS * 86_400_000;
  const dueMs = dueDate.getTime();
  const cover = sortedCheckIns.find(ci => {
    const t = new Date(ci.start).getTime();
    return t >= dueMs - earlyMs && t < dueMs + lateMs;
  });

  let status: DueStatus;
  if (cover) {
    status = 'DONE';
  } else if (dueKey === todayKey) {
    status = 'DUE_TODAY';
  } else if (daysOffset > 0) {
    status = 'MISSED';
  } else {
    status = 'UPCOMING';
  }

  return {
    coachingId,
    client,
    dueDate: dueKey,
    coveredBy: cover ?? null,
    daysOffset,
    status,
  };
}

function statusOrder(s: DueStatus): number {
  switch (s) {
    case 'MISSED':
      return 0;
    case 'DUE_TODAY':
      return 1;
    case 'DONE':
      return 2;
    case 'UPCOMING':
      return 3;
  }
}


function countOverdueNow(coachings: Coaching[]): number {
  let n = 0;
  for (const c of coachings) {
    const latest = [...(c.checkIns ?? [])].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    )[0];
    if (!latest) {
      n += 1;
      continue;
    }
    const daysSince = Math.floor(
      (Date.now() - new Date(latest.start).getTime()) / 86_400_000,
    );
    if (daysSince >= CHECK_IN_INTERVAL_DAYS) n += 1;
  }
  return n;
}


function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatRelative(iso?: string | null): string {
  if (!iso) return 'recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recently';
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function getUserAvatarSource(user: User | null) {
  if (!user?.avatarUrl) return '';
  const url = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_ORIGIN}${user.avatarUrl}`;
  return { uri: url };
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  cardTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  summaryPillDanger: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  summaryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.inkSecondary,
  },

  strip: {
    flexDirection: 'row',
    gap: DAY_GAP,
    paddingHorizontal: 2,
  },
  day: {
    width: DAY_WIDTH,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 2,
  },
  dayActive: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },

  // Today cell - premium variant with glow + accent chip
  todayCell: {
    width: DAY_WIDTH + 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  todayGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryDark,
    opacity: 0.55,
  },
  todayEyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 1,
  },
  todayDayName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.78)',
  },
  todayDayNum: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
    color: colors.white,
    marginTop: 1,
  },
  todayChip: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  todayChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  todayChipEmpty: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  todayChipEmptyText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.85)',
  },
  dayName: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dayNum: {
    color: colors.inkPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    height: 22,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    minWidth: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  activityPlaceholder: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkMuted,
    letterSpacing: 0.1,
  },

  // Sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '78%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.accent,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontWeight: '800',
    color: colors.inkPrimary,
    marginTop: 2,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  sheetScroll: { paddingTop: spacing.md, paddingBottom: spacing.lg },

  dueList: { gap: spacing.sm },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dueRowSub: { marginTop: 2 },
  dueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dueStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  emptyDay: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
