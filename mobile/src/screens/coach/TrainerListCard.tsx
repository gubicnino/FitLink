import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Avatar, BadgeCheck, Button, Card, Dot, Text } from '../../components/ui';

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  priceFrom: string;
  bio: string;
  avatar: string;
}

interface TrainerListCardProps {
  trainer: Trainer;
  onPress?: () => void;
}

export function TrainerListCard({ trainer, onPress }: TrainerListCardProps) {
  return (
    <Card padding="md" radius="xl">
      <View style={styles.row}>
        <Avatar source={trainer.avatar} size="xxl" rounded="lg" />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="bodyLarge" weight="700" numberOfLines={1}>
              {trainer.name}
            </Text>
            <BadgeCheck size={15} />
          </View>
          <Text variant="bodySmall" color="secondary" style={styles.specialty}>
            {trainer.specialty}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.ratingInline}>
              <Star size={12} color={colors.warning} fill={colors.warning} strokeWidth={0} />
              <Text mono tabular weight="700" variant="micro">
                {' '}
                {trainer.rating}
              </Text>
              <Text variant="micro" color="secondary">
                {' '}
                ({trainer.reviews})
              </Text>
            </View>
            <Dot />
            <Text variant="micro" color="secondary">
              From{' '}
              <Text mono tabular variant="micro" weight="600">
                {trainer.priceFrom}
              </Text>
              /mo
            </Text>
          </View>
        </View>
      </View>

      <Text variant="bodySmall" color="secondary" style={styles.bio}>
        {trainer.bio}
      </Text>

      <Button label="View profile" variant="outline" size="md" fullWidth onPress={onPress} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  specialty: { marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingInline: { flexDirection: 'row', alignItems: 'center' },
  bio: { lineHeight: 18, marginBottom: spacing.lg },
});
