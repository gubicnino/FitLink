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
  StarRating,
  Text,
  Textarea,
} from '../../components/ui';
import { ReviewCard } from './ReviewCard';
import type { RootStackParamList } from '../../navigation/types';
import { CourseDto, CourseReviewDto, courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import type { User } from '../../types/types';
import { API_ORIGIN } from '../../api/apiClient';
import { getAvatarUrl } from '../../utils/avatar';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';

const TABS = ['Overview', 'Reviews'] as const;
type DetailTab = (typeof TABS)[number];
type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetail'>;

export function CourseDetailScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewRating, setEditingReviewRating] = useState(5);
  const [editingReviewComment, setEditingReviewComment] = useState('');
  const [reviewDeletingId, setReviewDeletingId] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [completingCourse, setCompletingCourse] = useState(false);

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
  const savedCourseIds = user?.savedCourseIds ?? [];
  const isSaved = Boolean(course && savedCourseIds.includes(course.id));
  const isCompleted = Boolean(course?.completedByCurrentUser);
  const specializations = course?.authorSpecializations?.filter(Boolean) ?? [];
  const contentType = normalizeContentType(course?.contentType);
  const isVideo = contentType === 'VIDEO';
  const isPdf = contentType === 'PDF';
  const hasArticleContent = contentType === 'ARTICLE' && Boolean(course?.articleContent?.trim());
  const hasMediaHeader = Boolean((isVideo && course?.youtubeVideoId) || course?.thumbnailUrl);
  const reviews = course?.reviews ?? [];
  const reviewsEnabled = course?.reviewsEnabled !== false;
  const currentUserReview = reviews.find(review => review.userId === user?.firebaseUid);
  const canReview = Boolean(reviewsEnabled && user && course && user.firebaseUid !== course.authorId && !currentUserReview);

  const handleOpenSource = async () => {
    const sourceUrl = isPdf ? course?.pdfUrl : course?.articleUrl;
    if (!sourceUrl) return;
    await Linking.openURL(getMediaUrl(sourceUrl) ?? sourceUrl);
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

  const handleToggleSave = async () => {
    if (!course || !user || savingCourse) return;

    try {
      setSavingCourse(true);
      if (isSaved) {
        await courseService.unsave(course.id);
      } else {
        await courseService.save(course.id);
      }

      setUser(currentUser => {
        if (!currentUser) return currentUser;
        const currentSavedIds = currentUser.savedCourseIds ?? [];
        const nextSavedIds = isSaved
          ? currentSavedIds.filter(courseId => courseId !== course.id)
          : Array.from(new Set([...currentSavedIds, course.id]));
        return { ...currentUser, savedCourseIds: nextSavedIds };
      });
    } catch (error: any) {
      Alert.alert(
        isSaved ? 'Remove saved course failed' : 'Save course failed',
        error?.response?.data?.message || error?.message || 'Could not update saved courses.',
      );
    } finally {
      setSavingCourse(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!course || !user || completingCourse) return;

    try {
      setCompletingCourse(true);
      const nextCourse = isCompleted
        ? await courseService.uncomplete(course.id)
        : await courseService.complete(course.id);
      setCourse(nextCourse);
    } catch (error: any) {
      Alert.alert(
        isCompleted ? 'Could not update completion' : 'Could not complete course',
        error?.response?.data?.message || error?.message || 'Could not update course progress.',
      );
    } finally {
      setCompletingCourse(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!course || !reviewComment.trim()) return;

    try {
      setReviewSubmitting(true);
      const nextCourse = await courseService.addReview(course.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setCourse(nextCourse);
      setReviewComment('');
      setTab('Reviews');
    } catch (error: any) {
      Alert.alert(
        'Review failed',
        error?.response?.data?.message || error?.message || 'Could not save review.',
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleStartEditReview = (review: CourseReviewDto) => {
    setEditingReviewId(review.id);
    setEditingReviewRating(review.rating);
    setEditingReviewComment(review.comment);
  };

  const handleCancelEditReview = () => {
    setEditingReviewId(null);
    setEditingReviewRating(5);
    setEditingReviewComment('');
  };

  const handleSubmitEditReview = async () => {
    if (!course || !editingReviewId || !editingReviewComment.trim()) return;

    try {
      setReviewSubmitting(true);
      const nextCourse = await courseService.updateReview(course.id, editingReviewId, {
        rating: editingReviewRating,
        comment: editingReviewComment.trim(),
      });
      setCourse(nextCourse);
      handleCancelEditReview();
      setTab('Reviews');
    } catch (error: any) {
      Alert.alert(
        'Review update failed',
        error?.response?.data?.message || error?.message || 'Could not update review.',
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = (review: CourseReviewDto) => {
    if (!course || !user) return;

    const canDeleteReview = review.userId === user.firebaseUid || course.authorId === user.firebaseUid;
    if (!canDeleteReview) return;

    Alert.alert('Delete review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setReviewDeletingId(review.id);
            const nextCourse = await courseService.deleteReview(course.id, review.id);
            setCourse(nextCourse);
            if (editingReviewId === review.id) {
              handleCancelEditReview();
            }
          } catch (error: any) {
            Alert.alert(
              'Review delete failed',
              error?.response?.data?.message || error?.message || 'Could not delete review.',
            );
          } finally {
            setReviewDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen background="surface" scroll edges={['top']}>
      {hasMediaHeader ? (
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
              <Image source={{ uri: getMediaUrl(course?.thumbnailUrl) ?? FALLBACK_IMG }} style={styles.videoImage} />
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
              <IconButton variant="overlay" onPress={handleToggleSave} disabled={!user || savingCourse}>
                <Bookmark
                  size={16}
                  color={colors.white}
                  fill={isSaved ? colors.white : 'transparent'}
                  strokeWidth={2}
                />
              </IconButton>
            </View>
          </View>
        </View>
      </View>
      ) : (
        <View style={[styles.gutter, styles.simpleHeaderControls]}>
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
          <View style={styles.controlsRight}>
            {canEdit ? (
              <>
              <IconButton variant="surface" withBorder onPress={() => navigation.navigate('AddCourses', { courseId: course.id })}>
                <Pencil size={16} color={colors.inkPrimary} strokeWidth={2} />
              </IconButton>
              <IconButton variant="surface" withBorder onPress={handleDeleteCourse} disabled={deleting}>
                <Trash2 size={16} color={colors.inkPrimary} strokeWidth={2} />
              </IconButton>
              </>
            ) : null}
            <IconButton variant="surface" withBorder onPress={handleToggleSave} disabled={!user || savingCourse}>
              <Bookmark
                size={16}
                color={isSaved ? colors.primary : colors.inkPrimary}
                fill={isSaved ? colors.primary : 'transparent'}
                strokeWidth={2}
              />
            </IconButton>
          </View>
        </View>
      )}

      <View style={[styles.gutter, styles.section]}>
        <Text variant="h3" style={styles.title}>
          {course?.title ?? 'Course'}
        </Text>

        <View style={styles.authorRow}>
          <Pressable
            style={styles.authorPressable}
            disabled={!course?.authorId}
            onPress={() => course?.authorId && navigation.navigate('TrainerProfile', { trainerId: course.authorId })}
          >
            <Avatar source={getAvatarUrl(course?.authorAvatarUrl)} size="lg" />
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
          </Pressable>
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

            {hasArticleContent ? (
              <View style={styles.articleContent}>
                <Text variant="caption" color="muted" style={styles.articleContentLabel}>
                  Article
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.articleContentText}>
                  {course?.articleContent}
                </Text>
              </View>
            ) : null}

            {!isVideo && (isPdf || course?.articleUrl) ? (
              <Button
                label={isPdf ? 'Open PDF' : 'Open article'}
                variant="primary"
                fullWidth
                onPress={handleOpenSource}
                leftIcon={<ExternalLink size={16} color={colors.white} strokeWidth={2.5} />}
                style={styles.sourceCta}
              />
            ) : null}
            <Button
              label={isCompleted ? 'Completed' : 'Mark as complete'}
              variant={isCompleted ? 'outline' : 'primary'}
              fullWidth
              loading={completingCourse}
              disabled={!course || !user || completingCourse}
              onPress={handleToggleComplete}
              leftIcon={
                <Check
                  size={16}
                  color={isCompleted ? colors.primary : colors.white}
                  strokeWidth={2.5}
                />
              }
              style={styles.cta}
            />

            <ReviewsSection
              reviews={reviews}
              reviewsEnabled={reviewsEnabled}
              canReview={canReview}
              currentUserId={user?.firebaseUid ?? null}
              courseAuthorId={course?.authorId ?? null}
              rating={reviewRating}
              comment={reviewComment}
              submitting={reviewSubmitting}
              editingReviewId={editingReviewId}
              editingRating={editingReviewRating}
              editingComment={editingReviewComment}
              deletingReviewId={reviewDeletingId}
              onRatingChange={setReviewRating}
              onCommentChange={setReviewComment}
              onSubmit={handleSubmitReview}
              onStartEdit={handleStartEditReview}
              onCancelEdit={handleCancelEditReview}
              onEditingRatingChange={setEditingReviewRating}
              onEditingCommentChange={setEditingReviewComment}
              onSubmitEdit={handleSubmitEditReview}
              onDelete={handleDeleteReview}
            />
          </>
        ) : (
          <ReviewsSection
            reviews={reviews}
            reviewsEnabled={reviewsEnabled}
            canReview={canReview}
            currentUserId={user?.firebaseUid ?? null}
            courseAuthorId={course?.authorId ?? null}
            rating={reviewRating}
            comment={reviewComment}
            submitting={reviewSubmitting}
            editingReviewId={editingReviewId}
            editingRating={editingReviewRating}
            editingComment={editingReviewComment}
            deletingReviewId={reviewDeletingId}
            onRatingChange={setReviewRating}
            onCommentChange={setReviewComment}
            onSubmit={handleSubmitReview}
            onStartEdit={handleStartEditReview}
            onCancelEdit={handleCancelEditReview}
            onEditingRatingChange={setEditingReviewRating}
            onEditingCommentChange={setEditingReviewComment}
            onSubmitEdit={handleSubmitEditReview}
            onDelete={handleDeleteReview}
          />
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

function ReviewsSection({
  reviews,
  reviewsEnabled,
  canReview,
  currentUserId,
  courseAuthorId,
  rating,
  comment,
  submitting,
  editingReviewId,
  editingRating,
  editingComment,
  deletingReviewId,
  onRatingChange,
  onCommentChange,
  onSubmit,
  onStartEdit,
  onCancelEdit,
  onEditingRatingChange,
  onEditingCommentChange,
  onSubmitEdit,
  onDelete,
}: {
  reviews: CourseReviewDto[];
  reviewsEnabled: boolean;
  canReview: boolean;
  currentUserId: string | null;
  courseAuthorId: string | null;
  rating: number;
  comment: string;
  submitting: boolean;
  editingReviewId: string | null;
  editingRating: number;
  editingComment: string;
  deletingReviewId: string | null;
  onRatingChange: (value: number) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onStartEdit: (review: CourseReviewDto) => void;
  onCancelEdit: () => void;
  onEditingRatingChange: (value: number) => void;
  onEditingCommentChange: (value: string) => void;
  onSubmitEdit: () => void;
  onDelete: (review: CourseReviewDto) => void;
}) {
  return (
    <>
      {!reviewsEnabled ? (
        <View style={styles.reviewsDisabled}>
          <Text variant="bodySmall" color="secondary">
            Reviews and comments are disabled for this course.
          </Text>
        </View>
      ) : null}

      {canReview ? (
        <View style={styles.reviewForm}>
          <Text variant="caption" color="muted">
            Leave a review
          </Text>
          <View style={styles.ratingPicker}>
            {[1, 2, 3, 4, 5].map(value => (
              <Pressable key={value} onPress={() => onRatingChange(value)} hitSlop={8}>
                <StarRating value={value <= rating ? 1 : 0} size={22} outOf={1} />
              </Pressable>
            ))}
          </View>
          <Textarea
            value={comment}
            onChangeText={onCommentChange}
            placeholder="Share what helped or what could be better"
            rows={3}
          />
          <Button
            label="Submit review"
            variant="outline"
            fullWidth
            loading={submitting}
            disabled={!comment.trim() || submitting}
            onPress={onSubmit}
          />
        </View>
      ) : null}

      <View style={styles.reviewsHeader}>
        <Text variant="caption" color="muted">
          Reviews
        </Text>
      </View>
      <View style={styles.reviews}>
        {reviews.length > 0 ? (
          reviews.map(review => {
            const canEditReview = review.userId === currentUserId;
            const canEditEnabledReview = reviewsEnabled && canEditReview;
            const canDeleteReview = canEditReview || courseAuthorId === currentUserId;
            const isEditing = editingReviewId === review.id;

            return (
              <View key={review.id} style={styles.reviewItem}>
                <ReviewCard
                  review={{
                    id: review.id,
                    name: review.userDisplayName ?? 'Member',
                    stars: review.rating,
                    comment: review.comment,
                    avatarUrl: getAvatarUrl(review.userAvatarUrl),
                    edited: Boolean(review.editedAt),
                    originalStars: review.originalRating,
                    originalComment: review.originalComment,
                  }}
                  canEdit={canEditEnabledReview}
                  canDelete={canDeleteReview && deletingReviewId !== review.id}
                  onEdit={() => onStartEdit(review)}
                  onDelete={() => onDelete(review)}
                />
                {isEditing ? (
                  <View style={styles.reviewEditForm}>
                    <View style={styles.ratingPicker}>
                      {[1, 2, 3, 4, 5].map(value => (
                        <Pressable key={value} onPress={() => onEditingRatingChange(value)} hitSlop={8}>
                          <StarRating value={value <= editingRating ? 1 : 0} size={22} outOf={1} />
                        </Pressable>
                      ))}
                    </View>
                    <Textarea
                      value={editingComment}
                      onChangeText={onEditingCommentChange}
                      placeholder="Update your review"
                      rows={3}
                    />
                    <View style={styles.reviewEditActions}>
                      <Button
                        label="Cancel"
                        variant="outline"
                        size="md"
                        onPress={onCancelEdit}
                        style={styles.reviewEditButton}
                      />
                      <Button
                        label="Save"
                        variant="primary"
                        size="md"
                        loading={submitting}
                        disabled={!editingComment.trim() || submitting || deletingReviewId === review.id}
                        onPress={onSubmitEdit}
                        style={styles.reviewEditButton}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text variant="bodySmall" color="secondary">
            No reviews yet.
          </Text>
        )}
      </View>
    </>
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
  simpleHeaderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { fontSize: 20, lineHeight: 24, marginBottom: spacing.lg },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  authorPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
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
  articleContent: {
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  articleContentLabel: { marginBottom: spacing.sm },
  articleContentText: { lineHeight: 19 },
  sourceCta: { marginBottom: spacing.md },
  cta: { marginBottom: spacing.xxl },

  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviews: { gap: spacing.md },
  reviewForm: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  ratingPicker: { flexDirection: 'row', gap: spacing.sm },
  reviewItem: { gap: spacing.md },
  reviewEditForm: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  reviewEditActions: { flexDirection: 'row', gap: spacing.md },
  reviewEditButton: { flex: 1 },
  reviewsDisabled: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  bottomSpacer: { height: spacing.huge },
});

function normalizeContentType(value?: string | null) {
  if (value === 'PDF') return 'PDF';
  if (value === 'ARTICLE' || value === 'ARTICLE_LINK') return 'ARTICLE';
  return 'VIDEO';
}

function getMediaUrl(value?: string | null) {
  if (!value) return null;
  return value.startsWith('/uploads/') ? `${API_ORIGIN}${value}` : value;
}
