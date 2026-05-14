import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Chip, IconButton, Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { TrainerListCard, Trainer } from './TrainerListCard';

const TRAINERS: Trainer[] = [
  {
    id: '1',
    name: 'Maja Kovač',
    specialty: 'Strength • Powerlifting',
    rating: 4.9,
    reviews: 24,
    priceFrom: '€50',
    bio: 'Certified PT with 5 years experience. Powerlifter, focused on technique and sustainable progression.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format',
  },
  {
    id: '2',
    name: 'Tomaž Horvat',
    specialty: 'Hypertrophy • Bodybuilding',
    rating: 4.8,
    reviews: 31,
    priceFrom: '€45',
    bio: 'Former competitor. 8 years coaching. Specializes in physique transformation and contest prep.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format',
  },
  {
    id: '3',
    name: 'Eva Petrič',
    specialty: 'Mobility • Rehab',
    rating: 5.0,
    reviews: 18,
    priceFrom: '€55',
    bio: 'Physio + PT. Works with lifters recovering from injury and athletes improving range of motion.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format',
  },
  {
    id: '4',
    name: 'Luka Krajnc',
    specialty: 'Conditioning • CrossFit',
    rating: 4.7,
    reviews: 42,
    priceFrom: '€40',
    bio: 'CrossFit L2 coach. 6 years experience programming for general and competitive athletes.',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&q=80&auto=format',
  },
];

const FILTERS = ['Specialty', 'Price', 'Language'];

export function FindTrainerScreen() {
  const navigation = useNavigation();
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        title="Find your coach"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

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
            24
          </Text>{' '}
          coaches in Slovenia
        </Text>
        <Text variant="caption" color="brand">
          Top rated
        </Text>
      </View>

      <View style={[styles.gutter, styles.list]}>
        {TRAINERS.map(t => (
          <TrainerListCard key={t.id} trainer={t} />
        ))}
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  bottomSpacer: { height: spacing.huge },
});
