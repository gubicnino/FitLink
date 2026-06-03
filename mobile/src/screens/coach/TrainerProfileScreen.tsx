import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Mail, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { userApi } from '../../api/userApi';
import { ScreenHeader } from '../../components/layout';
import { Avatar, BadgeCheck, Card, IconButton, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { CourseDto, courseService } from '../../services/courseService';
import { colors, spacing } from '../../theme';
import type { User } from '../../types/types';
import { getAvatarUrl } from '../../utils/avatar';
import { Course, CourseCard } from '../courses/CourseCard';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerProfile'>;

const FALLBACK_COURSE_IMG =
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80&auto=format';

export function TrainerProfileScreen({ navigation, route }: Props) {
  const [trainer, setTrainer] = useState<User | null>(null);
  const [trainerCourses, setTrainerCourses] = useState<CourseDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrainer = async () => {
      const trainerId = route.params?.trainerId;
      if (!trainerId) {
        setError('Trainer profile could not be loaded.');
        return;
      }

      try {
        const nextTrainer = await userApi.getUserByFirebaseUid(trainerId);
        setTrainer(nextTrainer);
        await loadTrainerCourses(nextTrainer);
      } catch (firebaseError) {
        try {
          const nextTrainer = await userApi.getUserById(trainerId);
          setTrainer(nextTrainer);
          await loadTrainerCourses(nextTrainer);
        } catch (idError) {
          console.error('Trainer profile load failed:', idError);
          setError('Trainer profile could not be loaded.');
        }
      }
    };

    loadTrainer();
  }, [route.params?.trainerId]);

  const loadTrainerCourses = async (nextTrainer: User) => {
    try {
      const allCourses = await courseService.getAll();
      const trainerIds = [nextTrainer.firebaseUid, nextTrainer.id].filter(Boolean);
      setTrainerCourses(allCourses.filter(course => trainerIds.includes(course.authorId)));
    } catch (courseError) {
      console.error('Trainer courses load failed:', courseError);
      setTrainerCourses([]);
    }
  };

  const specializations = trainer?.trainer?.specializations?.filter(Boolean) ?? [];
  const trainerLocation = trainer?.trainer?.location?.trim();
  const courseCards = trainerCourses.map(toCourseCard);
  const coursePairs: Course[][] = [];
  for (let i = 0; i < courseCards.length; i += 2) {
    coursePairs.push(courseCards.slice(i, i + 2));
  }

  return (
    <Screen scroll edges={['top']} background="surface">
      <ScreenHeader
        title="Coach profile"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <View style={styles.content}>
        {error ? (
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              {error}
            </Text>
          </Card>
        ) : (
          <>
            <Card padding="lg">
              <View style={styles.headerRow}>
                <Avatar source={getAvatarUrl(trainer?.avatarUrl)} size="xxl" />
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text variant="h3">{trainer?.displayName ?? 'Coach'}</Text>
                    {trainer?.trainer?.verificationStatus === 'APPROVED' ? <BadgeCheck size={16} /> : null}
                  </View>
                  <View style={styles.emailRow}>
                    <Mail size={13} color={colors.inkSecondary} strokeWidth={2} />
                    <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                      {trainer?.email ?? 'No email available'}
                    </Text>
                  </View>
                  {trainerLocation ? (
                    <View style={styles.emailRow}>
                      <MapPin size={13} color={colors.inkSecondary} strokeWidth={2} />
                      <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                        {trainerLocation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>

            <Card padding="md">
              <Text variant="caption" color="muted" style={styles.sectionLabel}>
                Bio
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.bodyText}>
                {trainer?.trainer?.bio || 'This coach has not added a bio yet.'}
              </Text>
            </Card>

            <Card padding="md">
              <Text variant="caption" color="muted" style={styles.sectionLabel}>
                Specializations
              </Text>
              <View style={styles.specializations}>
                {specializations.length > 0 ? (
                  specializations.map(item => (
                    <View key={item} style={styles.specializationPill}>
                      <Text variant="caption" color="brand" weight="600">
                        {item}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text variant="bodySmall" color="secondary">
                    No specializations listed.
                  </Text>
                )}
              </View>
            </Card>

            <View style={styles.coursesSection}>
              <View style={styles.sectionHeader}>
                <Text variant="caption" color="muted" style={styles.sectionLabel}>
                  Courses by this coach
                </Text>
                <Text variant="micro" color="secondary" mono tabular>
                  {trainerCourses.length}
                </Text>
              </View>
              {trainerCourses.length > 0 ? (
                <View style={styles.courseGrid}>
                  {coursePairs.map((pair, rowIdx) => (
                    <View key={rowIdx} style={styles.courseRow}>
                      {pair.map(course => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                        />
                      ))}
                      {pair.length === 1 ? <View style={styles.courseFiller} /> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Card padding="md">
                  <Text variant="bodySmall" color="secondary">
                    This coach has not published courses yet.
                  </Text>
                </Card>
              )}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function toCourseCard(course: CourseDto): Course {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    author: course.authorDisplayName ?? 'Coach',
    type: getCourseTypeLabel(course.contentType),
    imageUrl: getCourseImageUrl(course),
    category: course.category,
    level: course.level,
    publishedAt: course.publishedAt,
  };
}

function getCourseImageUrl(course: CourseDto) {
  if (course.thumbnailUrl) {
    return course.thumbnailUrl.startsWith('/uploads/')
      ? `${API_ORIGIN}${course.thumbnailUrl}`
      : course.thumbnailUrl;
  }
  return course.youtubeVideoId
    ? `https://img.youtube.com/vi/${course.youtubeVideoId}/hqdefault.jpg`
    : FALLBACK_COURSE_IMG;
}

function getCourseTypeLabel(contentType?: string | null) {
  if (contentType === 'PDF') return 'PDF';
  if (contentType === 'ARTICLE' || contentType === 'ARTICLE_LINK') return 'ARTICLE';
  return 'VIDEO';
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLabel: { marginBottom: spacing.sm },
  bodyText: { lineHeight: 18 },
  specializations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specializationPill: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  coursesSection: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseGrid: {
    gap: spacing.lg,
  },
  courseRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  courseFiller: {
    flex: 1,
  },
});
