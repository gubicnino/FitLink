import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, Camera, ChevronLeft, HeartPulse, Scale, Smile, TrendingUp, UserRound } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { API_ORIGIN } from '@/api/apiClient';
import { checkInApi } from '@/api/checkInApi';
import { ScreenHeader } from '@/components/layout';
import { Avatar, Button, Card, IconButton, Screen, Tag, Text } from '@/components/ui';
import { useClientWeight } from '@/hooks/useClientWeight';
import type { RootStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/constants/theme';
import { CheckIn } from '@/types/checkin';
import { User } from '@/types/types';
import {
    formatDateLabel,
    formatRelativeDays,
    formatWeekRange,
    getAverageEnergy,
    getLatestCheckIn,
    getWeightChange,
    sortCheckInsNewestFirst,
} from '@/utils/clientCoaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = NativeStackScreenProps<RootStackParamList, 'ClientDetail'>;

const getUserAvatarSource = (user: User | null) => {
  if (!user?.avatarUrl) {
    return <UserRound color={colors.primary} strokeWidth={2} />;
  }

  const avatarUrl = user.avatarUrl.startsWith('http')
    ? user.avatarUrl
    : `${API_ORIGIN}${user.avatarUrl}`;

  return { uri: avatarUrl };
};

const getCheckInPhotos = (checkIn: CheckIn) => {
  if (checkIn.photoUrls?.length) {
    return checkIn.photoUrls;
  }

  if (checkIn.photoUrl) {
    return [checkIn.photoUrl];
  }

  return [];
};

const formatWeightChange = (delta: number | null) => {
  if (delta == null || Number.isNaN(delta)) {
    return 'No weight trend yet';
  }

  const formatted = `${Math.abs(delta).toFixed(1)} kg`;
  if (delta === 0) {
    return 'Weight stayed the same';
  }

  return delta > 0 ? `Up ${formatted}` : `Down ${formatted}`;
};

export function ClientDetailScreen() {
  const route = useAppRoute();
  const navigation = useAppNavigation();
  const { coaching, client } = route.params;
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [checkIns, setCheckIns] = useState<CheckIn[]>(coaching.checkIns);

  useEffect(() => {
    setCheckIns(coaching.checkIns);
  }, [coaching.checkIns]);

  const sortedCheckIns = useMemo(() => sortCheckInsNewestFirst(checkIns), [checkIns]);
  const latestCheckIn = useMemo(() => getLatestCheckIn(checkIns), [checkIns]);
  const averageEnergy = useMemo(() => getAverageEnergy(checkIns), [checkIns]);
  const weightDelta = useMemo(() => getWeightChange(checkIns), [checkIns]);
  // Preferiramo HC weight kda je connected in synced, fallbackamo na zadnji checkin weight.
  const hcWeight = useClientWeight(client.firebaseUid);
  const displayedWeightKg = hcWeight ?? latestCheckIn?.weightKg ?? null;

  const openCommentModal = (checkInId: string) => {
    setSelectedCheckInId(checkInId);
    setCommentText('');
    setCommentModalVisible(true);
  };

  const closeCommentModal = () => {
    setCommentModalVisible(false);
    setSelectedCheckInId(null);
    setCommentText('');
  };

  const handleSubmitComment = async () => {
    if (!selectedCheckInId) return;

    try {
      const updatedCheckIn = await checkInApi.addComment(selectedCheckInId, coaching.id, commentText);
      setCheckIns((current) =>
        current.map((checkIn) => (checkIn.id === updatedCheckIn.id ? updatedCheckIn : checkIn)),
      );
      closeCommentModal();
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        title={client.displayName}
        eyebrow="Client overview"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
        right={<Tag label="Active" tone="success" uppercase />}
      />

      <View style={styles.gutter}>
        <Card padding="md" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar source={getUserAvatarSource(client)} size="xxl" />
            <View style={styles.heroText}>
              <Text variant="h3">{client.displayName}</Text>
              <Text variant="bodySmall" color="secondary">
                {client.email}
              </Text>
              <Text variant="micro" color="secondary">
                Started {formatDateLabel(coaching.startedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Scale size={16} color={colors.primary} strokeWidth={2} />
              <Text variant="caption" color="muted">
                Latest weight
              </Text>
              <Text variant="body" weight="600">
                {displayedWeightKg != null ? `${displayedWeightKg.toFixed(1)} kg` : 'No data'}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Smile size={16} color={colors.accent} strokeWidth={2} />
              <Text variant="caption" color="muted">
                Avg. energy
              </Text>
              <Text variant="body" weight="600">
                {averageEnergy == null ? '-' : `${averageEnergy.toFixed(1)}/5`}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <TrendingUp size={16} color={colors.success} strokeWidth={2} />
              <Text variant="caption" color="muted">
                Weight trend
              </Text>
              <Text variant="body" weight="600">
                {formatWeightChange(weightDelta)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Camera size={16} color={colors.primaryDark} strokeWidth={2} />
              <Text variant="caption" color="muted">
                Check-ins
              </Text>
              <Text variant="body" weight="600">
                {checkIns.length}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              variant="primary"
              label="View workouts"
              leftIcon={<ArrowRight size={16} color={colors.white} strokeWidth={2.25} />}
              onPress={() => navigation.navigate('ClientWorkouts', { traineeId: client.firebaseUid })}
              style={styles.workoutsButton}
            />

            <Pressable
              onPress={() =>
                navigation.navigate('ClientHealth', {
                  traineeId: client.firebaseUid,
                  traineeName: client.displayName ?? 'Client',
                })
              }
              style={({ pressed }) => [styles.healthCard, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.healthIconWrap}>
                <HeartPulse size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.healthText}>
                <Text variant="bodySmall" weight="700">
                  Health data
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.cadenceRow}>
            <View style={styles.cadenceText}>
              <Text variant="caption" color="muted">
                Latest activity
              </Text>
              <Text variant="bodySmall" weight="600">
                {latestCheckIn ? formatRelativeDays(latestCheckIn.start) : 'No check-ins yet'}
              </Text>
            </View>
            <Tag label={latestCheckIn ? formatWeekRange(latestCheckIn.start) : 'No week yet'} tone="primary" />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="caption" color="muted">
            All check-ins
          </Text>
          <Text variant="caption" color="secondary">
            Newest first
          </Text>
        </View>

        {sortedCheckIns.length === 0 ? (
          <Card padding="lg">
            <Text variant="body" weight="600">
              No check-ins yet
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
              When this client submits a check-in, it will appear here.
            </Text>
          </Card>
        ) : (
          <View style={styles.checkInList}>
            {sortedCheckIns.map((checkIn, index) => {
              const photos = getCheckInPhotos(checkIn);
              const checkInKey = checkIn.id ?? checkIn.start ?? `checkin-${index}`;

              return (
                <Card key={checkInKey} padding="md" style={styles.checkInCard}>
                  <View style={styles.checkInHeader}>
                    <View style={styles.checkInHeaderText}>
                      <Text variant="body" weight="600">
                        {formatWeekRange(checkIn.start)}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        Submitted {formatRelativeDays(checkIn.createdAt)}
                      </Text>
                    </View>
                    <Tag label={`#${index + 1}`} tone={index === 0 ? 'primary' : 'neutral'} />
                  </View>

                  <View style={styles.checkInStats}>
                    <View style={styles.checkInStat}>
                      <Text variant="micro" color="secondary">
                        Weight
                      </Text>
                      <Text variant="bodySmall" weight="600">
                        {checkIn.weightKg != null ? `${checkIn.weightKg} kg` : 'Not saved'}
                      </Text>
                    </View>
                    <View style={styles.checkInStat}>
                      <Text variant="micro" color="secondary">
                        Energy
                      </Text>
                      <Text variant="bodySmall" weight="600">
                        {checkIn.overallEnergyLevel}/5
                      </Text>
                    </View>
                    <View style={styles.checkInStat}>
                      <Text variant="micro" color="secondary">
                        Photos
                      </Text>
                      <Text variant="bodySmall" weight="600">
                        {photos.length}
                      </Text>
                    </View>
                  </View>

                  {checkIn.note ? (
                    <View style={styles.noteBlock}>
                      <Text variant="caption" color="muted">
                        Notes
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {checkIn.note}
                      </Text>
                    </View>
                  ) : null}

                  {photos.length > 0 ? (
                    <View style={styles.photoStrip}>
                      {photos.slice(0, 3).map((photo, photoIndex) => {
                        const resolvedPhoto = photo.startsWith('http') ? photo : `${API_ORIGIN}${photo}`;
                        return (
                          <Image
                            key={`${checkIn.id}-${photoIndex}`}
                            source={{ uri: resolvedPhoto }}
                            style={styles.photoThumb}
                          />
                        );
                      })}
                      {photos.length > 3 ? (
                        <View style={styles.photoMoreBadge}>
                          <Text variant="micro" weight="600">
                            +{photos.length - 3}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {checkIn.trainerComment?.text ? (
                    <View style={styles.noteBlock}>
                      <Text variant="caption" color="muted">
                        Trainer's comment
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {checkIn.trainerComment.text}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      label="Add comment"
                      variant="outline"
                      onPress={() => checkIn.id && openCommentModal(checkIn.id)}
                      disabled={!checkIn.id}
                    />
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <Modal visible={commentModalVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeCommentModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text variant="h3">Add comment</Text>
            <Text variant="bodySmall" color="secondary" style={styles.modalSubtitle}>
              Leave a note for this check-in.
            </Text>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Type comment here"
              placeholderTextColor={colors.inkMuted}
              multiline
              style={styles.commentInput}
            />
            <View style={styles.modalActions}>
              <View style={styles.modalButton}>
                <Button label="Cancel" variant="outline" onPress={closeCommentModal} />
              </View>
              <View style={styles.modalButton}>
                <Button label="Submit" onPress={handleSubmitComment} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
  cadenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  cadenceText: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.xs,
  },
  checkInList: {
    gap: spacing.md,
  },
  checkInCard: {
    gap: spacing.md,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  checkInHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  checkInStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  checkInStat: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  workoutsButton: {
    
  },
  healthCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  healthIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  healthText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  noteBlock: {
    gap: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalSubtitle: {
    marginTop: -spacing.xs,
  },
  commentInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    color: colors.inkPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  photoMoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
