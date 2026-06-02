import {
  Activity,
  CalendarDays,
  Dumbbell,
  Heart,
  Scale,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text } from '../ui';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  useCalendarEvents,
  type CalendarDay,
  type CalendarEvent,
  type CalendarEventType,
} from '../../hooks/useCalendarEvents';

const TYPE_COLOR: Record<CalendarEventType, string> = {
  workout: colors.primary,
  checkIn: colors.success,
  hcExercise: colors.accent,
  weightLog: colors.warning,
  checkInDue: colors.danger,
};

const TYPE_ICON: Record<
  CalendarEventType,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  workout: Dumbbell,
  checkIn: CalendarDays,
  hcExercise: Activity,
  weightLog: Scale,
  checkInDue: Heart,
};

const TYPE_LABEL: Record<CalendarEventType, string> = {
  workout: 'Workouts',
  checkIn: 'Check-ins',
  hcExercise: 'Activity',
  weightLog: 'Weight',
  checkInDue: 'Reminders',
};

const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TraineeCalendarCard() {
  const { days } = useCalendarEvents();
  const [openDay, setOpenDay] = useState<CalendarDay | null>(null);

  const rows = useMemo(() => {
    const out: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  const summary = useMemo(() => {
    let active = 0;
    let total = 0;
    let dueCount = 0;
    for (const d of days) {
      if (d.events.length > 0) active += 1;
      total += d.events.length;
      if (d.checkInDue) dueCount += 1;
    }
    return { active, total, dueCount };
  }, [days]);

  if (days.length === 0) return null;

  return (
    <>
      <View style={[styles.card, shadows.card]}>
        {/* Mini section header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.accentBar} />
            <Text variant="caption" weight="800" style={styles.cardTitle}>
              ACTIVITY · LAST 14 DAYS
            </Text>
          </View>
          <View style={styles.cardSummaryPill}>
            <Text style={styles.cardSummaryText}>
              {summary.active}/14 active
            </Text>
          </View>
        </View>

        {/* Day-of-week header strip */}
        <View style={styles.dowRow}>
          {rows[0]?.map(d => {
            const name = DAY_NAME[new Date(d.date + 'T00:00:00').getDay()];
            return (
              <View key={`dow-${d.date}`} style={styles.dowCell}>
                <Text style={styles.dowText}>{name.slice(0, 1)}</Text>
              </View>
            );
          })}
        </View>

        {/* 14-day grid */}
        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(day => (
                <DayCell key={day.date} day={day} onPress={() => setOpenDay(day)} />
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <Legend />
      </View>

      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </>
  );
}

function DayCell({ day, onPress }: { day: CalendarDay; onPress: () => void }) {
  const dayNum = Number(day.date.slice(-2));
  const hasEvents = day.events.length > 0;
  const disabled = !hasEvents && !day.checkInDue;
  const eventCount = day.events.length;
  const intensity = Math.min(1, eventCount / 4);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cell,
        hasEvents && !day.isToday && intensityStyle(intensity),
        day.isToday && styles.cellToday,
        day.checkInDue && !hasEvents && styles.cellDue,
        day.isFuture && !day.isToday && styles.cellFuture,
        pressed && hasEvents && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[
          styles.dayNum,
          day.isToday && { color: colors.white },
          hasEvents && !day.isToday && { color: colors.inkPrimary },
          day.isFuture && !day.isToday && !hasEvents && { color: colors.inkMuted },
        ]}
      >
        {dayNum}
      </Text>

      {/* Event chip-row spodaj v celici */}
      <View style={styles.cellDots}>
        {day.dotTypes.slice(0, 3).map(t => (
          <View
            key={t}
            style={[
              styles.dot,
              { backgroundColor: day.isToday ? colors.white : TYPE_COLOR[t] },
              day.isToday && { opacity: 0.85 },
            ]}
          />
        ))}
        {day.dotTypes.length > 3 ? (
          <Text style={[styles.moreDot, day.isToday && { color: 'rgba(255,255,255,0.85)' }]}>
            +{day.dotTypes.length - 3}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function intensityStyle(intensity: number) {
  if (intensity >= 0.75) {
    return { backgroundColor: colors.primarySoftStrong, borderColor: colors.primaryBorder };
  }
  if (intensity >= 0.4) {
    return {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primaryBorder,
    };
  }
  return {
    backgroundColor: 'rgba(46,91,159,0.06)',
    borderColor: 'rgba(46,91,159,0.18)',
  };
}

function Legend() {
  const items: CalendarEventType[] = ['workout', 'checkIn', 'hcExercise', 'weightLog'];
  return (
    <View style={styles.legend}>
      {items.map(t => (
        <View key={t} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR[t] }]} />
          <Text style={styles.legendText}>{TYPE_LABEL[t]}</Text>
        </View>
      ))}
    </View>
  );
}

function DaySheet({ day, onClose }: { day: CalendarDay | null; onClose: () => void }) {
  const visible = day != null;
  const eyebrow = day
    ? day.isToday
      ? 'TODAY'
      : new Date(day.date + 'T00:00:00')
          .toLocaleDateString('en-US', { weekday: 'long' })
          .toUpperCase()
    : '';
  const title = day ? formatDayLabel(day.date, day.isToday) : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, shadows.modal]}
          onPress={() => undefined}
          accessibilityRole="none"
        >
          <View style={styles.grabber} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {title}
              </Text>
              {day ? (
                <Text style={styles.sheetSub}>
                  {day.events.length === 0
                    ? day.checkInDue
                      ? 'Check-in reminder'
                      : 'No activity'
                    : `${day.events.length} ${day.events.length === 1 ? 'event' : 'events'} recorded`}
                </Text>
              ) : null}
            </View>
            <IconButton variant="ghost" size="sm" withBorder onPress={onClose}>
              <X size={16} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
          >
            {day && day.events.length > 0 ? (
              day.events.map((ev, i) => <EventRow key={i} event={ev} />)
            ) : (
              <View style={styles.emptyDay}>
                <View style={styles.emptyIcon}>
                  <CalendarDays size={20} color={colors.inkMuted} strokeWidth={2} />
                </View>
                <Text style={styles.emptyText}>No recorded activity for this day.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const Icon = TYPE_ICON[event.type];
  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIcon, { backgroundColor: hexToSoft(TYPE_COLOR[event.type]) }]}>
        <Icon size={16} color={TYPE_COLOR[event.type]} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1} style={styles.eventTitle}>
          {event.title}
        </Text>
        {event.subtitle ? (
          <Text variant="micro" color="muted" numberOfLines={1} style={styles.eventSubtitle}>
            {event.subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={styles.eventTime}>{formatTime(event.at)}</Text>
    </View>
  );
}

function formatDayLabel(dateKey: string, isToday: boolean): string {
  const d = new Date(dateKey + 'T00:00:00');
  if (isToday) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  if (iso.endsWith('T00:00:00Z')) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function hexToSoft(hex: string): string {
  if (hex === colors.primary) return colors.primarySoft;
  if (hex === colors.accent) return colors.accentSoft;
  if (hex === colors.success) return colors.successSoft;
  if (hex === colors.warning) return colors.warningSoft;
  if (hex === colors.danger) return 'rgba(239,68,68,0.12)';
  return colors.surfaceElevated;
}

const CELL_BORDER = 1;

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
  cardSummaryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  cardSummaryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.inkSecondary,
  },

  dowRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: 2 },
  dowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.inkMuted,
  },

  grid: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  cell: {
    flex: 1,
    aspectRatio: 0.92,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: CELL_BORDER,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  cellToday: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cellDue: {
    borderColor: colors.danger,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  cellFuture: {
    backgroundColor: colors.bg,
  },
  dayNum: {
    color: colors.inkSecondary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  cellDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreDot: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.inkMuted,
    lineHeight: 8,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
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
    maxHeight: '75%',
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
  sheetScroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { letterSpacing: -0.1, color: colors.inkPrimary },
  eventSubtitle: { marginTop: 2 },
  eventTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.3,
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
