import { useNavigation } from '@react-navigation/native';
import { ChevronDown, ChevronLeft, SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import apiClient from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { ScreenHeader } from '../../components/layout';
import { Chip, IconButton, Screen, Text } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { User } from '../../types/types';
import { Trainer, TrainerListCard } from './TrainerListCard';


const FILTERS = ['Specialty', 'Price', 'Language'];

export function FindTrainerScreen() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [requestedTrainerIds, setRequestedTrainerIds] = useState<string[]>([]);
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const [trainersRes, coachingsRes] = await Promise.all([
          apiClient.get<User[]>('/user/trainers'),
          coachingApi.getMyCoachings(),
        ]);

        setTrainers(trainersRes.data.map(mapUserToTrainer));
        setRequestedTrainerIds(
          coachingsRes
            .filter(coaching => coaching.status === 'PENDING' || coaching.status === 'ACTIVE')
            .map(coaching => coaching.trainerId),
        );
      } catch (error) {
        console.error('Error fetching trainers:', error);
      }
    };
    fetchTrainers();
  }, []);

  const mapUserToTrainer = (user: User): Trainer => ({
    id: user.id,
    name: user.displayName,
    specialty: user.trainer?.specializations?.toString() ?? 'General Fitness',
    rating: 0,
    reviews: 0,
    priceFrom: null,
    bio: user.trainer?.bio ?? '',
    avatar: user.avatarUrl ?? null,
  });
  const navigation = useNavigation();
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <IconButton variant="surface" withBorder>
            <SlidersHorizontal size={15} color={colors.inkPrimary} strokeWidth={2} />
          </IconButton>
          {FILTERS.map(f => (
            <Chip
              key={f}
              label={f}
              rightIcon={<ChevronDown size={12} color={colors.inkMuted} strokeWidth={2} />}
            />
          ))}
        </ScrollView>

        <View style={[styles.gutter, styles.summaryRow]}>
          <Text variant="bodySmall" color="secondary">
            <Text variant="bodySmall" weight="600">
              {trainers.length}
            </Text>{' '}
            coaches available
          </Text>
          <Text variant="caption" color="brand">
            Top rated
          </Text>
        </View>

        <View style={[styles.gutter, styles.list]}>
          {trainers.map(t => (
            <TrainerListCard
              key={t.id}
              trainer={t}
              requestDisabled={requestedTrainerIds.includes(t.id)}
            />
          ))}
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
  filtersRow: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  gutter: { paddingHorizontal: spacing.xxl },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: { gap: spacing.lg },
});
