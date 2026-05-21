import { Check, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { coachingApi } from '../../api/coachingApi';
import { NotificationBell, ScreenHeader } from '../../components/layout';
import {
    Avatar,
    Button,
    Card,
    ProgressBar,
    Screen,
    StatCard,
    Text,
} from '../../components/ui';
import { colors, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';

interface PendingClient {
  id: string;
  name: string;
  when: string;
  avatar: string;
}

interface ActiveClient {
  id: string;
  name: string;
  lastCheckIn: string;
  progress: number;
  avatar: string;
}

const ME_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80&auto=format';

const PENDING: PendingClient[] = [
  { id: '1', name: 'Janez Novak', when: '2h ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&auto=format' },
  { id: '2', name: 'Ana Vidmar', when: '5h ago', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&auto=format' },
  { id: '3', name: 'Luka Krajnc', when: '8h ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format' },
];

const CLIENTS: ActiveClient[] = [
  { id: '1', name: 'Matej Hribar', lastCheckIn: '3 days ago', progress: 78, avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&q=80&auto=format' },
  { id: '2', name: 'Eva Petrič', lastCheckIn: '1 day ago', progress: 92, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80&auto=format' },
  { id: '3', name: 'Tomaž Horvat', lastCheckIn: '5 days ago', progress: 45, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format' },
  { id: '4', name: 'Nina Zupančič', lastCheckIn: '2 days ago', progress: 64, avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&q=80&auto=format' },
];

export function TrainerDashboardScreen() {
  const [pendingRequests, setPendingRequests] = useState<Coaching[]>([]);
  useEffect(() => {
    const fetchPendingRequests = async () => {
      const requests = await coachingApi.getCoachingRequestsForTrainer();
      setPendingRequests(requests);
    };
    fetchPendingRequests();
  }, []);
  const truncate = (text?: string | null, max = 200) => {
    if (!text) return 'No message provided.';
    return text.length > max ? text.slice(0, max) + '...' : text;
  };
  const handleAccept = async (id: string) => {
    await coachingApi.acceptCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  }
  const handleReject = async (id: string) => {
    await coachingApi.rejectCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  }

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        eyebrow="Thursday"
        title="Welcome back, Coach"
        right={
          <View style={styles.headerRight}>
            <NotificationBell hasUnread />
            <Avatar source={ME_IMG} size="lg" />
          </View>
        }
      />

      <View style={[styles.row, styles.gutter]}>
        <StatCard
          label="Active clients"
          value="12"
          footer={
            <Text variant="micro" color="secondary">
              {/* spacer */}
            </Text>
          }
        />
        <StatCard label="Check-ins due" value="3" valueColor="accent" footer={<Text variant="micro" color="secondary" />} />
        <StatCard label="New request" value="1" valueColor="brand" footer={<Text variant="micro" color="secondary" />} />
      </View>


      {pendingRequests.length === 0 ? (
        <View style={[styles.gutter, styles.section]}>
          <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
            No pending coaching requests.
          </Text>
        </View>
      ) : (
        pendingRequests.map(request => (
          <View style={[styles.gutter, styles.section]} key={request.id}>
            <Card padding="md" style={styles.requestCard} bordered>
              <View style={styles.requestDot} />
              <Text variant="caption" color="brand" style={styles.requestEyebrow}>
                New client request
              </Text>
              <View style={styles.requestRow}>
                <Avatar source={{ uri: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&q=80&auto=format' }} size="xl" />
                <View style={styles.requestInfo}>
                  <Text variant="body" weight="600">
                    {request.traineeId || 'Unknown User'}
                  </Text>
                  <Text variant="micro" color="secondary" style={styles.requestSub}>
                    {truncate(request.requestMessage, 40)}
                  </Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                <Button
                  label="Accept"
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={() => handleAccept(request.id)}
                  leftIcon={<Check size={14} color={colors.white} strokeWidth={2.5} />}
                  style={styles.actionBtn}
                />
                <Button
                  label="Decline"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={() => handleReject(request.id)}
                  leftIcon={<X size={14} color={colors.inkSecondary} strokeWidth={2.5} />}
                  style={styles.actionBtn}
                />
              </View>
            </Card>
          </View>
        )))
      }

      <View style={[styles.gutter, styles.section]}>
        <View style={styles.sectionHeader}>
          <Text variant="caption" color="muted">
            Pending check-ins
          </Text>
          <Text variant="caption" color="brand">
            See all
          </Text>
        </View>
        <Card padding="none">
          {PENDING.map((p, i) => (
            <View key={p.id}>
              <View style={styles.clientRow}>
                <Avatar source={p.avatar} size="md" />
                <View style={styles.flex}>
                  <Text variant="bodySmall" weight="600">
                    {p.name}
                  </Text>
                  <Text variant="micro" color="secondary">
                    Submitted {p.when}
                  </Text>
                </View>
                <View style={styles.actionInline}>
                  <Text variant="bodySmall" color="brand" weight="600">
                    Review
                  </Text>
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.25} />
                </View>
              </View>
              {i < PENDING.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))}
        </Card>
      </View>

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
          {CLIENTS.map((c, i) => (
            <View key={c.id}>
              <View style={styles.clientRow}>
                <Avatar source={c.avatar} size="md" />
                <View style={styles.flex}>
                  <Text variant="bodySmall" weight="600" style={styles.clientName}>
                    {c.name}
                  </Text>
                  <View style={styles.progressRow}>
                    <ProgressBar value={c.progress / 100} style={styles.flex} height={4} />
                    <Text mono tabular variant="micro" color="muted" style={styles.progressLabel}>
                      {c.progress}%
                    </Text>
                  </View>
                  <Text variant="micro" color="secondary" style={styles.lastCheckIn}>
                    Last check-in {c.lastCheckIn}
                  </Text>
                </View>
              </View>
              {i < CLIENTS.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bottomSpacer: { height: spacing.huge },
  flex: { flex: 1 },

  requestCard: { borderColor: colors.primaryBorder, position: 'relative' },
  requestDot: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  requestEyebrow: { marginBottom: spacing.md },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  requestInfo: { flex: 1, minWidth: 0 },
  requestSub: { lineHeight: 14, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },

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
  actionInline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: spacing.lg },
});
