import { useFocusEffect } from '@react-navigation/native';
import { AlertTriangle, CalendarDays, Scale, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from '../ui';
import { colors, radii, spacing } from '../../theme';
import { coachingApi, type TrainerCalendarDay } from '../../api/coachingApi';

const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


export function TrainerCalendarCard() {
  const [days, setDays] = useState<TrainerCalendarDay[]>([]);
  const [openDay, setOpenDay] = useState<TrainerCalendarDay | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const res = await coachingApi.getTrainerCalendar();
      setDays(res ?? []);
    } catch {
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current || days.length === 0) return;
    const todayIndex = days.findIndex(d => isSameDay(d.date, new Date()));
    if (todayIndex < 0) return;
    const cellWidth = 64 + 8;
    scrollRef.current.scrollTo({
      x: Math.max(0, todayIndex * cellWidth - 80),
      animated: false,
    });
  }, [days]);

  if (days.length === 0) return null;

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text variant="caption" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
            CLIENTS · NEXT 7 DAYS
          </Text>
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
      </Card>

      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </>
  );
}

function DayCell({ day, onPress }: { day: TrainerCalendarDay; onPress: () => void }) {
  const date = new Date(day.date + 'T00:00:00');
  const today = isSameDay(day.date, new Date());
  const future = date.getTime() > new Date().setHours(23, 59, 59, 999);

  const totalCount = day.checkInsCount + day.weightLogsCount;
  const hasOverdue = day.overdueClientNames.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.day,
        today && styles.dayToday,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text variant="micro" style={[styles.dayName, today && { color: colors.primary, fontWeight: '700' }]}>
        {DAY_NAME[date.getDay()]}
      </Text>
      <Text
        variant="bodyLarge"
        weight={today ? '700' : '600'}
        style={[styles.dayNum, today && { color: colors.primary }, future && !today && { color: colors.inkMuted }]}
      >
        {date.getDate()}
      </Text>

      <View style={styles.dayMeta}>
        {totalCount > 0 ? (
          <View style={styles.activityChip}>
            <Users size={10} color={colors.primary} strokeWidth={2.25} />
            <Text variant="micro" weight="700" style={{ color: colors.primary }}>
              {day.activeClients}
            </Text>
          </View>
        ) : (
          <View style={styles.activityChipEmpty} />
        )}

        {hasOverdue ? <View style={styles.overdueDot} /> : null}
      </View>
    </Pressable>
  );
}

function DaySheet({ day, onClose }: { day: TrainerCalendarDay | null; onClose: () => void }) {
  if (!day) {
    return <Modal visible={false} transparent />;
  }
  const date = new Date(day.date + 'T00:00:00');
  const today = isSameDay(day.date, new Date());
  const title = today
    ? 'Today'
    : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
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
            <View style={styles.statsRow}>
              <StatPill
                icon={<CalendarDays size={16} color={colors.success} strokeWidth={2.25} />}
                label="Check-ins"
                value={day.checkInsCount}
              />
              <StatPill
                icon={<Scale size={16} color={colors.warning} strokeWidth={2.25} />}
                label="Weight logs"
                value={day.weightLogsCount}
              />
            </View>

            {day.overdueClientNames.length > 0 ? (
              <View style={styles.overdueBlock}>
                <View style={styles.overdueHeader}>
                  <AlertTriangle size={16} color={colors.danger} strokeWidth={2.25} />
                  <Text variant="bodySmall" weight="700" style={{ color: colors.danger }}>
                    {day.overdueClientNames.length} client{day.overdueClientNames.length === 1 ? '' : 's'} overdue on check-in
                  </Text>
                </View>
                {day.overdueClientNames.map((name, i) => (
                  <View key={i} style={styles.overdueRow}>
                    <View style={styles.overdueBullet} />
                    <Text variant="body" style={{ color: colors.inkPrimary }}>
                      {name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDay}>
                <Text variant="bodySmall" style={{ color: colors.inkMuted, textAlign: 'center' }}>
                  No alerts for this day.
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <View style={styles.statPillIcon}>{icon}</View>
      <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" weight="700" style={{ color: colors.inkPrimary, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function isSameDay(dateKey: string, b: Date): boolean {
  const a = new Date(dateKey + 'T00:00:00');
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  day: {
    width: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    gap: 2,
  },
  dayToday: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayName: {
    color: colors.inkMuted,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  dayNum: {
    color: colors.inkPrimary,
    fontSize: 18,
    lineHeight: 22,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    height: 18,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  activityChipEmpty: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  overdueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statPill: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'flex-start',
    gap: 4,
  },
  statPillIcon: {
    marginBottom: 2,
  },
  overdueBlock: {
    borderRadius: radii.lg,
    backgroundColor: 'rgba(239,68,68,0.06)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  overdueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  emptyDay: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
