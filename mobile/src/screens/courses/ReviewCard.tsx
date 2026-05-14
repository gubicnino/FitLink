import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Avatar, Card, StarRating, Text } from '../../components/ui';

export interface Review {
  id: string;
  name: string;
  stars: number;
  comment: string;
  avatarUrl: string;
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card padding="sm">
      <View style={styles.header}>
        <Avatar source={review.avatarUrl} size="sm" />
        <Text variant="bodySmall" weight="600">
          {review.name}
        </Text>
        <View style={styles.flex} />
        <StarRating value={review.stars} size={11} />
      </View>
      <Text variant="bodySmall" color="secondary" style={styles.comment}>
        {review.comment}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  flex: { flex: 1 },
  comment: { lineHeight: 18 },
});
