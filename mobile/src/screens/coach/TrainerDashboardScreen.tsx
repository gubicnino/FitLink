import { Check, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { NotificationBell, ScreenHeader } from '../../components/layout';
import {
    Avatar,
    Button,
    Card,
    Screen,
    StatCard,
    Text
} from '../../components/ui';
import { authService } from '../../services/authService';
import { colors, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';
import ActiveClients from './ActiveClients';

interface PendingClient {
  id: string;
  name: string;
  when: string;
  avatar: string;
}


interface CoachingRequestWithTrainee extends Coaching {
  trainee: User | null;
}


const PENDING: PendingClient[] = [
  { id: '1', name: 'Janez Novak', when: '2h ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&auto=format' },
  { id: '2', name: 'Ana Vidmar', when: '5h ago', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&auto=format' },
  { id: '3', name: 'Luka Krajnc', when: '8h ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format' },
];


export function TrainerDashboardScreen() {
  const [pendingRequests, setPendingRequests] = useState<CoachingRequestWithTrainee[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CoachingRequestWithTrainee | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const getUserAvatarSource = (user: User | null) => {
    if (!user?.avatarUrl) {
      return "";
    }

    const avatarUrl = user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `${API_ORIGIN}${user.avatarUrl}`;

    return { uri: avatarUrl };
  };
  useEffect(() => {
    const fetchPendingRequests = async () => {
      const requests = await coachingApi.getCoachingRequestsForTrainer();
      const requestsWithTrainees = await Promise.all(
        requests.map(async (request) => {
          try {
            const trainee = await userApi.getUserByFirebaseUid(request.traineeId);
            return { ...request, trainee };
          } catch (error) {
            console.error(`Failed to load trainee ${request.traineeId}:`, error);
            return { ...request, trainee: null };
          }
        }),
      );

      setPendingRequests(requestsWithTrainees);
    };
    const fetchUser = async () => {
      const user = await authService.getUser();
      setUser(user);
    }

    fetchPendingRequests();
    fetchUser();
  }, []);
  const truncate = (text?: string | null, max = 200) => {
    if (!text) return 'No message provided.';
    return text.length > max ? text.slice(0, max) + '...' : text;
  };
  const openRequestModal = (request: CoachingRequestWithTrainee) => {
    setSelectedRequest(request);
  };
  const closeRequestModal = () => {
    setSelectedRequest(null);
  };
  const handleAccept = async (id: string) => {
    await coachingApi.acceptCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    closeRequestModal();
  }
  const handleReject = async (id: string) => {
    await coachingApi.rejectCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    closeRequestModal();
  }

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        eyebrow="Thursday"
        title= {`Welcome back, ${user?.displayName || 'Coach'}`} 
        right={
          <View style={styles.headerRight}>
            <NotificationBell hasUnread />
            <Avatar source={getUserAvatarSource(user)} size="lg" />
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
            <Card padding="md" style={styles.requestCard} bordered onPress={() => openRequestModal(request)}>
              <View style={styles.requestDot} />
              <Text variant="caption" color="brand" style={styles.requestEyebrow}>
                New client request
              </Text>
              <View style={styles.requestRow}>
                <Avatar source={getUserAvatarSource(request.trainee)} size="xl" />
                <View style={styles.requestInfo}>
                  <Text variant="body" weight="600">
                    {request.trainee?.displayName || 'Pending request'}
                  </Text>
                  
                  <Text variant="micro" color="secondary" style={styles.requestSub}>
                    {truncate(request.requestMessage, 50)}
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

      <Modal visible={selectedRequest !== null} transparent animationType="fade" onRequestClose={closeRequestModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeRequestModal}>
          <View style={styles.modalCard}>
            {selectedRequest ? (
              <Card padding="md" style={styles.requestCard} bordered>
                <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeaderRow}>
                    <Avatar source={getUserAvatarSource(selectedRequest?.trainee)} size="xl" />
                    <View style={styles.modalHeaderText}>
                      <Text variant="body" weight="600" numberOfLines={1}>
                        {selectedRequest?.trainee?.displayName || 'Pending request'}
                      </Text>
                      <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                        {selectedRequest?.trainee?.email || 'No email provided'}
                      </Text>
                    </View>
                  </View>

                  <Text variant="bodySmall" color="secondary" style={styles.modalMessage}>
                    {selectedRequest.requestMessage || 'No message provided.'}
                  </Text>

                  <View style={styles.modalActions}>
                    
                    <Button
                      label="Accept"
                      variant="primary"
                      size="md"
                      fullWidth
                      onPress={() => handleAccept(selectedRequest.id)}
                      leftIcon={<Check size={14} color={colors.white} strokeWidth={2.5} />}
                      style={styles.actionBtn}
                    />
                    <Button
                      label="Reject"
                      variant="ghost"
                      size="md"
                      fullWidth
                      onPress={() => handleReject(selectedRequest.id)}
                      leftIcon={<X size={14} color={colors.inkSecondary} strokeWidth={2.5} />}
                      style={styles.actionBtn}
                    />
                  </View>
                </ScrollView>
              </Card>
            ) : null}
          </View>
        </Pressable>
      </Modal>
      <ActiveClients />

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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxHeight: '84%',
  },
  modalScrollContent: { gap: spacing.lg },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  modalHeaderText: { flex: 1, minWidth: 0 },
  modalMessage: { lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },

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
