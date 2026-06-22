import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '@/api/apiClient';
import { coachingApi } from '@/api/coachingApi';
import { userApi } from '@/api/userApi';
import { Avatar, Card, ProgressBar, Text } from '@/components/ui';
import { colors } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { Coaching } from '@/types/coaching';
import { User } from '@/types/types';
import { CHECK_IN_INTERVAL_DAYS, getDaysSince, getLatestCheckIn } from '@/utils/clientCoaching';

interface ClientCoachingInfo {
    coaching: Coaching;
    client: User;
    latestCheckIn: ReturnType<typeof getLatestCheckIn>;
}

const getUserAvatarSource = (user: User | null) => {
    if (!user?.avatarUrl) {
      return "";
    }

    const avatarUrl = user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `${API_ORIGIN}${user.avatarUrl}`;

    return { uri: avatarUrl };
  };
const ActiveClients = () => {
    const [activeCoachings, setActiveCoachings] = useState<ClientCoachingInfo[]>([]);
    useEffect(() => {
      const fetchActiveClients = async () => {
        const response = await coachingApi.getActiveCoachingsForTrainer();
        const clientCoachings: ClientCoachingInfo[] = [];
        for (const coaching of response) {
            const client: User = await userApi.getUserByFirebaseUid(coaching.traineeId);
          const latestCheckIn = getLatestCheckIn(coaching.checkIns);

          clientCoachings.push({ coaching, client, latestCheckIn });
        }
        setActiveCoachings(clientCoachings);
      };    
      fetchActiveClients();
    }, [])
    
    return (
        <View style={[styles.gutter, styles.section]}>
            <View style={styles.sectionHeader}>
                <Text variant="caption" color="muted">
                    Active clients
                </Text>
                <Text variant="caption" color="brand">
                    See all
                </Text>
            </View>
            <Card padding="none">
                {activeCoachings.map((cc, i) => (
                    <View key={cc.coaching.id}>
                        <View style={styles.clientRow}>
                            <Avatar source={getUserAvatarSource(cc.client)} size="md" />
                            <View style={styles.flex}>
                                <Text variant="bodySmall" weight="600" style={styles.clientName}>
                                    {cc.client.displayName}
                                </Text>
                                <View style={styles.progressRow}>
                                  <ProgressBar
                                    value={Math.min(1, (getDaysSince(cc.latestCheckIn?.start) ?? 0) / CHECK_IN_INTERVAL_DAYS)}
                                    style={styles.flex}
                                    height={4}
                                  />
                                </View>
                                <Text variant="micro" color="secondary" style={styles.lastCheckIn}>
                                  {cc.latestCheckIn
                                    ? `${Math.max(0, CHECK_IN_INTERVAL_DAYS - (getDaysSince(cc.latestCheckIn.start) ?? 0))} days until next check-in`
                                    : 'No check-ins yet'}
                                </Text>
                            </View>
                        </View>
                            {i < activeCoachings.length - 1 ? <View style={styles.separator} /> : null}
                    </View>
                ))}
            </Card>
        </View>
    )
}
const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  flex: { flex: 1 },

  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  clientName: { marginBottom: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressLabel: { fontSize: 10 },
  lastCheckIn: { marginTop: 4 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: spacing.lg },
});
export default ActiveClients