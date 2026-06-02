import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  GraduationCap,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { userApi } from '../../api/userApi';
import { ScreenHeader } from '../../components/layout';
import { Avatar, Button, IconButton, ProgressBar, Screen, Text } from '../../components/ui';
import { TrainerCalendarCard } from '../../components/calendar/TrainerCalendarCard';
import type { RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { colors, radii, shadows, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';
import { CHECK_IN_INTERVAL_DAYS, getDaysSince, getLatestCheckIn } from '../../utils/clientCoaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CoachingRequestWithTrainee extends Coaching {
  trainee: User | null;
}

interface ClientCoachingInfo {
  coaching: Coaching;
  client: User;
  latestCheckIn: ReturnType<typeof getLatestCheckIn>;
  daysSinceLast: number | null;
}

export function TrainerDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CoachingRequestWithTrainee[]>([]);
  const [activeClients, setActiveClients] = useState<ClientCoachingInfo[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CoachingRequestWithTrainee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, requests, actives] = await Promise.all([
        authService.getUser(),
        coachingApi.getCoachingRequestsForTrainer().catch(() => [] as Coaching[]),
        coachingApi.getActiveCoachingsForTrainer().catch(() => [] as Coaching[]),
      ]);
      setUser(u);

      const requestsWithTrainees: CoachingRequestWithTrainee[] = await Promise.all(
        requests.map(async (request) => {
          try {
            const trainee = await userApi.getUserByFirebaseUid(request.traineeId);
            return { ...request, trainee };
          } catch {
            return { ...request, trainee: null };
          }
        }),
      );
      setPendingRequests(requestsWithTrainees);

      // Hydrate clients + check-in summary
      const hydrated: ClientCoachingInfo[] = [];
      for (const coaching of actives) {
        try {
          const client = await userApi.getUserByFirebaseUid(coaching.traineeId);
          const latestCheckIn = getLatestCheckIn(coaching.checkIns);
          const daysSinceLast = latestCheckIn ? getDaysSince(latestCheckIn.start) : null;
          hydrated.push({ coaching, client, latestCheckIn, daysSinceLast });
        } catch (e) {
          console.error(`Failed to load client ${coaching.traineeId}:`, e);
        }
      }
      // Sort po MOST overdue first
      hydrated.sort((a, b) => clientOverdueRank(b) - clientOverdueRank(a));
      setActiveClients(hydrated);
    } catch (e) {
      console.error('Trainer dashboard load failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const checkInsDue = useMemo(
    () => activeClients.filter(c => c.daysSinceLast == null || c.daysSinceLast >= CHECK_IN_INTERVAL_DAYS).length,
    [activeClients],
  );

  const truncate = (text?: string | null, max = 80) => {
    if (!text) return 'No message provided.';
    return text.length > max ? text.slice(0, max) + '…' : text;
  };

  const openRequestModal = (request: CoachingRequestWithTrainee) => setSelectedRequest(request);
  const closeRequestModal = () => setSelectedRequest(null);

  const handleAccept = async (id: string) => {
    await coachingApi.acceptCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    closeRequestModal();
    load();
  };

  const handleReject = async (id: string) => {
    await coachingApi.rejectCoachingRequest(id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    closeRequestModal();
  };

  if (loading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Home" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero ------------------------------------------------ */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, shadows.card]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroGlowBottom} />

            <View style={styles.heroTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroEyebrow}>{formatTodayEyebrow()}</Text>
                <Text style={styles.heroTitle}>{greeting()},</Text>
                <Text style={styles.heroName} numberOfLines={1}>
                  Coach {user?.displayName?.split(' ')[0] || ''}
                </Text>
              </View>
              <View style={styles.heroRight}>
                <View style={styles.heroAvatarRing}>
                  <Avatar source={getUserAvatarSource(user)} size="lg" />
                </View>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <HeroStat value={String(activeClients.length)} label={activeClients.length === 1 ? 'client' : 'clients'} />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={String(checkInsDue)}
                label="due"
                accent={checkInsDue > 0}
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={String(pendingRequests.length)}
                label={pendingRequests.length === 1 ? 'request' : 'requests'}
                accent={pendingRequests.length > 0}
              />
            </View>
          </View>
        </View>

        {/* Quick actions ------------------------------------ */}
        <View style={styles.gutter}>
          <View style={styles.quickRow}>
            <QuickAction
              icon={<Users size={18} color={colors.primary} strokeWidth={2.25} />}
              label="My clients"
              hint={
                activeClients.length === 0
                  ? 'No clients yet'
                  : `${activeClients.length} active`
              }
              onPress={() => navigation.navigate('TrainerRoot', { screen: 'Clients' })}
            />
            <QuickAction
              icon={<GraduationCap size={18} color={colors.accent} strokeWidth={2.25} />}
              label="Add course"
              hint="Publish content"
              onPress={() => navigation.navigate('AddCourses')}
              accent
            />
          </View>
        </View>

        {/* Calendar ----------------------------------------- */}
        <SectionHeader label="CALENDAR" />
        <View style={styles.gutter}>
          <TrainerCalendarCard />
        </View>

        {/* Pending requests --------------------------------- */}
        <SectionHeader
          label="PENDING REQUESTS"
          count={pendingRequests.length}
          accentCount={pendingRequests.length > 0}
        />
        <View style={styles.gutter}>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyInline}>
              <View style={styles.emptyInlineIcon}>
                <Check size={16} color={colors.success} strokeWidth={2.5} />
              </View>
              <Text variant="bodySmall" weight="700" style={{ flex: 1 }}>
                You're all caught up
              </Text>
              <Text variant="micro" color="muted">No new requests</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {pendingRequests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  truncate={truncate}
                  onOpen={() => openRequestModal(request)}
                  onAccept={() => handleAccept(request.id)}
                  onReject={() => handleReject(request.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Active clients ----------------------------------- */}
        <SectionHeader
          label="ACTIVE CLIENTS"
          count={activeClients.length}
          actionLabel={activeClients.length > 0 ? 'See all' : undefined}
          onAction={() => navigation.navigate('TrainerRoot', { screen: 'Clients' })}
        />
        <View style={styles.gutter}>
          {activeClients.length === 0 ? (
            <View style={styles.emptyCardLarge}>
              <View style={styles.emptyCardIcon}>
                <Users size={22} color={colors.primary} strokeWidth={2.25} />
              </View>
              <Text variant="body" weight="800" align="center">No active clients yet</Text>
              <Text variant="micro" color="muted" align="center" style={styles.emptyCardHint}>
                Once trainees send a coaching request and you accept it, they'll appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {activeClients.slice(0, 5).map((cc, idx) => (
                <React.Fragment key={cc.coaching.id}>
                  {idx > 0 ? <View style={styles.listDivider} /> : null}
                  <ClientRow
                    info={cc}
                    onPress={() =>
                      navigation.navigate('ClientDetail', { coaching: cc.coaching, client: cc.client })
                    }
                  />
                </React.Fragment>
              ))}
              {activeClients.length > 5 ? (
                <>
                  <View style={styles.listDivider} />
                  <Pressable
                    onPress={() => navigation.navigate('TrainerRoot', { screen: 'Clients' })}
                    style={({ pressed }) => [styles.viewAllRow, pressed && { opacity: 0.7 }]}
                  >
                    <Text variant="bodySmall" weight="700" color="brand">
                      View all {activeClients.length} clients
                    </Text>
                    <ChevronRight size={14} color={colors.primary} strokeWidth={2.25} />
                  </Pressable>
                </>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Request detail modal --------------------------------- */}
      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="fade"
        onRequestClose={closeRequestModal}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalBackdrop} onPress={closeRequestModal} />
          <View style={[styles.modalCard, shadows.modal]}>
            {selectedRequest ? (
              <>
                <View style={styles.modalHeader}>
                  <Text variant="h3" weight="800">Coaching request</Text>
                  <IconButton variant="ghost" size="sm" withBorder onPress={closeRequestModal}>
                    <X size={16} color={colors.inkPrimary} strokeWidth={2.25} />
                  </IconButton>
                </View>

                <View style={styles.modalTraineeRow}>
                  <Avatar source={getUserAvatarSource(selectedRequest.trainee)} size="xl" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body" weight="800" numberOfLines={1}>
                      {selectedRequest.trainee?.displayName || 'New trainee'}
                    </Text>
                    <Text variant="micro" color="muted" numberOfLines={1}>
                      {selectedRequest.trainee?.email || 'No email provided'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalMessageBox}>
                  <Text variant="micro" weight="800" style={styles.modalMessageLabel}>
                    THEIR MESSAGE
                  </Text>
                  <Text variant="bodySmall" style={styles.modalMessageText}>
                    {selectedRequest.requestMessage || 'No message provided.'}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    label="Decline"
                    variant="ghost"
                    size="lg"
                    onPress={() => handleReject(selectedRequest.id)}
                    leftIcon={<X size={16} color={colors.inkSecondary} strokeWidth={2.25} />}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Accept"
                    variant="primary"
                    size="lg"
                    onPress={() => handleAccept(selectedRequest.id)}
                    leftIcon={<Check size={16} color={colors.white} strokeWidth={2.5} />}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}


function HeroStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.heroStat}>
      <Text mono tabular style={[styles.heroStatValue, accent && { color: colors.accent }]}>
        {value}
      </Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  label,
  count,
  accentCount,
  actionLabel,
  onAction,
}: {
  label: string;
  count?: number;
  accentCount?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleLeft}>
        <View style={styles.sectionBar} />
        <Text variant="caption" weight="800" style={styles.sectionLabelText}>
          {label}
        </Text>
        {count != null ? (
          <View style={[styles.sectionCount, accentCount && count > 0 && styles.sectionCountAccent]}>
            <Text
              variant="micro"
              weight="800"
              mono
              tabular
              style={[styles.sectionCountText, accentCount && count > 0 && { color: colors.white }]}
            >
              {count}
            </Text>
          </View>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={6}>
          <Text variant="micro" weight="800" color="brand" style={{ letterSpacing: 0.4 }}>
            {actionLabel.toUpperCase()}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, accent && styles.quickActionAccent, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.quickIcon, accent && styles.quickIconAccent]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1} style={{ letterSpacing: -0.1 }}>
          {label}
        </Text>
        <Text variant="micro" color="muted" numberOfLines={1}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function RequestCard({
  request,
  truncate,
  onOpen,
  onAccept,
  onReject,
}: {
  request: CoachingRequestWithTrainee;
  truncate: (s?: string | null, n?: number) => string;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.95 }]}
    >
      <View style={styles.requestDot} />
      <View style={styles.requestEyebrowPill}>
        <UserPlus size={11} color={colors.accent} strokeWidth={2.5} />
        <Text style={styles.requestEyebrowText}>NEW REQUEST</Text>
      </View>

      <View style={styles.requestBody}>
        <Avatar source={getUserAvatarSource(request.trainee)} size="xl" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" weight="800" numberOfLines={1} style={{ letterSpacing: -0.2 }}>
            {request.trainee?.displayName || 'New trainee'}
          </Text>
          <Text variant="micro" color="muted" style={styles.requestMessage}>
            {truncate(request.requestMessage, 90)}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Button
          label="Decline"
          variant="ghost"
          size="md"
          onPress={onReject}
          leftIcon={<X size={13} color={colors.inkSecondary} strokeWidth={2.5} />}
          style={{ flex: 1 }}
        />
        <Button
          label="Accept"
          variant="primary"
          size="md"
          onPress={onAccept}
          leftIcon={<Check size={13} color={colors.white} strokeWidth={2.5} />}
          style={{ flex: 1.2 }}
        />
      </View>
    </Pressable>
  );
}

