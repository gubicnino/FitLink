import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ChevronLeft, Dumbbell } from 'lucide-react-native';
import Body from 'react-native-body-highlighter';
import { colors, radii, spacing } from '@/constants/theme';
import { IconButton, Screen, Tag, Text } from '@/components/ui';
import { ScreenHeader } from '@/components/layout';
import { exerciseApi } from '@/api/exerciseApi';
import { buildMuscleHighlights } from '@/utils/muscleMapping';
import type { Exercise } from '@/types/exercise';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'ExerciseDetail'>;

const HERO_HORIZONTAL_PADDING = spacing.xxl;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_WIDTH = SCREEN_WIDTH - HERO_HORIZONTAL_PADDING * 2;
const HERO_HEIGHT = Math.round(HERO_WIDTH * 0.66);

// Body highlighter maps intensity 1 → MUSCLE_COLORS[0], intensity 2 → MUSCLE_COLORS[1].
// Sekundarna misica = oranzna, primary misicna skupina = modra.

const MUSCLE_COLORS: ReadonlyArray<string> = [colors.accent, colors.primary];

export function ExerciseDetailScreen() {
  const navigation = useAppNavigation();
  const { exerciseId } = useAppRoute().params;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    exerciseApi
      .getById(exerciseId)
      .then(e => {
        if (!cancelled) setExercise(e);
      })
      .catch(err => {
        if (!cancelled) setError(extractMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / HERO_WIDTH);
    setHeroIdx(idx);
  }, []);

  if (loading || !exercise) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Exercise"
          left={
            <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
              <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
            </IconButton>
          }
        />
        <View style={styles.center}>
          {error ? (
            <>
              <Text variant="bodyLarge" color="danger" weight="600" align="center">
                Could not load exercise
              </Text>
              <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
                {error}
              </Text>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      </Screen>
    );
  }

  const highlights = buildMuscleHighlights(exercise.primaryMuscles, exercise.secondaryMuscles);
  const hasImages = exercise.images.length > 0;

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Exercise"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {hasImages ? (
          <View style={styles.heroSection}>
            <FlatList
              data={exercise.images}
              keyExtractor={(uri, idx) => `${idx}-${uri}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onHeroScroll}
              renderItem={({ item }) => (
                <View style={styles.heroSlide}>
                  <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
                </View>
              )}
            />
            {exercise.images.length > 1 ? (
              <View style={styles.dots}>
                {exercise.images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === heroIdx && styles.dotActive]}
                  />
                ))}
                <View style={styles.heroCaptionBadge}>
                  <Text variant="micro" color="inverse" weight="700">
                    {heroIdx === 0 ? 'Start' : 'End'}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.heroSection}>
            <View style={[styles.heroSlide, styles.heroPlaceholder]}>
              <Dumbbell size={32} color={colors.primary} strokeWidth={1.75} />
            </View>
          </View>
        )}

        <View style={styles.titleSection}>
          <Text variant="display" style={styles.title}>
            {exercise.name}
          </Text>
          <View style={styles.tagRow}>
            {exercise.category ? (
              <Tag label={capitalize(exercise.category)} tone="primary" />
            ) : null}
            {exercise.level ? (
              <Tag label={capitalize(exercise.level)} tone={levelTone(exercise.level)} />
            ) : null}
            {exercise.equipment ? (
              <Tag label={capitalize(exercise.equipment)} tone="neutral" />
            ) : null}
            {exercise.mechanic ? (
              <Tag label={capitalize(exercise.mechanic)} tone="neutral" />
            ) : null}
            {exercise.force ? (
              <Tag label={capitalize(exercise.force)} tone="neutral" />
            ) : null}
          </View>
        </View>

        {highlights.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="caption" color="muted">
                Muscles worked
              </Text>
              <View style={styles.sideToggle}>
                <SideToggleButton
                  label="Front"
                  active={bodySide === 'front'}
                  onPress={() => setBodySide('front')}
                />
                <SideToggleButton
                  label="Back"
                  active={bodySide === 'back'}
                  onPress={() => setBodySide('back')}
                />
              </View>
            </View>

            <View style={styles.bodyWrap}>
              <Body
                data={highlights}
                colors={MUSCLE_COLORS}
                side={bodySide}
                gender="male"
                scale={1.1}
              />
            </View>

            <View style={styles.muscleLists}>
              {exercise.primaryMuscles.length > 0 ? (
                <View style={styles.muscleListRow}>
                  <Text variant="caption" color="muted" style={styles.muscleListLabel}>
                    Primary
                  </Text>
                  <View style={styles.muscleChips}>
                    {exercise.primaryMuscles.map(m => (
                      <Tag key={m} label={capitalize(m)} tone="primary" />
                    ))}
                  </View>
                </View>
              ) : null}
              {exercise.secondaryMuscles.length > 0 ? (
                <View style={styles.muscleListRow}>
                  <Text variant="caption" color="muted" style={styles.muscleListLabel}>
                    Secondary
                  </Text>
                  <View style={styles.muscleChips}>
                    {exercise.secondaryMuscles.map(m => (
                      <Tag key={m} label={capitalize(m)} tone="accent" />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {exercise.instructions.length > 0 ? (
          <View style={styles.section}>
            <Text variant="caption" color="muted" style={styles.sectionLabel}>
              How to perform
            </Text>
            <View style={styles.steps}>
              {exercise.instructions.map((step, idx) => (
                <View key={idx} style={styles.step}>
                  <View style={styles.stepBadge}>
                    <Text variant="micro" weight="700" mono tabular color="inverse">
                      {idx + 1}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.stepText}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SideToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sideBtn,
        active && styles.sideBtnActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        variant="micro"
        weight="700"
        color={active ? 'inverse' : 'secondary'}
      >
        {label}
      </Text>
    </Pressable>
  );
}


function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function levelTone(level: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'warning';
    case 'expert':
    case 'advanced':
      return 'danger';
    default:
      return 'neutral';
  }
}

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}


const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },

  heroSection: {
    paddingHorizontal: HERO_HORIZONTAL_PADDING,
    marginBottom: spacing.xxl,
  },
  heroSlide: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceElevated,
  },
  heroPlaceholder: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  heroCaptionBadge: {
    position: 'absolute',
    right: 0,
    top: -spacing.xxxl - 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },

  titleSection: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: { letterSpacing: -0.4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  section: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: { marginBottom: spacing.lg },

  sideToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    padding: 3,
    gap: 2,
  },
  sideBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  sideBtnActive: {
    backgroundColor: colors.inkPrimary,
  },

  bodyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },

  muscleLists: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  muscleListRow: {
    gap: spacing.sm,
  },
  muscleListLabel: {
    marginBottom: 2,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  steps: { gap: spacing.lg },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    lineHeight: 20,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  detail: { paddingHorizontal: spacing.xl },
});
