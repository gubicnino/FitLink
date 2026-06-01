import { Activity, CalendarDays, Dumbbell, Heart, Scale, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from '../ui';
import { colors, radii, spacing } from '../../theme';
import { useCalendarEvents, type CalendarDay, type CalendarEvent, type CalendarEventType } from '../../hooks/useCalendarEvents';

const TYPE_COLOR: Record<CalendarEventType, string> = {
  workout: colors.primary,
  checkIn: colors.success,
  hcExercise: colors.accent,
  weightLog: colors.warning,
  checkInDue: colors.danger,
};

const TYPE_ICON: Record<CalendarEventType, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  workout: Dumbbell,
  checkIn: CalendarDays,
  hcExercise: Activity,
  weightLog: Scale,
  checkInDue: Heart,
};

const TYPE_LABEL: Record<CalendarEventType, string> = {
  workout: 'Workouts',
  checkIn: 'Check-ins',
  hcExercise: 'Tracked workouts',
  weightLog: 'Weight logs',
  checkInDue: 'Check-in reminders',
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

  if (days.length === 0) return null;

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text variant="caption" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
            ACTIVITY · LAST 14 DAYS
          </Text>
        </View>

        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(day => (
                <DayCell key={day.date} day={day} onPress={() => setOpenDay(day)} />
              ))}
            </View>
          ))}
        </View>

        <Legend />
      </Card>

      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </>
  );
}

function DayCell({ day, onPress }: { day: CalendarDay; onPress: () => void }) {
  const dayNum = Number(day.date.slice(-2));
  const dayName = DAY_NAME[new Date(day.date + 'T00:00:00').getDay()];

  const hasEvents = day.events.length > 0;
  const disabled = !hasEvents && !day.checkInDue;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cell,
        day.isToday && styles.cellToday,
        day.checkInDue && !hasEvents && styles.cellDue,
        pressed && hasEvents && { opacity: 0.7 },
      ]}
    >
      <Text variant="micro" style={[styles.dayName, day.isToday && { color: colors.primary, fontWeight: '700' }]}>
        {dayName}
      </Text>
      <Text
        variant="bodySmall"
        weight={day.isToday ? '700' : '600'}
        style={[
          styles.dayNum,
          day.isFuture && { color: colors.inkMuted },
          day.isToday && { color: colors.primary },
        ]}
      >
        {dayNum}
      </Text>
      <View style={styles.dotsRow}>
        {day.dotTypes.slice(0, 3).map(t => (
          <View key={t} style={[styles.dot, { backgroundColor: TYPE_COLOR[t] }]} />
        ))}
        {day.dotTypes.length > 3 ? <Text variant="micro" style={styles.moreDots}>+</Text> : null}
      </View>
    </Pressable>
  );
}

function Legend() {
  const items: CalendarEventType[] = ['workout', 'checkIn', 'hcExercise', 'weightLog'];
  return (
    <View style={styles.legend}>
      {items.map(t => (
        <View key={t} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR[t] }]} />
          <Text variant="micro" style={{ color: colors.inkMuted }}>
            {TYPE_LABEL[t]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DaySheet({ day, onClose }: { day: CalendarDay | null; onClose: () => void }) {
  const visible = day != null;
  const title = day ? formatDayLabel(day.date, day.isToday) : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text variant="bodyLarge" weight="700" style={{ color: colors.inkPrimary }}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={18} color={colors.inkSecondary} strokeWidth={2.25} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {day && day.events.length > 0 ? (
              day.events.map((ev, i) => <EventRow key={i} event={ev} />)
            ) : (
              <View style={styles.emptyDay}>
                <Text variant="bodySmall" style={{ color: colors.inkMuted, textAlign: 'center' }}>
                  No recorded activity for this day.
                </Text>
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
        <Icon size={18} color={TYPE_COLOR[event.type]} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
          {event.title}
        </Text>
        {event.subtitle ? (
          <Text variant="bodySmall" style={{ color: colors.inkSecondary, marginTop: 2 }}>
            {event.subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="micro" style={{ color: colors.inkMuted }}>
        {formatTime(event.at)}
      </Text>
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

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  cellToday: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cellDue: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  dayName: {
    color: colors.inkMuted,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  dayNum: {
    color: colors.inkPrimary,
    fontSize: 14,
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moreDots: {
    fontSize: 8,
    color: colors.inkMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '70%',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDay: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
