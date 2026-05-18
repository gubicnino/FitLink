import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Save, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, Chip, Input, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { CoursePayload, courseService } from '../../services/courseService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCourses'>;

const CATEGORIES = ['Strength', 'Hypertrophy', 'Mobility', 'Cardio', 'Nutrition'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const emptyForm: CoursePayload = {
  title: '',
  description: '',
  category: 'Strength',
  level: 'INTERMEDIATE',
  youtubeVideoId: '',
  thumbnailUrl: '',
};

export function AddCourses({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  const isEditing = Boolean(courseId);
  const [form, setForm] = useState<CoursePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
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
          youtubeVideoId: course.youtubeVideoId,
          thumbnailUrl: course.thumbnailUrl ?? '',
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

  const updateField = (field: keyof CoursePayload, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const getPayload = (): CoursePayload | null => {
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      youtubeVideoId: extractYoutubeId(form.youtubeVideoId.trim()),
      thumbnailUrl: form.thumbnailUrl?.trim(),
    };

    if (!payload.title || !payload.description || !payload.youtubeVideoId) {
      setError('Title, description and YouTube video are required.');
      return null;
    }

    return payload;
  };

  const handleSubmit = async () => {
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
    } catch (err) {
      console.error('Course save failed:', err);
      setError('Could not save the course. Check that you are logged in as a trainer.');
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

              <Input
                label="YouTube video ID or URL"
                value={form.youtubeVideoId}
                onChangeText={value => updateField('youtubeVideoId', value)}
                autoCapitalize="none"
                placeholder="https://youtube.com/watch?v=..."
              />
              <Input
                label="Thumbnail URL"
                value={form.thumbnailUrl ?? ''}
                onChangeText={value => updateField('thumbnailUrl', value)}
                autoCapitalize="none"
                placeholder="Optional"
              />
            </View>

            <Button
              label={isEditing ? 'Save changes' : 'Create course'}
              variant="primary"
              fullWidth
              loading={loading}
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

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  form: { gap: spacing.lg },
  textArea: { height: 112, paddingTop: spacing.lg },
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
