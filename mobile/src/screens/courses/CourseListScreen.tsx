import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Play, Search, Star } from 'lucide-react-native';
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

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['All', 'Strength', 'Nutrition', 'Mobility', 'Mindset'] as const;
type Category = (typeof CATEGORIES)[number];

const FEATURED_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';
const COACH_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format';

const COURSES: Course[] = [
  { id: '1', title: 'Progressive Overload Explained', author: 'Tomaž Horvat', duration: '8 min', imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80&auto=format' },
  { id: '2', title: 'Macro Tracking for Beginners', author: 'Nina Zupančič', duration: '14 min', imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80&auto=format' },
  { id: '3', title: 'Mobility Routine: Hips', author: 'Eva Petrič', duration: '10 min', imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80&auto=format' },
  { id: '4', title: 'How to Deadlift Safely', author: 'Luka Krajnc', duration: '15 min', imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80&auto=format' },
  { id: '5', title: 'Sleep & Recovery', author: 'Maja Kovač', duration: '11 min', imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=400&q=80&auto=format' },
  { id: '6', title: 'Mindset for Long-Term Gains', author: 'Matej Hribar', duration: '9 min', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&auto=format' },
];

export function CourseListScreen() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState<Category>('All');

  const pairs: Course[][] = [];
  for (let i = 0; i < COURSES.length; i += 2) {
    pairs.push(COURSES.slice(i, i + 2));
  }

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        title="Learn"
        right={
          <IconButton variant="surface" withBorder>
            <Search size={17} color={colors.inkPrimary} strokeWidth={2} />
          </IconButton>
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
        <Card padding="none">
          <View style={styles.featuredImageWrap}>
            <Image source={{ uri: FEATURED_IMG }} style={styles.featuredImage} />
            <View style={styles.featuredOverlay} />
            <View style={[styles.playButton, shadows.modal]}>
              <Play size={22} color={colors.inkPrimary} fill={colors.inkPrimary} strokeWidth={0} />
            </View>
            <View style={styles.featuredTag}>
              <Tag label="Featured" tone="accent" uppercase />
            </View>
          </View>
          <View style={styles.featuredBody}>
            <Text variant="bodyLarge" weight="700" style={styles.featuredTitle}>
              Complete Push Pull Legs Guide
            </Text>
            <View style={styles.authorRow}>
              <Avatar source={COACH_IMG} size="xs" />
              <Text variant="micro" weight="500">
                Coach Maja Kovač
              </Text>
              <BadgeCheck size={13} />
            </View>
            <View style={styles.metaRow}>
              <Text variant="micro" color="secondary">
                12 min
              </Text>
              <Dot />
              <Text variant="micro" color="secondary">
                Beginner
              </Text>
              <Dot />
              <View style={styles.ratingInline}>
                <Star size={11} color={colors.warning} fill={colors.warning} strokeWidth={0} />
                <Text variant="micro" color="secondary">
                  {' '}
                  4.8
                </Text>
              </View>
            </View>
          </View>
        </Card>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 56,
    height: 56,
    marginLeft: -28,
    marginTop: -28,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
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
});
