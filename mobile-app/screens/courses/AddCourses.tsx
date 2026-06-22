import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@/utils/documentPicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AlertCircle,
  Bold,
  ChevronLeft,
  FileText,
  Heading2,
  Heading3,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Layers,
  List,
  MessageSquare,
  Quote,
  Save,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  Video,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from '@/utils/mediaPicker';
import { API_ORIGIN } from '@/api/apiClient';
import { ScreenHeader } from '@/components/layout';
import { Button, IconButton, Screen, Text, Textarea } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { CoursePayload, courseService } from '@/services/courseService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCourses'>;
type ArticleFormat = 'heading2' | 'heading3' | 'bold' | 'italic' | 'bullet' | 'quote';

const FALLBACK_COURSE_IMG =
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80&auto=format';

const CATEGORIES = ['Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'] as const;
const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
] as const;
const CONTENT_TYPES = [
  { label: 'Video', value: 'VIDEO', icon: 'video' as const },
  { label: 'Article', value: 'ARTICLE', icon: 'article' as const },
  { label: 'PDF', value: 'PDF', icon: 'pdf' as const },
] as const;

const emptyForm: CoursePayload = {
  title: '',
  description: '',
  category: 'Strength',
  level: 'INTERMEDIATE',
  contentType: 'VIDEO',
  youtubeVideoId: '',
  articleUrl: '',
  articleContent: '',
  pdfUrl: '',
  thumbnailUrl: '',
  reviewsEnabled: true,
};

