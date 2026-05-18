import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Search, Star } from 'lucide-react-native';
import { colors, shadows, spacing } from '../../theme';
import {
  Avatar,
  BadgeCheck,
  Card,
  Chip,
  Dot,
  IconButton,
  Screen,
  Tag,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { CourseCard, Course } from './CourseCard';
import type { RootStackParamList } from '../../navigation/types';
import { CourseDto, courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import type { User } from '../../types/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['All', 'Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'] as const;
type Category = (typeof CATEGORIES)[number];

const COACH_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80&auto=format';

export function CourseListScreen() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState<Category>('All');
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const [nextCourses, nextUser] = await Promise.all([
            courseService.getAll(),
            authService.getUser(),
          ]);
          if (!active) return;
          setCourses(nextCourses);
          setUser(nextUser);
        } catch (error) {
          console.error('Course list load failed:', error);
        } finally {
          if (active) setIsLoading(false);
        }
      };

      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const visibleCourses = courses.filter(course => category === 'All' || course.category === category);
  const cards = visibleCourses.map(toCourseCard);
  const featured = visibleCourses[0];

  const pairs: Course[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    pairs.push(cards.slice(i, i + 2));
  }

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        title="Learn"
        right={
          <View style={styles.headerActions}>
            {user?.role === 'TRAINER' ? (
              <IconButton variant="surface" withBorder onPress={() => navigation.navigate('AddCourses')}>
                <Plus size={17} color={colors.inkPrimary} strokeWidth={2} />
              </IconButton>
            ) : null}
            <IconButton variant="surface" withBorder>
              <Search size={17} color={colors.inkPrimary} strokeWidth={2} />
            </IconButton>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map(c => (
          <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      <View style={[styles.gutter, styles.section]}>
        <Text variant="caption" color="muted" style={styles.label}>
          Featured
        </Text>
        {featured ? (
          <Card padding="none" onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}>
            <View style={styles.featuredImageWrap}>
              <Image source={{ uri: getImageUrl(featured) }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay} />
              <View style={styles.featuredTag}>
                <Tag label="Featured" tone="accent" uppercase />
              </View>
            </View>
            <View style={styles.featuredBody}>
              <Text variant="bodyLarge" weight="700" style={styles.featuredTitle}>
                {featured.title}
              </Text>
              <View style={styles.authorRow}>
                <Avatar source={COACH_IMG} size="xs" />
                <Text variant="micro" weight="500">
                  Coach
                </Text>
                <BadgeCheck size={13} />
              </View>
              <View style={styles.metaRow}>
                <Text variant="micro" color="secondary">
                  Video
                </Text>
                <Dot />
                <Text variant="micro" color="secondary">
                  {featured.level}
                </Text>
                <Dot />
                <View style={styles.ratingInline}>
                  <Star size={11} color={colors.warning} fill={colors.warning} strokeWidth={0} />
                  <Text variant="micro" color="secondary">
                    {' '}
                    {featured.stats?.avgRating?.toFixed(1) ?? '0.0'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              {isLoading ? 'Loading courses...' : 'No courses yet.'}
            </Text>
          </Card>
        )}
      </View>

      <View style={[styles.gutter, styles.section]}>
        <Text variant="caption" color="muted" style={styles.label}>
          Latest
        </Text>
        <View style={styles.grid}>
          {pairs.map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {pair.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                />
              ))}
              {pair.length === 1 ? <View style={styles.gridFiller} /> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xl },
  label: { marginBottom: spacing.md },

  featuredImageWrap: { height: 170, position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  featuredTag: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  featuredBody: { padding: spacing.xl, gap: spacing.md },
  featuredTitle: { lineHeight: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingInline: { flexDirection: 'row', alignItems: 'center' },

  grid: { gap: spacing.lg },
  gridRow: { flexDirection: 'row', gap: spacing.lg },
  gridFiller: { flex: 1 },

  bottomSpacer: { height: spacing.huge },
  headerActions: { flexDirection: 'row', gap: spacing.md },
});

function toCourseCard(course: CourseDto): Course {
  return {
    id: course.id,
    title: course.title,
    author: course.authorDisplayName ?? 'Coach',
    duration: 'Video',
    imageUrl: getImageUrl(course),
    category: course.category,
    level: course.level,
  };
}

function getImageUrl(course: CourseDto) {
  return course.thumbnailUrl || (course.youtubeVideoId ? `https://img.youtube.com/vi/${course.youtubeVideoId}/hqdefault.jpg` : FALLBACK_IMG);
}
