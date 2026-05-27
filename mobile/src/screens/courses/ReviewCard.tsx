import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Avatar, Card, IconButton, StarRating, Text } from '../../components/ui';

export interface Review {
  id: string;
  name: string;
  stars: number;
  comment: string;
  avatarUrl: string;
  edited?: boolean;
}

interface ReviewCardProps {
  review: Review;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({ review, canEdit = false, canDelete = false, onEdit, onDelete }: ReviewCardProps) {
  return (
    <Card padding="sm">
      <View style={styles.header}>
        <Avatar source={review.avatarUrl} size="sm" />
        <View style={styles.nameBlock}>
          <Text variant="bodySmall" weight="600">
            {review.name}
          </Text>
          {review.edited ? (
            <Text variant="micro" color="muted">
              Edited
            </Text>
          ) : null}
        </View>
        <View style={styles.flex} />
        <StarRating value={review.stars} size={11} />
        {canEdit ? (
          <IconButton variant="ghost" onPress={onEdit}>
            <Pencil size={14} color={colors.inkSecondary} strokeWidth={2} />
          </IconButton>
        ) : null}
        {canDelete ? (
          <IconButton variant="ghost" onPress={onDelete}>
            <Trash2 size={14} color={colors.danger} strokeWidth={2} />
          </IconButton>
        ) : null}
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
  nameBlock: { flexShrink: 1 },
  flex: { flex: 1 },
  comment: { lineHeight: 18 },
});