export function AddCourses() {
  const navigation = useAppNavigation();
  const route = useAppRoute();
  const courseId = route.params?.courseId;
  const isEditing = Boolean(courseId);
  const [form, setForm] = useState<CoursePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(courseId));
  const [error, setError] = useState<string | null>(null);
  const [articleSelection, setArticleSelection] = useState({ start: 0, end: 0 });

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;
      try {
        const course = await courseService.getById(courseId);
        setForm({
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level,
          contentType: normalizeContentType(course.contentType),
          youtubeVideoId: course.youtubeVideoId,
          articleUrl: course.articleUrl ?? '',
          articleContent: course.articleContent ?? '',
          pdfUrl: course.pdfUrl ?? '',
          thumbnailUrl: course.thumbnailUrl ?? '',
          reviewsEnabled: course.reviewsEnabled !== false,
        });
      } catch (err) {
        console.error('Course load failed:', err);
        setError('Could not load this course.');
      } finally {
        setInitialLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  const updateField = <K extends keyof CoursePayload>(field: K, value: CoursePayload[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const requestPhotoPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handlePickThumbnail = async () => {
    try {
      setError(null);
      const hasPermission = await requestPhotoPermission();
      if (!hasPermission) {
        setError('Photo permission is required to upload a thumbnail.');
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1600,
        maxHeight: 900,
        quality: 0.7,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setError(result.errorMessage ?? 'Could not open photo library.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError('No image was selected.');
        return;
      }
      setThumbnailUploading(true);
      const response = await courseService.uploadThumbnail({
        uri: asset.uri,
        fileName: asset.fileName,
        type: asset.type,
      });
      updateField('thumbnailUrl', response.thumbnailUrl);
    } catch (err: any) {
      console.error('Thumbnail upload failed:', err);
      setError(getRequestErrorMessage(err, 'Could not upload thumbnail.'));
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handlePickPdf = async () => {
    try {
      setError(null);
      const [picked] = await pick({ type: types.pdf });
      const [localCopy] = await keepLocalCopy({
        files: [{ uri: picked.uri, fileName: picked.name ?? 'course-document.pdf' }],
        destination: 'documentDirectory',
      });
      if (localCopy.status !== 'success') {
        throw new Error(localCopy.copyError);
      }
      setPdfUploading(true);
      const response = await courseService.uploadPdf({
        uri: localCopy.localUri,
        fileName: picked.name ?? 'course-document.pdf',
        type: picked.type ?? 'application/pdf',
      });
      updateField('pdfUrl', response.pdfUrl);
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      console.error('PDF upload failed:', err);
      setError(getRequestErrorMessage(err, 'Could not upload PDF.'));
    } finally {
      setPdfUploading(false);
    }
  };

  const getPayload = (): CoursePayload | null => {
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      contentType: normalizeContentType(form.contentType),
      youtubeVideoId: form.contentType === 'VIDEO' ? extractYoutubeId(form.youtubeVideoId?.trim() ?? '') : '',
      articleUrl: form.contentType === 'ARTICLE' ? form.articleUrl?.trim() : '',
      articleContent: form.contentType === 'ARTICLE' ? form.articleContent?.trim() : '',
      pdfUrl: form.contentType === 'PDF' ? form.pdfUrl?.trim() : '',
      thumbnailUrl: form.thumbnailUrl?.trim(),
      reviewsEnabled: form.reviewsEnabled !== false,
    };

    if (!payload.title || !payload.description) {
      setError('Title and description are required.');
      return null;
    }
    if (payload.contentType === 'VIDEO' && !payload.youtubeVideoId) {
      setError('Add a YouTube URL or video ID.');
      return null;
    }
    if (payload.contentType === 'ARTICLE' && !payload.articleUrl && !payload.articleContent) {
      setError('Add an article URL or write the article text.');
      return null;
    }
    if (payload.contentType === 'PDF' && !payload.pdfUrl) {
      setError('Choose a PDF file.');
      return null;
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (thumbnailUploading || pdfUploading) {
      setError('Wait for the file upload to finish before saving the course.');
      return;
    }
    const payload = getPayload();
    if (!payload) return;
    setLoading(true);
    try {
      if (courseId) await courseService.update(courseId, payload);
      else await courseService.create(payload);
      Alert.alert('Saved', isEditing ? 'Course updated.' : 'Course created.');
      navigation.goBack();
    } catch (err: any) {
      console.error('Course save failed:', err);
      setError(getRequestErrorMessage(err, 'Could not save the course. Check that you are logged in as a trainer.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!courseId) return;
    Alert.alert('Delete course', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await courseService.remove(courseId);
            navigation.goBack();
          } catch (err) {
            console.error('Course delete failed:', err);
            setError('Could not delete the course.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const removeThumbnail = () => updateField('thumbnailUrl', '');

  const applyArticleFormat = (format: ArticleFormat) => {
    const current = form.articleContent ?? '';
    const selection = clampSelection(articleSelection, current.length);
    const next = formatArticleContent(current, selection, format);
    updateField('articleContent', next);
  };

  const previewType =
    form.contentType === 'PDF' ? 'PDF' :
    form.contentType === 'ARTICLE' ? 'ARTICLE' : 'VIDEO';

  return (
    <Screen edges={['top']} keyboardAware>
      <ScreenHeader
        title={isEditing ? 'Edit course' : 'New course'}
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero ----------------------------------------------- */}
          <View style={styles.heroWrap}>
            <View style={[styles.hero, shadows.card]}>
              <View style={styles.heroGlow} />
              <Text variant="micro" weight="800" style={styles.heroEyebrow}>
                {isEditing ? 'EDITING COURSE' : 'NEW COURSE'}
              </Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {form.title.trim() || 'Untitled course'}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroChip}>
                  <TagIcon size={11} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.heroChipText}>{form.category}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Sparkles size={11} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.heroChipText}>{capitalize(form.level)}</Text>
                </View>
                <View style={[styles.heroChip, styles.heroChipAccent]}>
                  <ContentTypeIcon type={previewType} color={colors.accent} />
                  <Text style={[styles.heroChipText, { color: colors.accent }]}>{previewType}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Thumbnail ----------------------------------------- */}
          <SectionHeader label="COVER" />
          <View style={styles.gutter}>
            <ThumbnailCanvas
              url={form.thumbnailUrl ? getMediaUrl(form.thumbnailUrl) : null}
              uploading={thumbnailUploading}
              onPick={handlePickThumbnail}
              onRemove={removeThumbnail}
              fallbackPreview={
                form.contentType === 'VIDEO' && form.youtubeVideoId
                  ? `https://img.youtube.com/vi/${extractYoutubeId(form.youtubeVideoId.trim())}/hqdefault.jpg`
                  : FALLBACK_COURSE_IMG
              }
            />
          </View>

          {/* Basics -------------------------------------------- */}
          <SectionHeader label="BASICS" />
          <View style={styles.gutter}>
            <View style={styles.card}>
              <LabeledField label="Title">
                <TextInput
                  value={form.title}
                  onChangeText={value => updateField('title', value)}
                  placeholder="Give your course a clear name"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.textInput}
                  maxLength={120}
                />
              </LabeledField>
              <View style={styles.cardDivider} />
              <LabeledField label="Description">
                <Textarea
                  value={form.description}
                  onChangeText={value => updateField('description', value)}
                  placeholder="What will trainees learn?"
                  rows={4}
                  style={styles.textareaInput}
                  containerStyle={styles.textareaContainer}
                />
              </LabeledField>
            </View>
          </View>

          {/* Classification ------------------------------------ */}
          <SectionHeader label="CLASSIFICATION" />
          <View style={styles.gutter}>
            <ChipField
              icon={<TagIcon size={13} color={colors.accent} strokeWidth={2.25} />}
              label="Category"
            >
              {CATEGORIES.map(c => (
                <ModernChip
                  key={c}
                  label={c}
                  selected={form.category === c}
                  onPress={() => updateField('category', c)}
                />
              ))}
            </ChipField>
            <ChipField
              icon={<Sparkles size={13} color={colors.accent} strokeWidth={2.25} />}
              label="Difficulty level"
            >
              {LEVELS.map(l => (
                <ModernChip
                  key={l.value}
                  label={l.label}
                  selected={form.level === l.value}
                  onPress={() => updateField('level', l.value)}
                />
              ))}
            </ChipField>
            <ChipField
              icon={<Layers size={13} color={colors.accent} strokeWidth={2.25} />}
              label="Content type"
            >
              {CONTENT_TYPES.map(t => (
                <ModernChip
                  key={t.value}
                  label={t.label}
                  selected={form.contentType === t.value}
                  leftIcon={
                    <ContentTypeIcon
                      type={t.value}
                      color={form.contentType === t.value ? colors.primary : colors.inkSecondary}
                    />
                  }
                  onPress={() => updateField('contentType', t.value)}
                />
              ))}
            </ChipField>
          </View>

          {/* Content ------------------------------------------- */}
          <SectionHeader label="CONTENT" />
          <View style={styles.gutter}>
            <View style={styles.card}>
              {form.contentType === 'VIDEO' ? (
                <LabeledField
                  label="YouTube video"
                  hint="Paste a full URL or just the video ID"
                >
                  <View style={styles.iconInputRow}>
                    <Video size={16} color={colors.inkMuted} strokeWidth={2} />
                    <TextInput
                      value={form.youtubeVideoId ?? ''}
                      onChangeText={value => updateField('youtubeVideoId', value)}
                      placeholder="https://youtu.be/..."
                      placeholderTextColor={colors.inkMuted}
                      autoCapitalize="none"
                      style={styles.iconInput}
                    />
                  </View>
                </LabeledField>
              ) : form.contentType === 'ARTICLE' ? (
                <>
                  <LabeledField label="Article URL" hint="Optional - link to an external article">
                    <View style={styles.iconInputRow}>
                      <FileText size={16} color={colors.inkMuted} strokeWidth={2} />
                      <TextInput
                        value={form.articleUrl ?? ''}
                        onChangeText={value => updateField('articleUrl', value)}
                        placeholder="https://..."
                        placeholderTextColor={colors.inkMuted}
                        autoCapitalize="none"
                        style={styles.iconInput}
                      />
                    </View>
                  </LabeledField>
                  <View style={styles.cardDivider} />
                  <LabeledField label="Written article" hint="Optional - write the article inline">
                    <ArticleFormattingToolbar onFormat={applyArticleFormat} />
                    <Textarea
                      value={form.articleContent ?? ''}
                      onChangeText={value => updateField('articleContent', value)}
                      onSelectionChange={event => setArticleSelection(event.nativeEvent.selection)}
                      placeholder="Write your article here..."
                      rows={8}
                      style={styles.textareaInput}
                      containerStyle={styles.textareaContainer}
                    />
                  </LabeledField>
                </>
              ) : (
                <LabeledField label="PDF document">
                  {form.pdfUrl ? (
                    <View style={styles.pdfSelected}>
                      <View style={styles.pdfIcon}>
                        <FileText size={18} color={colors.primary} strokeWidth={2.25} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" weight="700" numberOfLines={1}>
                          PDF document
                        </Text>
                        <Text variant="micro" color="muted">Uploaded · tap below to replace</Text>
                      </View>
                      <Pressable
                        onPress={() => updateField('pdfUrl', '')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.pdfRemove, pressed && { opacity: 0.6 }]}
                        accessibilityLabel="Remove PDF"
                      >
                        <Trash2 size={14} color={colors.danger} strokeWidth={2.25} />
                      </Pressable>
                    </View>
                  ) : null}
                  <Button
                    label={pdfUploading ? 'Uploading PDF…' : form.pdfUrl ? 'Replace PDF' : 'Choose PDF file'}
                    variant="outline"
                    fullWidth
                    loading={pdfUploading}
                    onPress={handlePickPdf}
                    leftIcon={<FileText size={16} color={colors.primary} strokeWidth={2.25} />}
                    style={{ marginTop: form.pdfUrl ? spacing.md : 0 }}
                  />
                </LabeledField>
              )}
            </View>
          </View>

          {/* Settings ------------------------------------------ */}
          <SectionHeader label="SETTINGS" />
          <View style={styles.gutter}>
            <Pressable
              onPress={() => updateField('reviewsEnabled', form.reviewsEnabled === false)}
              style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.toggleIcon}>
                <MessageSquare size={16} color={colors.primary} strokeWidth={2.25} />
              </View>
              <View style={styles.toggleText}>
                <Text variant="body" weight="700">Reviews & comments</Text>
                <Text variant="micro" color="muted">
                  {form.reviewsEnabled === false
                    ? 'Trainees cannot rate or comment'
                    : 'Trainees can rate this course and leave comments'}
                </Text>
              </View>
              <Switch on={form.reviewsEnabled !== false} />
            </Pressable>
          </View>

          {/* Error --------------------------------------------- */}
          {error ? (
            <View style={[styles.gutter, { marginTop: spacing.md }]}>
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.danger} strokeWidth={2.25} />
                <Text variant="bodySmall" weight="600" color="danger" style={styles.errorText}>
                  {error}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Delete CTA (only in edit mode) ------------------ */}
          {courseId ? (
            <View style={[styles.gutter, { marginTop: spacing.xl }]}>
              <Pressable
                onPress={handleDelete}
                disabled={loading}
                style={({ pressed }) => [styles.deleteRow, pressed && { opacity: 0.85 }]}
              >
                <Trash2 size={16} color={colors.danger} strokeWidth={2.25} />
                <Text variant="bodySmall" weight="800" color="danger">
                  Delete this course
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Sticky bottom CTA ----------------------------------- */}
      {!initialLoading ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <View style={styles.ctaInfo}>
            <Text style={styles.ctaInfoLabel}>{isEditing ? 'EDITING' : 'CREATING'}</Text>
            <Text variant="bodySmall" weight="800" numberOfLines={1} style={styles.ctaInfoName}>
              {form.title.trim() || (isEditing ? 'Edit course' : 'New course')}
            </Text>
          </View>
          <Button
            label={loading ? 'Saving…' : isEditing ? 'Save' : 'Create'}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading || thumbnailUploading || pdfUploading}
            onPress={handleSubmit}
            leftIcon={<Save size={16} color={colors.white} strokeWidth={2.5} />}
            style={styles.ctaButton}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text variant="caption" weight="800" style={styles.sectionLabel}>
        {label}
      </Text>
    </View>
  );
}

function LabeledField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text variant="micro" weight="800" style={styles.fieldLabel}>
          {label.toUpperCase()}
        </Text>
        {hint ? (
          <Text variant="micro" color="muted" style={styles.fieldHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ChipField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chipField}>
      <View style={styles.chipFieldHeader}>
        <View style={styles.chipFieldIcon}>{icon}</View>
        <Text variant="micro" weight="800" style={styles.chipFieldLabel}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

function ModernChip({
  label,
  selected,
  onPress,
  leftIcon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leftIcon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {leftIcon ? <View style={styles.chipIcon}>{leftIcon}</View> : null}
      <Text
        variant="bodySmall"
        weight={selected ? '800' : '600'}
        style={[styles.chipLabel, selected && styles.chipLabelActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContentTypeIcon({ type, color }: { type: string; color: string }) {
  if (type === 'VIDEO') return <Video size={13} color={color} strokeWidth={2.25} />;
  if (type === 'ARTICLE') return <FileText size={13} color={color} strokeWidth={2.25} />;
  if (type === 'PDF') return <FileText size={13} color={color} strokeWidth={2.25} />;
  return null;
}

function Switch({ on }: { on: boolean }) {
  return (
    <View style={[styles.switchTrack, on && styles.switchTrackOn]}>
      <View style={[styles.switchThumb, on && styles.switchThumbOn]} />
    </View>
  );
}

function ArticleFormattingToolbar({ onFormat }: { onFormat: (format: ArticleFormat) => void }) {
  return (
    <View style={styles.articleToolbar}>
      <FormatButton
        label="Heading 2"
        onPress={() => onFormat('heading2')}
        icon={<Heading2 size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
      <FormatButton
        label="Heading 3"
        onPress={() => onFormat('heading3')}
        icon={<Heading3 size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
      <FormatButton
        label="Bold"
        onPress={() => onFormat('bold')}
        icon={<Bold size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
      <FormatButton
        label="Italic"
        onPress={() => onFormat('italic')}
        icon={<Italic size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
      <FormatButton
        label="List"
        onPress={() => onFormat('bullet')}
        icon={<List size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
      <FormatButton
        label="Quote"
        onPress={() => onFormat('quote')}
        icon={<Quote size={15} color={colors.inkPrimary} strokeWidth={2.4} />}
      />
    </View>
  );
}

function FormatButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.formatButton, pressed && { opacity: 0.72 }]}
    >
      {icon}
    </Pressable>
  );
}

function ThumbnailCanvas({
  url,
  uploading,
  onPick,
  onRemove,
  fallbackPreview,
}: {
  url: string | null;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  fallbackPreview: string;
}) {
  const hasThumb = !!url;
  return (
    <Pressable
      onPress={hasThumb ? undefined : onPick}
      disabled={uploading || hasThumb}
      style={[styles.thumbCanvas, !hasThumb && styles.thumbCanvasEmpty]}
    >
      <Image
        source={{ uri: url || fallbackPreview }}
        style={styles.thumbImage}
        blurRadius={hasThumb ? 0 : 6}
      />
      {!hasThumb ? <View style={styles.thumbDim} /> : null}

      {!hasThumb ? (
        <View style={styles.thumbEmptyOverlay} pointerEvents="none">
          <View style={styles.thumbEmptyIcon}>
            <ImageIcon size={26} color={colors.white} strokeWidth={2} />
          </View>
          <Text style={styles.thumbEmptyTitle}>Add a cover image</Text>
          <Text style={styles.thumbEmptyHint}>16:9 recommended</Text>
        </View>
      ) : null}

      {uploading ? (
        <View style={styles.thumbLoading}>
          <ActivityIndicator color={colors.white} />
          <Text variant="micro" weight="700" style={{ color: colors.white, marginTop: 6 }}>
            Uploading…
          </Text>
        </View>
      ) : null}

      {hasThumb && !uploading ? (
        <View style={styles.thumbActions}>
          <Pressable
            onPress={onPick}
            style={({ pressed }) => [styles.thumbAction, pressed && { opacity: 0.85 }]}
          >
            <ImagePlus size={13} color={colors.white} strokeWidth={2.25} />
            <Text style={styles.thumbActionText}>Change</Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [styles.thumbAction, styles.thumbActionDanger, pressed && { opacity: 0.85 }]}
          >
            <Trash2 size={13} color={colors.white} strokeWidth={2.25} />
            <Text style={styles.thumbActionText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      {hasThumb ? (
        <View style={styles.thumbBadge}>
          <Star size={11} color={colors.white} fill={colors.white} strokeWidth={0} />
          <Text style={styles.thumbBadgeText}>Cover set</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function extractYoutubeId(value: string) {
  const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? value;
}

function normalizeContentType(value?: string | null) {
  return value === 'ARTICLE_LINK' ? 'ARTICLE' : value ?? 'VIDEO';
}

function getMediaUrl(value: string) {
  return value.startsWith('/uploads/') ? `${API_ORIGIN}${value}` : value;
}

function clampSelection(selection: { start: number; end: number }, max: number) {
  const start = Math.max(0, Math.min(selection.start, max));
  const end = Math.max(start, Math.min(selection.end, max));
  return { start, end };
}

function formatArticleContent(
  value: string,
  selection: { start: number; end: number },
  format: ArticleFormat,
) {
  const selected = value.slice(selection.start, selection.end);
  const before = value.slice(0, selection.start);
  const after = value.slice(selection.end);

  const replacement = (() => {
    if (format === 'bold') {
      return wrapInline(selected, '**', 'bold text');
    }
    if (format === 'italic') {
      return wrapInline(selected, '*', 'italic text');
    }
    if (format === 'heading2') {
      return prefixBlock(selected, '## ', 'Section title');
    }
    if (format === 'heading3') {
      return prefixBlock(selected, '### ', 'Subsection title');
    }
    if (format === 'bullet') {
      return prefixBlock(selected, '- ', 'List item');
    }
    return prefixBlock(selected, '> ', 'Important note');
  })();

  return `${before}${replacement}${after}`;
}

function wrapInline(selected: string, mark: string, fallback: string) {
  const text = selected || fallback;
  return `${mark}${text}${mark}`;
}

function prefixBlock(selected: string, prefix: string, fallback: string) {
  const text = selected || fallback;
  return text
    .split('\n')
    .map(line => `${prefix}${line.replace(/^#{2,3}\s|^[->]\s/, '')}`)
    .join('\n');
}

function getRequestErrorMessage(error: any, fallback: string) {
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Check that backend is running and try again.';
  }
  return error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 80, paddingTop: spacing.xs },
  gutter: { paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primaryDark,
    opacity: 0.45,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: colors.white,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroChipAccent: {
    backgroundColor: 'rgba(255,107,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
  },
  heroChipText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardDivider: { height: 1, backgroundColor: colors.line },

  // Labeled field
  field: { gap: spacing.sm },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 10, letterSpacing: 0.8, color: colors.inkSecondary },
  fieldHint: { flex: 1, marginLeft: spacing.md, textAlign: 'right' },

  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.inkPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  textareaContainer: {},
  textareaInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  articleToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
  },
  formatButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },

  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.inkPrimary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Chip field
  chipField: { gap: spacing.md, marginBottom: spacing.lg },
  chipFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipFieldIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,107,53,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipFieldLabel: { fontSize: 10, letterSpacing: 0.8, color: colors.inkSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipIcon: { alignItems: 'center', justifyContent: 'center' },
  chipLabel: { color: colors.inkSecondary, letterSpacing: 0.1 },
  chipLabelActive: { color: colors.primary },

  // PDF selected row
  pdfSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  pdfIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },

  // Toggle (Reviews)
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1, gap: 2 },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.line,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 1 }, shadowRadius: 1.5 },
      android: { elevation: 2 },
    }),
  },
  switchThumbOn: {
    transform: [{ translateX: 18 }],
  },

  // Thumbnail canvas
  thumbCanvas: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  thumbCanvasEmpty: {
    borderStyle: 'dashed',
    borderColor: colors.primaryBorder,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbDim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(46,91,159,0.55)',
  },
  thumbEmptyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 6,
  },
  thumbEmptyTitle: { color: colors.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  thumbEmptyHint: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  thumbLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumbAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  thumbActionDanger: {
    backgroundColor: 'rgba(239,68,68,0.85)',
  },
  thumbActionText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  thumbBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,53,0.92)',
  },
  thumbBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { flex: 1 },

  // Delete row
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },

  // Sticky CTA bar
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaInfo: { flex: 1, minWidth: 0, gap: 2 },
  ctaInfoLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    color: colors.inkMuted,
  },
  ctaInfoName: { letterSpacing: -0.1 },
  ctaButton: { minWidth: 130 },
});
