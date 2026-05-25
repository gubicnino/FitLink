import { ChevronRight } from 'lucide-react-native/icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { Tag } from './Tag';
import { Text } from './Text';

interface CheckInCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  tagLabel?: string;
  tagTone?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'overlay' | 'dark';
  variant?: 'default' | 'primary';
}

export function CheckInCard({
  title,
  subtitle,
  onPress,
  tagLabel,
  tagTone = 'warning',
  variant = 'default',
}: CheckInCardProps) {
  const highlighted = variant === 'primary';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listRow,
        highlighted && styles.listRowPrimary,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <View style={styles.flex}>
        <Text variant="body" weight="600" style={highlighted ? styles.primaryTitle : undefined}>
          {title}
        </Text>
        <Text variant="bodySmall" color={highlighted ? 'muted' : 'secondary'} style={highlighted ? styles.primarySubtitle : undefined}>
          {subtitle}
        </Text>
      </View>
      {tagLabel && (
        <Tag label={tagLabel} tone={tagTone} />
      )}
      <ChevronRight size={18} color={highlighted ? '#FFFFFF' : colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
  },
  listRowPrimary: {
    backgroundColor: colors.primary,
  },
  flex: { flex: 1 },
  primaryTitle: {
    color: '#FFFFFF',
  },
  primarySubtitle: {
    color: '#FFFFFF',
  },
});

export default CheckInCard;