function ClientRow({ info, onPress }: { info: ClientCoachingInfo; onPress: () => void }) {
  const daysSince = info.daysSinceLast;
  const overdue = daysSince == null || daysSince >= CHECK_IN_INTERVAL_DAYS;
  const progress =
    daysSince == null
      ? 1
      : Math.min(1, Math.max(0, daysSince / CHECK_IN_INTERVAL_DAYS));
  const daysLeft = daysSince == null ? null : Math.max(0, CHECK_IN_INTERVAL_DAYS - daysSince);
  const needsComment = info.coaching.checkIns.length > 0 && !info.coaching.checkIns.every(checkIn => checkIn.trainerComment?.text);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.clientRow, pressed && { opacity: 0.85 }]}
    >
      <Avatar source={getUserAvatarSource(info.client)} size="md" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1} style={{ letterSpacing: -0.1 }}>
          {info.client.displayName || 'Client'}
        </Text>
        <View style={styles.clientProgressRow}>
          <ProgressBar value={progress} style={{ flex: 1 }} height={4} />
        </View>
        <View style={styles.clientHintRow}>
          {overdue ? (
            <>
              <AlertCircle size={11} color={colors.accent} strokeWidth={2.5} />
              <Text variant="micro" weight="700" style={{ color: colors.accent }}>
                {daysSince == null ? 'No check-ins yet' : `Check-in overdue · ${daysSince}d`}
              </Text>
            </>
          ) : (
            <>
              <Clock size={11} color={colors.inkMuted} strokeWidth={2.25} />
              <Text variant="micro" color="muted" weight="600">
                {daysLeft === 0 ? 'Due today' : `${daysLeft}d until check-in`}
              </Text>
            </>
          )}
        </View>
        {needsComment ? (
          <View style={styles.clientCommentRow}>
            <AlertCircle size={11} color={colors.accent} strokeWidth={2.5} />
            <Text variant="micro" weight="700" style={{ color: colors.accent }}>
              Check-ins still need comments!
            </Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}


function getUserAvatarSource(user: User | null) {
  if (!user?.avatarUrl) return '';
  const url = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_ORIGIN}${user.avatarUrl}`;
  return { uri: url };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}

function formatTodayEyebrow() {
  const d = new Date();
  return d
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
    .toUpperCase();
}


function clientOverdueRank(c: ClientCoachingInfo): number {
  if (c.daysSinceLast == null) return 9999;
  return c.daysSinceLast;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 40 },
  gutter: { paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  bottomSpacer: { height: spacing.huge },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -130,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primaryDark,
    opacity: 0.35,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroName: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: colors.white,
  },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroAvatarRing: {
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  heroStat: { flex: 1, gap: 3 },
  heroStatValue: {
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.8,
    fontWeight: '800',
    color: colors.white,
  },
  heroStatLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: spacing.md,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabelText: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    marginLeft: 2,
  },
  sectionCountAccent: {
    backgroundColor: colors.accent,
  },
  sectionCountText: { color: colors.inkSecondary, fontSize: 10 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.xl },
  quickAction: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  quickActionAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconAccent: { backgroundColor: 'rgba(255,107,53,0.18)' },

  // Empty states
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  emptyInlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardLarge: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyCardHint: { lineHeight: 16, paddingHorizontal: spacing.lg },

  // Request card
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: spacing.md,
    position: 'relative',
  },
  requestDot: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  requestEyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,53,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  requestEyebrowText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  requestBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestMessage: { marginTop: 4, lineHeight: 15 },
  requestActions: { flexDirection: 'row', gap: spacing.sm },

  // Client list card
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  listDivider: { height: 1, backgroundColor: colors.line, marginLeft: spacing.lg + 36 + spacing.md },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  clientProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  clientHintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  clientCommentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },

  // Modal
  modalScrim: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTraineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  modalMessageBox: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    gap: 6,
  },
  modalMessageLabel: { fontSize: 10, letterSpacing: 0.8, color: colors.inkMuted },
  modalMessageText: { lineHeight: 19, color: colors.inkPrimary },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
