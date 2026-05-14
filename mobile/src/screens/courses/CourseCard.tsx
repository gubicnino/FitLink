import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from '../../components/ui';

export interface Course {
  id: string;
  title: string;
  author: string;
  duration: string;
  imageUrl: string;
}

interface CourseCardProps {
  course: Course;
  onPress?: () => void;
}

export function CourseCard({ course, onPress }: CourseCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: course.imageUrl }} style={styles.image} />
        <View style={styles.imageOverlay} />
        <View style={styles.durationPill}>
          <Text mono tabular style={styles.durationText}>
            {course.duration}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text variant="bodySmall" weight="600" numberOfLines={2} style={styles.title}>
          {course.title}
        </Text>
        <Text variant="micro" color="secondary">
          {course.author}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  imageWrap: { aspectRatio: 16 / 9, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  durationPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  durationText: { fontSize: 10, color: colors.white },
  body: { padding: spacing.md + 2 },
  title: { marginBottom: spacing.xs, lineHeight: 16 },
});
