import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, ImagePlus, Save, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_ORIGIN } from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, Chip, Input, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { CoursePayload, courseService } from '../../services/courseService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCourses'>;

const CATEGORIES = ['Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const CONTENT_TYPES = [
  { label: 'Video', value: 'VIDEO' },
  { label: 'Article', value: 'ARTICLE' },
  { label: 'PDF', value: 'PDF' },
] as const;

const emptyForm: CoursePayload = {
  title: '',
  description: '',
  category: 'Strength',
  level: 'INTERMEDIATE',
  contentType: 'VIDEO',
  youtubeVideoId: '',
  articleUrl: '',
  pdfUrl: '',
  thumbnailUrl: '',
  reviewsEnabled: true,
};

export function AddCourses({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  const isEditing = Boolean(courseId);
  const [form, setForm] = useState<CoursePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(courseId));
  const [error, setError] = useState<string | null>(null);

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

      const [picked] = await pick({
        type: types.pdf,
      });

      const [localCopy] = await keepLocalCopy({
        files: [
          {
            uri: picked.uri,
            fileName: picked.name ?? 'course-document.pdf',
          },
        ],
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
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

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
    if (payload.contentType === 'ARTICLE' && !payload.articleUrl) {
      setError('Add an article URL.');
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
      if (courseId) {
        await courseService.update(courseId, payload);
      } else {
        await courseService.create(payload);
      }

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

  return (
    <Screen edges={['top']} background="surface">
      <ScreenHeader title={isEditing ? 'Edit Course' : 'Add Course'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {initialLoading ? (
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              Loading course...
            </Text>
          </Card>
        ) : (
          <>
            {error ? (
              <Card padding="md" style={styles.errorCard}>
                <Text variant="bodySmall" style={styles.errorText}>
                  {error}
                </Text>
              </Card>
            ) : null}

            <View style={styles.form}>
              <Input label="Title" value={form.title} onChangeText={value => updateField('title', value)} />
              <Input
                label="Description"
                value={form.description}
                onChangeText={value => updateField('description', value)}
                multiline
                style={styles.textArea}
                textAlignVertical="top"
              />

              <FieldGroup label="Category">
                {CATEGORIES.map(category => (
                  <Chip
                    key={category}
                    label={category}
                    selected={form.category === category}
                    onPress={() => updateField('category', category)}
                  />
                ))}
              </FieldGroup>

              <FieldGroup label="Level">
                {LEVELS.map(level => (
                  <Chip
                    key={level}
                    label={level}
                    selected={form.level === level}
                    onPress={() => updateField('level', level)}
                  />
                ))}
              </FieldGroup>

              <FieldGroup label="Type">
                {CONTENT_TYPES.map(type => (
                  <Chip
                    key={type.value}
                    label={type.label}
                    selected={form.contentType === type.value}
                    onPress={() => updateField('contentType', type.value)}
                  />
                ))}
              </FieldGroup>

              <Pressable
                style={[styles.reviewToggle, form.reviewsEnabled !== false && styles.reviewToggleActive]}
                onPress={() => updateField('reviewsEnabled', form.reviewsEnabled === false)}
              >
                <View style={styles.reviewToggleText}>
                  <Text variant="bodySmall" weight="700">
                    Reviews and comments
                  </Text>
                  <Text variant="caption" color="secondary">
                    {form.reviewsEnabled === false ? 'Disabled for this course' : 'Enabled for this course'}
                  </Text>
                </View>
                <Text variant="bodySmall" color={form.reviewsEnabled === false ? 'muted' : 'brand'} weight="700">
                  {form.reviewsEnabled === false ? 'Off' : 'On'}
                </Text>
              </Pressable>

              {form.contentType === 'ARTICLE' ? (
                <Input
                  label="Article URL"
                  value={form.articleUrl ?? ''}
                  onChangeText={value => updateField('articleUrl', value)}
                  autoCapitalize="none"
                  placeholder="Paste article link"
                />
              ) : form.contentType === 'PDF' ? (
                <View style={styles.filePickerBlock}>
                  {form.pdfUrl ? (
                    <View style={styles.fileSelectedRow}>
                      <FileText size={16} color={colors.primary} strokeWidth={2.25} />
                      <Text variant="bodySmall" color="secondary" numberOfLines={1} style={styles.fileSelectedText}>
                        PDF selected
                      </Text>
                    </View>
                  ) : null}
                  <Button
                    label={pdfUploading ? 'Uploading PDF...' : form.pdfUrl ? 'Change PDF' : 'Choose PDF'}
                    variant="outline"
                    fullWidth
                    loading={pdfUploading}
                    onPress={handlePickPdf}
                    leftIcon={<FileText size={16} color={colors.primary} strokeWidth={2.25} />}
                  />
                </View>
              ) : (
                <Input
                  label="YouTube video ID or URL"
                  value={form.youtubeVideoId ?? ''}
                  onChangeText={value => updateField('youtubeVideoId', value)}
                  autoCapitalize="none"
                  placeholder="Paste YouTube URL or video ID"
                />
              )}

              {form.thumbnailUrl ? (
                <View style={styles.thumbnailBlock}>
                  <Image source={{ uri: getMediaUrl(form.thumbnailUrl) }} style={styles.thumbnailPreview} />
                  <Pressable style={styles.removeThumbnailButton} onPress={() => updateField('thumbnailUrl', '')}>
                    <Trash2 size={14} color={colors.danger} strokeWidth={2} />
                    <Text variant="bodySmall" weight="600" style={styles.removeThumbnailText}>
                      Remove thumbnail
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <Button
                label={thumbnailUploading ? 'Uploading thumbnail...' : form.thumbnailUrl ? 'Change thumbnail' : 'Choose thumbnail'}
                variant="outline"
                fullWidth
                loading={thumbnailUploading}
                onPress={handlePickThumbnail}
                leftIcon={<ImagePlus size={16} color={colors.primary} strokeWidth={2.25} />}
              />
            </View>

            <Button
              label={isEditing ? 'Save changes' : 'Create course'}
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading || thumbnailUploading || pdfUploading}
              onPress={handleSubmit}
              leftIcon={<Save size={16} color={colors.white} strokeWidth={2.25} />}
            />

            {courseId ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
                <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                <Text variant="bodySmall" weight="600" style={styles.deleteText}>
                  Delete course
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="caption" color="muted" style={styles.groupLabel}>
        {label}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

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

function getRequestErrorMessage(error: any, fallback: string) {
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Check that backend is running and try again.';
  }

  return error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  form: { gap: spacing.lg },
  textArea: { height: 112, paddingTop: spacing.lg },
  thumbnailBlock: { gap: spacing.sm },
  thumbnailPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  removeThumbnailButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  removeThumbnailText: { color: colors.danger },
  filePickerBlock: { gap: spacing.md },
  fileSelectedRow: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fileSelectedText: { flex: 1 },
  reviewToggle: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reviewToggleActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  reviewToggleText: { flex: 1, gap: 2 },
  groupLabel: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  errorCard: { borderColor: colors.danger },
  errorText: { color: colors.danger },
  deleteButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  deleteText: { color: colors.danger },
});
