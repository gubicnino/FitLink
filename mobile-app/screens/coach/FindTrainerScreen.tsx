import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MapPin, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import apiClient from '@/api/apiClient';
import { coachingApi } from '@/api/coachingApi';
import { ScreenHeader } from '@/components/layout';
import { IconButton, Screen, Text } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, spacing } from '@/constants/theme';
import { User } from '@/types/types';
import { Trainer, TrainerListCard } from './TrainerListCard';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function FindTrainerScreen() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [requestedTrainerIdentifiers, setRequestedTrainerIdentifiers] = useState<string[]>([]);
  const [interestQuery, setInterestQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  const fetchTrainers = async () => {
    try {
      const [trainersRes, coachingsRes] = await Promise.all([
        apiClient.get<User[]>('/user/trainers'),
        coachingApi.getMyCoachings(),
      ]);

      setTrainers(trainersRes.data.map(mapUserToTrainer));
      setRequestedTrainerIdentifiers(
        coachingsRes
          .filter(coaching => coaching.status === 'PENDING' || coaching.status === 'ACTIVE')
          .map(coaching => coaching.trainerId),
      );
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const mapUserToTrainer = (user: User): Trainer => ({
    id: user.id,
    name: user.displayName,
    firebaseUid: user.firebaseUid,
    specialty: user.trainer?.specializations?.toString() ?? 'General Fitness',
    rating: 0,
    reviews: 0,
    priceFrom: null,
    bio: user.trainer?.bio ?? '',
    location: user.trainer?.location ?? null,
    avatar: user.avatarUrl ?? null,
  });
  const navigation = useAppNavigation();

  const normalizedInterest = interestQuery.trim().toLowerCase();
  const normalizedLocation = locationQuery.trim().toLowerCase();
  const filteredTrainers = trainers.filter(trainer => {
    const interestText = [
      trainer.name,
      trainer.specialty,
      trainer.bio,
    ].join(' ').toLowerCase();
    const locationText = (trainer.location ?? '').toLowerCase();

    return (
      (!normalizedInterest || interestText.includes(normalizedInterest)) &&
      (!normalizedLocation || locationText.includes(normalizedLocation))
    );
  });

  return (
    <Screen edges={['top']} contentStyle={styles.screen}>
      <ScreenHeader
        title="Find your coach"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <View style={styles.body}>
        <View style={[styles.gutter, styles.searchPanel]}>
          <View style={styles.searchHeader}>
            <SlidersHorizontal size={15} color={colors.inkPrimary} strokeWidth={2} />
            <Text variant="caption" color="muted" weight="700">
              Filters
            </Text>
          </View>
          <View style={styles.searchField}>
            <Search size={16} color={colors.inkMuted} strokeWidth={2} />
            <TextInput
              value={interestQuery}
              onChangeText={setInterestQuery}
              placeholder="Interest or specialization"
              placeholderTextColor={colors.inkMuted}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.searchField}>
            <MapPin size={16} color={colors.inkMuted} strokeWidth={2} />
            <TextInput
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholder="Location"
              placeholderTextColor={colors.inkMuted}
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={[styles.gutter, styles.summaryRow]}>
          <Text variant="bodySmall" color="secondary">
            <Text variant="bodySmall" weight="600">
              {filteredTrainers.length}
            </Text>{' '}
            coaches available
          </Text>
          <Text variant="caption" color="brand">
            Top rated
          </Text>
        </View>

        <View style={[styles.gutter, styles.list]}>
          {filteredTrainers.length > 0 ? (
            filteredTrainers.map(t => (
              <TrainerListCard
                key={t.id}
                trainer={t}
                onPress={() => navigation.navigate('TrainerProfile', { trainerId: t.firebaseUid || t.id })}
                onRequestSent={fetchTrainers}
                requestDisabled={
                  requestedTrainerIdentifiers.includes(t.firebaseUid) ||
                  requestedTrainerIdentifiers.includes(t.id)
                }
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text variant="body" weight="700">
                No coaches found
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
                Try another specialization or location.
              </Text>
            </View>
          )}
        </View>
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flexDirection: 'column',
  },
  gutter: { paddingHorizontal: spacing.xxl },
  searchPanel: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchField: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.inkPrimary,
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: { gap: spacing.lg },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { lineHeight: 18 },
});
