import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import {
  Avatar,
  BadgeCheck,
  Button,
  Card,
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
import { ALL_VALUE, FilterPickerSheet } from '../../components/filters/FilterPickerSheet';
import { API_ORIGIN } from '../../api/apiClient';
import { getAvatarUrl } from '../../utils/avatar';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'] as const;
type Category = (typeof CATEGORIES)[number] | typeof ALL_VALUE;
const COURSE_TYPES = ['VIDEO', 'ARTICLE', 'PDF'] as const;
type CourseTypeFilter = (typeof COURSE_TYPES)[number] | typeof ALL_VALUE;
const COURSE_VIEWS = [
  { label: 'All', value: 'ALL' },
  { label: 'Saved', value: 'SAVED' },
  { label: 'My courses', value: 'MINE' },
] as const;
type CourseView = (typeof COURSE_VIEWS)[number]['value'];
const SORT_OPTIONS = [
  { label: 'Newest', value: 'NEWEST' },
  { label: 'Best rated', value: 'RATED' },
  { label: 'Most reviewed', value: 'REVIEWED' },
  { label: 'Most completed', value: 'COMPLETED' },
] as const;
type CourseSort = (typeof SORT_OPTIONS)[number]['value'];

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80&auto=format';

export function CourseListScreen() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState<Category>(ALL_VALUE);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState<CourseTypeFilter>(ALL_VALUE);
  const [courseView, setCourseView] = useState<CourseView>('ALL');
  const [sortBy, setSortBy] = useState<CourseSort>('NEWEST');

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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const savedCourseIds = user?.savedCourseIds ?? [];
  const visibleCourses = useMemo(
    () => {
      const filtered = courses.filter(course => {
        const matchesView =
          courseView === 'SAVED'
            ? savedCourseIds.includes(course.id)
            : courseView === 'MINE'
              ? course.authorId === user?.firebaseUid
              : true;
        if (!matchesView) return false;

        const matchesCategory = category === ALL_VALUE || course.category === category;
        if (!matchesCategory) return false;

        const courseTypeLabel = getCourseTypeLabel(course.contentType);
        const matchesType = contentType === ALL_VALUE || courseTypeLabel === contentType;
        if (!matchesType) return false;

        if (!normalizedSearch) return true;

        return [
          course.title,
          course.description,
          course.articleContent,
          course.authorDisplayName,
          course.category,
          course.level,
          courseTypeLabel,
        ].some(value => value?.toString().toLowerCase().includes(normalizedSearch));
      });

      return filtered.sort((a, b) => compareCourses(a, b, sortBy));
    },
    [category, contentType, courseView, courses, normalizedSearch, savedCourseIds, sortBy, user?.firebaseUid],
  );

  const categoryOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All categories' },
      ...CATEGORIES.map(c => ({ value: c, label: c })),
    ],
    [],
  );
  const categoryLabel =
    category === ALL_VALUE
      ? 'Category'
      : (categoryOptions.find(o => o.value === category)?.label ?? 'Category');
  const hasSearch = normalizedSearch.length > 0;
  const emptyTitle = getEmptyTitle(hasSearch, courseView, category, contentType);
  const emptyHint = getEmptyHint(hasSearch, courseView, category, contentType);
  const cards = visibleCourses.map(toCourseCard);
  const featured = visibleCourses[0];
  const isEmpty = !isLoading && visibleCourses.length === 0;

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

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Search size={17} color={colors.inkMuted} strokeWidth={2.25} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search courses"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
              style={({ pressed }) => [styles.searchClear, pressed && { opacity: 0.55 }]}
            >
              <X size={16} color={colors.inkMuted} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.viewTabs}>
          {COURSE_VIEWS.filter(view => view.value !== 'MINE' || user?.role === 'TRAINER').map(view => {
            const selected = courseView === view.value;
            return (
              <Pressable
                key={view.value}
                onPress={() => setCourseView(view.value)}
                style={({ pressed }) => [
                  styles.viewTab,
                  selected && styles.viewTabActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text variant="micro" weight="700" style={{ color: selected ? colors.white : colors.inkSecondary }}>
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.typeChipsRow}>
          {[ALL_VALUE, ...COURSE_TYPES].map(type => {
            const selected = contentType === type;
            const label = type === ALL_VALUE ? 'All types' : type;
            return (
              <Pressable
                key={type}
                onPress={() => setContentType(type as CourseTypeFilter)}
                style={({ pressed }) => [
                  styles.typeChip,
                  selected && styles.typeChipActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text variant="micro" weight="700" style={{ color: selected ? colors.primary : colors.inkSecondary }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.sortRow}>
          <Text variant="micro" color="muted" weight="700" style={styles.sortLabel}>
            Sort
          </Text>
          <View style={styles.sortOptions}>
            {SORT_OPTIONS.map(option => {
              const selected = sortBy === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSortBy(option.value)}
                  style={({ pressed }) => [
                    styles.sortChip,
                    selected && styles.sortChipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text variant="micro" weight="700" style={{ color: selected ? colors.primary : colors.inkSecondary }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.filterPillsRow}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={4}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.pill,
              category !== ALL_VALUE && styles.pillActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <SlidersHorizontal size={14} color={colors.inkSecondary} strokeWidth={2.25} />
            <Text
              variant="bodySmall"
              weight="600"
              numberOfLines={1}
              style={[styles.pillLabel, category !== ALL_VALUE && { color: colors.primary }]}
            >
              {categoryLabel}
            </Text>
            <ChevronDown
              size={14}
              color={category !== ALL_VALUE ? colors.primary : colors.inkMuted}
              strokeWidth={2.25}
            />
          </Pressable>
          {category !== ALL_VALUE ? (
            <Pressable
              onPress={() => setCategory(ALL_VALUE)}
              hitSlop={6}
              style={({ pressed }) => [styles.clearAllBtn, pressed && { opacity: 0.5 }]}
              accessibilityLabel="Clear filter"
            >
              <Text variant="micro" weight="700" color="secondary">
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>

        {category !== ALL_VALUE ? (
          <View style={styles.activeChipsRow}>
            <Pressable
              onPress={() => setCategory(ALL_VALUE)}
              hitSlop={4}
              accessibilityLabel={`Remove ${categoryLabel} filter`}
              style={({ pressed }) => [styles.activeChip, pressed && { opacity: 0.7 }]}
            >
              <Text variant="micro" weight="700" style={{ color: colors.primary }}>
                {categoryLabel}
              </Text>
              <X size={12} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View style={[styles.gutter, styles.section]}>
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              Loading courses...
            </Text>
          </Card>
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <BookOpen size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="h3" weight="700" align="center">
            {emptyTitle}
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.emptyHint}>
            {emptyHint}
          </Text>
          {user?.role === 'TRAINER' ? (
            <Button
              label="Add course"
              variant="primary"
              size="md"
              leftIcon={<Plus size={15} color={colors.white} strokeWidth={2.5} />}
              onPress={() => navigation.navigate('AddCourses')}
              style={styles.emptyCta}
            />
          ) : null}
        </View>
      ) : null}

      {!isLoading && !isEmpty ? (
        <View style={[styles.gutter, styles.section]}>
          <Text variant="caption" color="muted" style={styles.label}>
            Featured
          </Text>
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
                <Avatar source={getAvatarUrl(featured.authorAvatarUrl)} size="xs" />
                <Text variant="micro" weight="500">
                  Coach
                </Text>
                <BadgeCheck size={13} />
              </View>
              <View style={styles.metaRow}>
                <Text variant="micro" color="secondary">
                  {getCourseTypeLabel(featured.contentType)}
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
        </View>
      ) : null}

      {!isLoading && !isEmpty ? (
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
      ) : null}

      <View style={styles.bottomSpacer} />

      <FilterPickerSheet
        visible={pickerOpen}
        title="Category"
        subtitle="Filter courses by topic"
        options={categoryOptions}
        value={category}
        onSelect={next => {
          setCategory(next as Category);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.inkPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewTab: {
    minHeight: 34,
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  viewTabActive: {
    borderColor: colors.inkPrimary,
    backgroundColor: colors.inkPrimary,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  typeChipActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  sortRow: {
    gap: spacing.sm,
  },
  sortLabel: {
    paddingHorizontal: spacing.xs,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sortChip: {
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sortChipActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    maxWidth: 220,
  },
  pillActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  pillLabel: { flexShrink: 1 },
  clearAllBtn: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoftStrong,
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
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: { paddingHorizontal: spacing.xl, maxWidth: 320 },
  emptyCta: { marginTop: spacing.lg },
});

function toCourseCard(course: CourseDto): Course {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    author: course.authorDisplayName ?? 'Coach',
    type: getCourseTypeLabel(course.contentType),
    imageUrl: getImageUrl(course),
    category: course.category,
    level: course.level,
  };
}

function getImageUrl(course: CourseDto) {
  if (course.thumbnailUrl) {
    return course.thumbnailUrl.startsWith('/uploads/')
      ? `${API_ORIGIN}${course.thumbnailUrl}`
      : course.thumbnailUrl;
  }
  return course.youtubeVideoId ? `https://img.youtube.com/vi/${course.youtubeVideoId}/hqdefault.jpg` : FALLBACK_IMG;
}

function getCourseTypeLabel(contentType?: string | null) {
  if (contentType === 'PDF') return 'PDF';
  if (contentType === 'ARTICLE' || contentType === 'ARTICLE_LINK') return 'ARTICLE';
  return 'VIDEO';
}

function compareCourses(a: CourseDto, b: CourseDto, sortBy: CourseSort) {
  if (sortBy === 'RATED') {
    return (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0);
  }
  if (sortBy === 'REVIEWED') {
    return (b.stats?.ratingsCount ?? 0) - (a.stats?.ratingsCount ?? 0);
  }
  if (sortBy === 'COMPLETED') {
    return (b.stats?.completionsCount ?? 0) - (a.stats?.completionsCount ?? 0);
  }

  return getTime(b.publishedAt) - getTime(a.publishedAt);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getEmptyTitle(
  hasSearch: boolean,
  courseView: CourseView,
  category: Category,
  contentType: CourseTypeFilter,
) {
  if (hasSearch) return 'No courses found';
  if (courseView === 'SAVED') return 'No saved courses yet';
  if (courseView === 'MINE') return 'No courses created yet';
  if (contentType !== ALL_VALUE) return `No ${contentType.toLowerCase()} courses yet`;
  if (category !== ALL_VALUE) return `No ${category.toLowerCase()} courses yet`;
  return 'No courses yet';
}

function getEmptyHint(
  hasSearch: boolean,
  courseView: CourseView,
  category: Category,
  contentType: CourseTypeFilter,
) {
  if (hasSearch) return 'Try a different title, coach, category, level, or course type.';
  if (courseView === 'SAVED') return 'Tap the bookmark on a course to save it here.';
  if (courseView === 'MINE') return 'Courses you create as a trainer will appear here.';
  if (contentType !== ALL_VALUE || category !== ALL_VALUE) {
    return 'Try another filter or check back when more courses are added.';
  }
  return 'Courses from trainers will appear here once they are published.';
}
