import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserRound } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { ScreenHeader } from '../../components/layout';
import { Avatar, Card, ProgressBar, Screen, Tag, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';
import {
    formatRelativeDays,
    formatWeekRange,
    getDaysSince,
    getLatestCheckIn,
    getWeightChange
} from '../../utils/clientCoaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ClientCoachingInfo {
  coaching: Coaching;
  client: User;
  latestCheckIn: ReturnType<typeof getLatestCheckIn>;
}

const getUserAvatarSource = (user: User | null) => {
  if (!user?.avatarUrl) {
    return <UserRound color={colors.primary} strokeWidth={2} />;
  }

  const avatarUrl = user.avatarUrl.startsWith('http')
    ? user.avatarUrl
    : `${API_ORIGIN}${user.avatarUrl}`;

  return { uri: avatarUrl };
};

const getNextCheckInLabel = (latestCheckIn: ReturnType<typeof getLatestCheckIn>) => {
  const daysSince = getDaysSince(latestCheckIn?.start);

  if (daysSince == null) {
    return 'No check-ins yet';
  }

  const daysUntilNext = Math.max(0, 7 - daysSince);

  if (daysUntilNext === 0) {
    return 'Next check-in due now';
  }

  if (daysUntilNext === 1) {
    return 'Next check-in due in 1 day';
  }

  return `Next check-in due in ${daysUntilNext} days`;
};

const getCadenceProgress = (latestCheckIn: ReturnType<typeof getLatestCheckIn>) => {
  const daysSince = getDaysSince(latestCheckIn?.start);
  if (daysSince == null) {
    return 0;
  }

  return Math.min(1, daysSince / 7);
};

const getWeightTrendLabel = (checkIns: Coaching['checkIns']) => {
  const delta = getWeightChange(checkIns);
  if (delta == null || Number.isNaN(delta)) {
    return 'No weight trend yet';
  }

  const direction = delta > 0 ? '+' : '';
  return `${direction}${delta.toFixed(1)} kg from first check-in`;
};

export function ClientsScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCoachings, setActiveCoachings] = useState<ClientCoachingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveClients = async () => {
      try {
        setIsLoading(true);
        const response = await coachingApi.getActiveCoachingsForTrainer();
        const clientCoachings: ClientCoachingInfo[] = [];

        for (const coaching of response) {
          const client = await userApi.getUserByFirebaseUid(coaching.traineeId);
          const latestCheckIn = getLatestCheckIn(coaching.checkIns);

          clientCoachings.push({ coaching, client, latestCheckIn });
        }

        setActiveCoachings(clientCoachings);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveClients();
  }, []);

  const activeCount = activeCoachings.length;
  const averageEnergy = useMemo(
    () => {
      const checkedInClients = activeCoachings.filter((item) => item.latestCheckIn != null);
      if (checkedInClients.length === 0) {
        return null;
      }

      const totalEnergy = checkedInClients.reduce(
        (sum, item) => sum + (item.latestCheckIn?.overallEnergyLevel ?? 0),
        0,
      );

      return totalEnergy / checkedInClients.length;
    },
    [activeCoachings],
  );

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        title="Clients"
        eyebrow={activeCount > 0 ? `${activeCount} active coaching${activeCount === 1 ? '' : 's'}` : 'Trainer overview'}
      />

      <View style={styles.gutter}>
        <Card padding="md" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text variant="caption" color="muted">
                Active clients
              </Text>
              <Text variant="h3">{activeCount}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text variant="caption" color="muted">
                Avg. energy
              </Text>
              <Text variant="h3">
                {averageEnergy == null ? '-' : `${averageEnergy.toFixed(1)}/5`}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" color="secondary">
            Tap any card to open the client overview and all saved check-ins.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodySmall" color="secondary">
              Loading clients...
            </Text>
          </View>
        ) : activeCoachings.length === 0 ? (
          <Card padding="lg">
            <Text variant="body" weight="600">
              No active clients yet
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
              Once a client starts a coaching, their card and check-ins will appear here.
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {activeCoachings.map((item) => {
              const latestCheckIn = item.latestCheckIn;
              const weightTrend = getWeightTrendLabel(item.coaching.checkIns);

              return (
                <Card
                  key={item.coaching.id}
                  onPress={() => navigation.navigate('ClientDetail', { coaching: item.coaching, client: item.client })}
                  style={styles.clientCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <Avatar source={getUserAvatarSource(item.client)} size="xl" />
                      <View style={styles.headerText}>
                        <Text variant="body" weight="600">
                          {item.client.displayName}
                        </Text>
                        <Text variant="bodySmall" color="secondary">
                          {item.client.email}
                        </Text>
                      </View>
                    </View>
                    <Tag label="Active" tone="success" />
                  </View>

                  <View style={styles.progressBlock}>
                    <View style={styles.progressRow}>
                      <Text variant="caption" color="muted">
                        Check-in cadence
                      </Text>
                      <Text variant="micro" color="secondary">
                        {getNextCheckInLabel(latestCheckIn)}
                      </Text>
                    </View>
                    <ProgressBar value={getCadenceProgress(latestCheckIn)} height={6} />
                    <View style={styles.metaRow}>
                      <Text variant="micro" color="secondary">
                        Latest: {latestCheckIn ? formatRelativeDays(latestCheckIn.start) : 'No check-ins yet'}
                      </Text>
                      <Text variant="micro" color="secondary">
                        {item.coaching.checkIns.length} check-in{item.coaching.checkIns.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Text variant="micro" color="secondary">
                        Latest weight
                      </Text>
                      <Text variant="bodySmall" weight="600">
                        {latestCheckIn?.weightKg != null ? `${latestCheckIn.weightKg} kg` : 'Not saved'}
                      </Text>
                    </View>
                    <View style={styles.statChip}>
                      <Text variant="micro" color="secondary">
                        Energy
                      </Text>
                      <Text variant="bodySmall" weight="600">
                        {latestCheckIn ? `${latestCheckIn.overallEnergyLevel}/5` : '-'}
                      </Text>
                    </View>
                  </View>

                  <Text variant="micro" color="secondary">
                    {weightTrend}
                  </Text>
                  <Text variant="micro" color="secondary" style={styles.checkInRange}>
                    {latestCheckIn ? `Latest week ${formatWeekRange(latestCheckIn.start)}` : 'No week range yet'}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryMetric: {
    flex: 1,
    gap: 2,
  },
  loadingState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  clientCard: {
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  checkInRange: {
    marginTop: -spacing.xs,
  },
});