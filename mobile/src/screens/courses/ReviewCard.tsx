import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Pencil, Pin, Trash2 } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Avatar, Card, IconButton, StarRating, Text } from '../../components/ui';

export interface Review {
  id: string;
  name: string;
  stars: number;
  comment: string;
  avatarUrl: string;
  edited?: boolean;
  originalStars?: number | null;
  originalComment?: string | null;
  pinned?: boolean | null;
}

interface ReviewCardProps {
  review: Review;
  canEdit?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
}

export function ReviewCard({
  review,
  canEdit = false,
  canDelete = false,
  canPin = false,
  onEdit,
  onDelete,
  onTogglePin,
}: ReviewCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasOriginal = review.edited && Boolean(review.originalComment || review.originalStars);

  return (
    <Card padding="sm" style={review.pinned ? styles.pinnedCard : undefined}>
      <View style={styles.header}>
        <Avatar source={review.avatarUrl} size="sm" />
        <View style={styles.nameBlock}>
          <Text variant="bodySmall" weight="600">
            {review.name}
          </Text>
          {review.edited ? (
            <View style={styles.editedRow}>
              <Text variant="micro" color="muted">
                Edited
              </Text>
              {hasOriginal ? (
                <Pressable onPress={() => setShowOriginal(value => !value)} hitSlop={6}>
                  <Text variant="micro" style={styles.originalLink}>
                    {showOriginal ? 'Hide original' : 'See original'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {review.pinned ? (
            <View style={styles.pinnedRow}>
              <Pin size={10} color={colors.primary} fill={colors.primary} strokeWidth={2} />
              <Text variant="micro" color="brand" weight="700">
                Pinned by coach
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.flex} />
        <StarRating value={review.stars} size={11} />
        {canPin ? (
          <IconButton variant="ghost" onPress={onTogglePin}>
            <Pin
              size={14}
              color={review.pinned ? colors.primary : colors.inkSecondary}
              fill={review.pinned ? colors.primary : 'transparent'}
              strokeWidth={2}
            />
          </IconButton>
        ) : null}
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
      {showOriginal && hasOriginal ? (
        <View style={styles.originalBlock}>
          <View style={styles.originalHeader}>
            <Text variant="micro" color="muted" weight="700">
              Original review
            </Text>
            {review.originalStars ? <StarRating value={review.originalStars} size={10} /> : null}
          </View>
          {review.originalComment ? (
            <Text variant="bodySmall" color="secondary" style={styles.comment}>
              {review.originalComment}
            </Text>
          ) : null}
        </View>
      ) : null}
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
  editedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  originalLink: { color: colors.primary, fontWeight: '700' },
  flex: { flex: 1 },
  comment: { lineHeight: 18 },
  pinnedCard: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  originalBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    gap: spacing.sm,
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
