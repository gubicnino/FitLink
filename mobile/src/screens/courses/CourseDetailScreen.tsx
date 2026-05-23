import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ExternalLink,
  Pencil,
  Share2,
  Star,
  Trash2,
} from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import {
  Avatar,
  BadgeCheck,
  Button,
  IconButton,
  Screen,
  Text,
} from '../../components/ui';
import { ReviewCard, Review } from './ReviewCard';
import type { RootStackParamList } from '../../navigation/types';
import { CourseDto, courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import type { User } from '../../types/types';

const COACH_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&auto=format';
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';

const REVIEWS: Review[] = [
  {
    id: '1',
    name: 'Janez Novak',
    stars: 5,
    comment: 'Clear, no fluff. The set/rep breakdown finally made PPL click for me.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format',
  },
  {
    id: '2',
    name: 'Ana Vidmar',
    stars: 5,
    comment: 'Maja explains progression really well. Following the program for 6 weeks now.',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80&auto=format',
  },
  {
    id: '3',
    name: 'Tomaž Horvat',
    stars: 4,
    comment: 'Solid fundamentals. Wish there was more on deload weeks.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format',
  },
];

const TABS = ['Overview', 'Reviews'] as const;
type DetailTab = (typeof TABS)[number];
type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetail'>;

export function CourseDetailScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const courseId = route.params?.courseId;
      if (!courseId) return;

      try {
        const [nextCourse, nextUser] = await Promise.all([
          courseService.getById(courseId),
          authService.getUser(),
        ]);
        setCourse(nextCourse);
        setUser(nextUser);
      } catch (error) {
        console.error('Course detail load failed:', error);
      }
    };

    load();
  }, [route.params?.courseId]);

  const canEdit = user?.role === 'TRAINER' && course?.authorId === user.firebaseUid;
  const specializations = course?.authorSpecializations?.filter(Boolean) ?? [];
  const contentType = normalizeContentType(course?.contentType);
  const isVideo = contentType === 'VIDEO';
  const isPdf = contentType === 'PDF';

  const handleOpenSource = async () => {
    const sourceUrl = isPdf ? course?.pdfUrl : course?.articleUrl;
    if (!sourceUrl) return;
    await Linking.openURL(sourceUrl);
  };

  const handleDeleteCourse = () => {
    if (!course || !canEdit || deleting) return;

    Alert.alert(
      'Delete course',
      'Are you sure you want to delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await courseService.remove(course.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                'Delete failed',
                error?.response?.data?.message || error?.message || 'Could not delete course.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen background="surface" scroll edges={['top']}>
      <View style={styles.gutter}>
        <View style={styles.videoWrap}>
          {course?.youtubeVideoId && isVideo ? (
            <YoutubePlayer
              height={220}
              play={playing}
              videoId={course.youtubeVideoId}
              onChangeState={(state: string) => setPlaying(state === 'playing')}
            />
          ) : (
            <>
              <Image source={{ uri: course?.thumbnailUrl ?? FALLBACK_IMG }} style={styles.videoImage} />
              <View style={styles.videoOverlay} />
              {!isVideo ? (
                <View style={styles.articlePill}>
                  <Text variant="caption" color="inverse" weight="700">
                    {contentType}
                  </Text>
                </View>
              ) : null}
            </>
          )}
          <View style={styles.videoControls}>
            <IconButton variant="overlay" onPress={() => navigation.goBack()}>
              <ChevronLeft size={18} color={colors.white} strokeWidth={2.25} />
            </IconButton>
            <View style={styles.controlsRight}>
              {canEdit ? (
                <>
                  <IconButton variant="overlay" onPress={() => navigation.navigate('AddCourses', { courseId: course.id })}>
                    <Pencil size={16} color={colors.white} strokeWidth={2} />
                  </IconButton>
                  <IconButton variant="overlay" onPress={handleDeleteCourse} disabled={deleting}>
                    <Trash2 size={16} color={colors.white} strokeWidth={2} />
                  </IconButton>
                </>
              ) : null}
              <IconButton variant="overlay">
                <Bookmark size={16} color={colors.white} strokeWidth={2} />
              </IconButton>
              <IconButton variant="overlay">
                <Share2 size={16} color={colors.white} strokeWidth={2} />
              </IconButton>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.gutter, styles.section]}>
        <Text variant="h3" style={styles.title}>
          {course?.title ?? 'Course'}
        </Text>

        <View style={styles.authorRow}>
          <Avatar source={COACH_IMG} size="lg" />
          <View style={styles.authorInfo}>
            <View style={styles.authorName}>
              <Text variant="bodySmall" weight="600">
                {course?.authorDisplayName ?? 'Coach'}
              </Text>
              {course?.authorVerificationStatus === 'APPROVED' ? <BadgeCheck size={14} /> : null}
            </View>
            <Text variant="micro" color="secondary">
              {specializations.length > 0 ? specializations.join(' / ') : `${course?.category ?? 'Training'} / ${course?.level ?? 'Video'}`}
            </Text>
          </View>
          <Button label="Follow" variant="outline" size="sm" />
        </View>

        <View style={styles.stats}>
          <StatItem icon={<Star size={13} color={colors.warning} fill={colors.warning} strokeWidth={0} />} value={course?.stats?.avgRating?.toFixed(1) ?? '0.0'} label="Rating" />
          <StatItem value={String(course?.stats?.ratingsCount ?? 0)} label="Ratings" />
          <StatItem value={String(course?.stats?.completionsCount ?? 0)} label="Done" />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => {
            const active = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
                <Text variant="bodySmall" color={active ? 'primary' : 'muted'} weight="600">
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'Overview' ? (
          <>
            <Text variant="bodySmall" color="secondary" style={styles.description}>
              {course?.description ?? 'Loading course details...'}
            </Text>

            {course?.authorBio ? (
              <View style={styles.trainerBio}>
                <Text variant="caption" color="muted" style={styles.trainerBioLabel}>
                  Trainer
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.trainerBioText}>
                  {course.authorBio}
                </Text>
              </View>
            ) : null}

            {!isVideo ? (
              <Button
                label={isPdf ? 'Open PDF' : 'Open article'}
                variant="primary"
                fullWidth
                onPress={handleOpenSource}
                leftIcon={<ExternalLink size={16} color={colors.white} strokeWidth={2.5} />}
                style={styles.cta}
              />
            ) : (
              <Button
                label="Mark as complete"
                variant="primary"
                fullWidth
                leftIcon={<Check size={16} color={colors.white} strokeWidth={2.5} />}
                style={styles.cta}
              />
            )}

            <View style={styles.reviewsHeader}>
              <Text variant="caption" color="muted">
                Reviews
              </Text>
              <Text variant="bodySmall" color="brand" weight="600">
                See all
              </Text>
            </View>
            <View style={styles.reviews}>
              {REVIEWS.map(r => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.reviews}>
            {REVIEWS.map(r => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

function StatItem({
  icon,
  value,
  unit,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statValueRow}>
        {icon}
        <Text mono tabular weight="700" style={styles.statValue}>
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="secondary" style={styles.statUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.lg },

  videoWrap: {
    aspectRatio: 16 / 9,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.black,
    position: 'relative',
  },
  videoImage: { width: '100%', height: '100%', opacity: 0.9 },
  videoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  articlePill: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  videoControls: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlsRight: { flexDirection: 'row', gap: spacing.md },

  title: { fontSize: 20, lineHeight: 24, marginBottom: spacing.lg },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  authorInfo: { flex: 1 },
  authorName: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  statItem: { flex: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statValue: { fontSize: 15 },
  statUnit: { marginLeft: 2 },

  tabs: {
    flexDirection: 'row',
    gap: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    marginBottom: spacing.lg,
  },
  tab: { paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },

  description: { lineHeight: 18, marginBottom: spacing.xxl },
  trainerBio: {
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  trainerBioLabel: { marginBottom: spacing.sm },
  trainerBioText: { lineHeight: 18 },
  cta: { marginBottom: spacing.xxl },

  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviews: { gap: spacing.md },

  bottomSpacer: { height: spacing.huge },
});

function normalizeContentType(value?: string | null) {
  if (value === 'PDF') return 'PDF';
  if (value === 'ARTICLE' || value === 'ARTICLE_LINK') return 'ARTICLE';
  return 'VIDEO';
}
