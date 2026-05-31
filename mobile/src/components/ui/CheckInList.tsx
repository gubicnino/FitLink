import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { CheckIn } from '../../types/checkin';
import { Card } from './Card';
import { CheckInCard } from './CheckInCard';
import { Text } from './Text';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NEXT_CHECK_IN_INTERVAL_DAYS = 7;

function formatTimeDiff(from: Date, to: Date = new Date()): string {
  const ms = Math.abs(to.getTime() - from.getTime());

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours   = Math.floor(totalMinutes / 60);
  const days         = Math.floor(totalHours / 24);
  const hours        = totalHours % 24;
  const minutes      = totalMinutes % 60;

  if (days > 0)    return `${days}d ${hours}h`;
  if (hours > 0)   return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}
interface CheckInListProps {
    checkIns?: CheckIn[];
}
export function CheckInList({ checkIns }: CheckInListProps) {
  const navigation = useNavigation<Nav>();
  const isLoading = checkIns === undefined;
  const resolvedCheckIns = checkIns ?? [];
  const checkInState = useMemo(() => {
    if (resolvedCheckIns.length === 0) {
      return { label: null, isAvailable: false };
    }

    const latestCheckIn = [...resolvedCheckIns].sort(
      (left, right) => new Date(right.start).getTime() - new Date(left.start).getTime(),
    )[0];

    const nextCheckInDate = new Date(latestCheckIn.start);
    nextCheckInDate.setDate(nextCheckInDate.getDate() + NEXT_CHECK_IN_INTERVAL_DAYS);

    const diffMs = nextCheckInDate.getTime() - Date.now();

    return {
      label: diffMs <= 0 ? 'available now' : formatTimeDiff(nextCheckInDate),
      isAvailable: diffMs <= 0,
    };
  }, [resolvedCheckIns]);

  const timeToNext = checkInState.label;
  const isNextCheckInAvailable = checkInState.isAvailable;

  const formatDateRange = (start: string) => {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      return 'Unknown week';
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date: Date) =>
      date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const renderCheckInSubtitle = (checkIn: CheckIn) => {
    const weekLabel = checkIn.start ? formatDateRange(checkIn.start) : 'Unknown week';
    return `Submitted for week ${weekLabel}`;
  };
  return (
    <View style={[styles.gutter, styles.section]}>
      <Text variant="caption" color="muted" style={styles.sectionLabel}>
        Check-ins
      </Text>
      {timeToNext != null && (
        <Text variant="bodySmall" color="secondary" style={styles.nextCheckInLabel}>
          {isNextCheckInAvailable ? ' Next check-in available now!' : `Next check-in available in ${timeToNext}`}
        </Text>
      )}

      {isNextCheckInAvailable ? (
        <CheckInCard
          title="New weekly check-in"
          subtitle="Create your next check-in"
          tagLabel="Available"
          tagTone="primary"
          variant="primary"
          onPress={() => navigation.navigate('WeeklyCheckIn')}
        />
      ) : null}

      <Card padding="none">
        {isLoading ? (
          <View style={styles.loadingRow}>
            <Text variant="bodySmall" color="secondary">
              Loading check-ins...
            </Text>
          </View>
        ) : resolvedCheckIns.length === 0 ? (
          <CheckInCard
            title="Initial check-in"
            subtitle="Create your first check-in"
            tagLabel="Initial"
            tagTone="primary"
            onPress={() => navigation.navigate('WeeklyCheckIn')}
          />
        ) : (
          resolvedCheckIns.map((checkIn, index) => (
            <View key={checkIn.id ?? `${checkIn.start}-${index}`}>
              <CheckInCard
                title={checkIn.start ? formatDateRange(checkIn.start) : 'Unknown week'}
                subtitle={renderCheckInSubtitle(checkIn)}
                onPress={() => navigation.navigate('WeeklyCheckIn', { checkIn })}
              />
              {index < resolvedCheckIns.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xl },
  sectionLabel: { marginBottom: spacing.md },
  nextCheckInLabel: { marginBottom: spacing.md, marginTop: spacing.md },
  loadingRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});

export default CheckInList;
