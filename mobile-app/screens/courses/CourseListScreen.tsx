import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native';
import { colors, radii, spacing } from '@/constants/theme';
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
} from '@/components/ui';
import { ScreenHeader } from '@/components/layout';
import { CourseCard, Course } from './CourseCard';
import type { RootStackParamList } from '@/navigation/types';
import { CourseDto, courseService } from '@/services/courseService';
import { authService } from '@/services/authService';
import type { User } from '@/types/types';
import { ALL, CourseFilterSheet, CourseFilterValues } from '@/components/filters/CourseFilterSheet';
import { API_ORIGIN } from '@/api/apiClient';
import { getAvatarUrl } from '@/utils/avatar';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'] as const;
const COURSE_TYPES = ['VIDEO', 'ARTICLE', 'PDF'] as const;

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

const DEFAULT_SORT: CourseSort = 'NEWEST';

export function CourseListScreen() {
  const navigation = useAppNavigation();
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseView, setCourseView] = useState<CourseView>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<string>(ALL);
  const [contentType, setContentType] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<CourseSort>(DEFAULT_SORT);

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
      return () => { active = false; };
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

        const matchesCategory = category === ALL || course.category === category;
        if (!matchesCategory) return false;

        const courseTypeLabel = getCourseTypeLabel(course.contentType);
        const matchesType = contentType === ALL || courseTypeLabel === contentType;
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
    () => [{ value: ALL, label: 'All' }, ...CATEGORIES.map(c => ({ value: c, label: c }))],
    [],
  );
  const contentTypeOptions = useMemo(
    () => [
      { value: ALL, label: 'All' },
      ...COURSE_TYPES.map(t => ({
        value: t,
        label: t.charAt(0) + t.slice(1).toLowerCase(),
      })),
    ],
    [],
  );

  const availableViews = useMemo(
    () => COURSE_VIEWS.filter(v => v.value !== 'MINE' || user?.role === 'TRAINER'),
    [user?.role],
  );

  const activeFilterCount =
    (category === ALL ? 0 : 1) + (contentType === ALL ? 0 : 1) + (sortBy === DEFAULT_SORT ? 0 : 1);
  const hasActiveFilters = activeFilterCount > 0;

  const hasSearch = normalizedSearch.length > 0;
  const cards = visibleCourses.map(toCourseCard);
  const featured = visibleCourses[0];
  const isEmpty = !isLoading && visibleCourses.length === 0;
  const emptyTitle = getEmptyTitle(hasSearch, courseView, category, contentType);
  const emptyHint = getEmptyHint(hasSearch, courseView, category, contentType);

  const pairs: Course[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    pairs.push(cards.slice(i, i + 2));
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Newest';

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
          </View>
        }
      />

      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
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

          <Pressable
            onPress={() => setFilterOpen(true)}
            style={({ pressed }) => [
              styles.filterBtn,
              hasActiveFilters && styles.filterBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <SlidersHorizontal
              size={17}
              color={hasActiveFilters ? colors.primary : colors.inkSecondary}
              strokeWidth={2.25}
            />
            {hasActiveFilters ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.segment}>
          {availableViews.map(view => {
            const selected = courseView === view.value;
            return (
              <Pressable
                key={view.value}
                onPress={() => setCourseView(view.value)}
                style={[styles.segmentItem, selected && styles.segmentItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  variant="bodySmall"
                  weight={selected ? '800' : '600'}
                  style={{ color: selected ? colors.inkPrimary : colors.inkMuted, letterSpacing: 0.1 }}
                >
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasActiveFilters ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeChipsRow}
          >
            {contentType !== ALL ? (
              <ActiveChip
                label={capitalize(contentType)}
                onClear={() => setContentType(ALL)}
              />
            ) : null}
            {category !== ALL ? (
              <ActiveChip
                label={category}
                onClear={() => setCategory(ALL)}
              />
            ) : null}
            {sortBy !== DEFAULT_SORT ? (
              <ActiveChip
                label={`Sort: ${sortLabel}`}
                onClear={() => setSortBy(DEFAULT_SORT)}
              />
            ) : null}
            <Pressable
              onPress={() => {
                setContentType(ALL);
                setCategory(ALL);
                setSortBy(DEFAULT_SORT);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.clearAll, pressed && { opacity: 0.6 }]}
            >
              <Text variant="micro" weight="700" color="muted">
                Clear all
              </Text>
            </Pressable>
          </ScrollView>
        ) : null}
      </View>

      {isLoading ? (
        <View style={[styles.gutter, styles.section]}>
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">Loading courses...</Text>
          </Card>
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <BookOpen size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="h3" weight="800" align="center">{emptyTitle}</Text>
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
          <SectionHeader label="FEATURED" />
          <Card padding="none" onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}>
            <View style={styles.featuredImageWrap}>
              <Image source={{ uri: getImageUrl(featured) }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay} />
              <View style={styles.featuredTag}>
                <Tag label="Featured" tone="accent" uppercase />
              </View>
            </View>
            <View style={styles.featuredBody}>
              <Text variant="bodyLarge" weight="800" style={styles.featuredTitle}>
                {featured.title}
              </Text>
              <View style={styles.authorRow}>
                <Avatar source={getAvatarUrl(featured.authorAvatarUrl)} size="xs" />
                <Text variant="micro" weight="600">
                  {featured.authorDisplayName ?? 'Coach'}
                </Text>
                <BadgeCheck size={13} />
              </View>
              <View style={styles.metaRow}>
                <Text variant="micro" color="secondary" weight="600">
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
                    {' '}{featured.stats?.avgRating?.toFixed(1) ?? '0.0'}
                  </Text>
                </View>
                {featured.publishedAt ? (
                  <>
                    <Dot />
                    <Text variant="micro" color="secondary">
                      {formatCourseDate(featured.publishedAt)}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {!isLoading && !isEmpty ? (
        <View style={[styles.gutter, styles.section]}>
          <SectionHeader label="LATEST" count={cards.length} />
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

      <CourseFilterSheet
        visible={filterOpen}
        initial={{ category, contentType, sortBy }}
        categories={categoryOptions}
        contentTypes={contentTypeOptions}
        sortOptions={[...SORT_OPTIONS]}
        resultCount={visibleCourses.length}
        onApply={(next: CourseFilterValues) => {
          setCategory(next.category);
          setContentType(next.contentType);
          setSortBy(next.sortBy as CourseSort);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </Screen>
  );
}


function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleLeft}>
        <View style={styles.sectionBar} />
        <Text variant="caption" weight="800" style={styles.sectionTitle}>
          {label}
        </Text>
      </View>
      {count != null ? (
        <View style={styles.sectionCount}>
          <Text variant="micro" weight="700" mono tabular style={styles.sectionCountText}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable
      onPress={onClear}
      hitSlop={4}
      accessibilityLabel={`Remove ${label} filter`}
      style={({ pressed }) => [styles.activeChip, pressed && { opacity: 0.75 }]}
    >
      <Text variant="micro" weight="800" style={styles.activeChipLabel}>{label}</Text>
      <X size={11} color={colors.primary} strokeWidth={2.75} />
    </Pressable>
  );
}

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
    publishedAt: course.publishedAt,
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
  if (sortBy === 'RATED') return (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0);
  if (sortBy === 'REVIEWED') return (b.stats?.ratingsCount ?? 0) - (a.stats?.ratingsCount ?? 0);
  if (sortBy === 'COMPLETED') return (b.stats?.completionsCount ?? 0) - (a.stats?.completionsCount ?? 0);
  return getTime(b.publishedAt) - getTime(a.publishedAt);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatCourseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function getEmptyTitle(
  hasSearch: boolean,
  courseView: CourseView,
  category: string,
  contentType: string,
) {
  if (hasSearch) return 'No courses found';
  if (courseView === 'SAVED') return 'No saved courses yet';
  if (courseView === 'MINE') return 'No courses created yet';
  if (contentType !== ALL) return `No ${contentType.toLowerCase()} courses yet`;
  if (category !== ALL) return `No ${category.toLowerCase()} courses yet`;
  return 'No courses yet';
}

function getEmptyHint(
  hasSearch: boolean,
  courseView: CourseView,
  category: string,
  contentType: string,
) {
  if (hasSearch) return 'Try a different title, coach, category, level, or course type.';
  if (courseView === 'SAVED') return 'Tap the bookmark on a course to save it here.';
  if (courseView === 'MINE') return 'Courses you create as a trainer will appear here.';
  if (contentType !== ALL || category !== ALL) {
    return 'Try another filter or check back when more courses are added.';
  }
  return 'Courses from trainers will appear here once they are published.';
}


const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchBox: {
    flex: 1,
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
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Segmented view tabs
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
  },

  // Active chips row
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  activeChipLabel: { color: colors.primary, letterSpacing: 0.2 },
  clearAll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  sectionCountText: { color: colors.inkSecondary, fontSize: 10 },

  // Layout
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xl },

  // Featured
  featuredImageWrap: { height: 170, position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  featuredTag: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  featuredBody: { padding: spacing.xl, gap: spacing.md },
  featuredTitle: { lineHeight: 22, letterSpacing: -0.2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingInline: { flexDirection: 'row', alignItems: 'center' },

  // Grid
  grid: { gap: spacing.lg },
  gridRow: { flexDirection: 'row', gap: spacing.lg },
  gridFiller: { flex: 1 },

  bottomSpacer: { height: spacing.huge },
  headerActions: { flexDirection: 'row', gap: spacing.md },

  // Empty
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: { paddingHorizontal: spacing.xl, maxWidth: 320 },
  emptyCta: { marginTop: spacing.lg },
});
