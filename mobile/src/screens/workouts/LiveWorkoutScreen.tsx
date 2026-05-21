import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Flag, Plus, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Button, IconButton, Screen, Text } from '../../components/ui';
import { exerciseApi } from '../../api/exerciseApi';
import { workoutApi } from '../../api/workoutApi';
import { useElapsedTime, formatElapsed } from '../../hooks/useElapsedTime';
import {
  buildSessionFromTemplate,
  useLiveSession,
} from '../../hooks/useLiveSession';
import type {
  LiveSessionState,
  SessionUpsertRequest,
  TemplateUpsertRequest,
} from '../../types/workout';
import type { RootStackParamList } from '../../navigation/types';
import { LiveExerciseCard } from './LiveExerciseCard';
import { RestTimerOverlay } from './RestTimerOverlay';
import { FinishWorkoutSheet, type FinishMode } from './FinishWorkoutSheet';
import { SetTypePickerSheet } from './SetTypePickerSheet';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LiveWorkout'>;
type Route = RouteProp<RootStackParamList, 'LiveWorkout'>;

interface RestTimerState {
  setId: string;
  startedAt: string;
  durationSeconds: number;
}

export function LiveWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;
  const templateId = params?.templateId;
  const pendingExerciseIds = params?.pendingExerciseIds;

  const {
    session,
    hydrated,
    start,
    discard,
    updateSet,
    toggleSetCompleted,
    addSet,
    removeSet,
    removeExercise,
    appendExercises,
  } = useLiveSession();

  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typePicker, setTypePicker] = useState<
    { exerciseId: string; setId: string; setIdx: number } | null
  >(null);


  useEffect(() => {
    if (!hydrated) return;
    if (!templateId) {
      setBootstrapError('Missing template id.');
      setBootstrapping(false);
      return;
    }

    // If a session already exists for this templateId, samo normalno idemo dale
    if (session && session.templateId === templateId) {
      setBootstrapping(false);
      return;
    }

    // If a session exists for a different template, vprašamo before discarding
    if (session && session.templateId !== templateId) {
      Alert.alert(
        'Active workout in progress',
        `You have an unfinished workout (${session.name}). Discard it and start "${templateId}" anyway?`,
        [
          {
            text: 'Keep working out',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Discard & start new',
            style: 'destructive',
            onPress: async () => {
              await discard();
              await bootstrapFresh();
            },
          },
        ],
      );
      return;
    }

    bootstrapFresh();

    async function bootstrapFresh() {
      setBootstrapping(true);
      setBootstrapError(null);
      try {
        const template = await workoutApi.getTemplate(templateId!);
        const ids = template.exercises.map(e => e.exerciseId);
        const detail = await Promise.all(ids.map(id => exerciseApi.getById(id)));
        const lookup = new Map(
          detail.map(d => [
            d.id,
            {
              name: d.name,
              category: d.category,
              thumbnailUrl: pickThumb(d.images),
            },
          ]),
        );
        const fresh = buildSessionFromTemplate(template, lookup);
        start(fresh);
      } catch (err) {
        setBootstrapError(extractMessage(err));
      } finally {
        setBootstrapping(false);
      }
    }
  }, [hydrated, templateId]);


  useFocusEffect(
    useCallback(() => {
      if (!pendingExerciseIds || pendingExerciseIds.length === 0) return;
      const ids = pendingExerciseIds;
      navigation.setParams({ pendingExerciseIds: undefined });
      (async () => {
        try {
          const fetched = await Promise.all(ids.map(id => exerciseApi.getById(id)));
          appendExercises(
            fetched.map(e => ({
              exerciseId: e.id,
              name: e.name,
              category: e.category,
              thumbnailUrl: pickThumb(e.images),
            })),
          );
        } catch (err) {
          Alert.alert('Could not add exercise', extractMessage(err));
        }
      })();
    }, [pendingExerciseIds, appendExercises, navigation]),
  );


  const onCompleteSet = useCallback(
    (exerciseId: string, setId: string) => {
      if (!session) return;
      const ex = session.exercises.find(e => e.id === exerciseId);
      const set = ex?.sets.find(s => s.id === setId);
      const wasCompleted = set?.completed ?? false;
      toggleSetCompleted(exerciseId, setId);

      if (!wasCompleted && set?.restSeconds != null && set.restSeconds > 0) {
        setRestTimer({
          setId,
          startedAt: new Date().toISOString(),
          durationSeconds: set.restSeconds,
        });
      }
    },
    [session, toggleSetCompleted],
  );

  const onSkipRest = useCallback(() => setRestTimer(null), []);

  const onChangeRestDuration = useCallback((next: number) => {
    setRestTimer(prev => (prev ? { ...prev, durationSeconds: next } : prev));
  }, []);

  const onAddExercise = useCallback(() => {
    navigation.navigate('ExercisePicker', {
      mode: 'select',
      appendToLiveSession: true,
    });
  }, [navigation]);

  const onClose = useCallback(() => {
    Alert.alert(
      'Stop workout?',
      "Your progress is saved on this device. You can come back to it later from the Workouts tab.",
      [
        { text: 'Continue workout', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [navigation]);

  const onConfirmFinish = useCallback(
    async (mode: FinishMode, removeSkipped: boolean) => {
      if (!session) return;
      setSaving(true);
      try {
        const sessionBody = toSessionRequest(session);
        await workoutApi.startSession(sessionBody);

        // "Save values" mode: user hoče shraniti samo rep/weight/rest/setType, ne pa strukture (torej ne briše dodanih live vaj, ne briše skippanih vaj, ne dodaja novih vaj v template).
        // "Save values & update template" mode: user hoče shraniti tudi strukturo (torej briše dodane live vaje, opcijsko briše skippane vaje, dodaja nove vaje v template).

        if (templateId) {
          const templateBody = toTemplateRequest(
            session,
            mode === 'save-template' ? 'structural' : 'values-only',
            removeSkipped,
          );
          await workoutApi.updateTemplate(templateId, templateBody);
        }


        await discard();
        navigation.dispatch(state => {
          const routes = state.routes.filter(r => r.name !== 'LiveWorkout');
          return CommonActions.reset({
            ...state,
            routes,
            index: routes.length - 1,
          });
        });
      } catch (err) {
        Alert.alert('Could not save workout', extractMessage(err));
        setSaving(false);
      }
    },
    [session, templateId, discard, navigation],
  );


  const elapsedSeconds = useElapsedTime(session?.startedAt);

  const skippedExerciseNames = useMemo(() => {
    if (!session) return [];
    return session.exercises
      .filter(ex => ex.sets.length === 0 || ex.sets.every(s => !s.completed))
      .map(ex => ex.name);
  }, [session]);

  const completedSets = useMemo(() => {
    if (!session) return 0;
    let n = 0;
    for (const ex of session.exercises) for (const s of ex.sets) if (s.completed) n += 1;
    return n;
  }, [session]);


  if (!hydrated || bootstrapping || !session) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          {bootstrapError ? (
            <>
              <Text variant="bodyLarge" color="danger" weight="600" align="center">
                Could not start workout
              </Text>
              <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
                {bootstrapError}
              </Text>
              <Button
                label="Go back"
                variant="outline"
                size="md"
                onPress={() => navigation.goBack()}
                style={styles.bootstrapBackBtn}
              />
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <IconButton variant="surface" withBorder onPress={onClose}>
          <X size={18} color={colors.inkPrimary} strokeWidth={2.25} />
        </IconButton>
        <View style={styles.headerCenter}>
          <Text variant="caption" color="muted">
            {session.name}
          </Text>
          <Text mono tabular weight="700" style={styles.timer}>
            {formatElapsed(elapsedSeconds)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.list}>
          {session.exercises.map(ex => (
            <LiveExerciseCard
              key={ex.id}
              exercise={ex}
              onCompleteSet={setId => onCompleteSet(ex.id, setId)}
              onChangeSet={(setId, patch) => updateSet(ex.id, setId, patch)}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={setId => removeSet(ex.id, setId)}
              onRemoveExercise={() =>
                Alert.alert(
                  'Remove exercise?',
                  `Remove "${ex.name}" from this workout? You'll lose any logged sets.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => removeExercise(ex.id),
                    },
                  ],
                )
              }
              onInfoPress={() =>
                navigation.navigate('ExerciseDetail', { exerciseId: ex.exerciseId })
              }
              onSetTypePress={(setId, setIdx) =>
                setTypePicker({ exerciseId: ex.id, setId, setIdx })
              }
            />
          ))}

          <Pressable
            onPress={onAddExercise}
            style={({ pressed }) => [styles.addExerciseBtn, pressed && { opacity: 0.7 }]}
          >
            <Plus size={18} color={colors.primary} strokeWidth={2.25} />
            <Text variant="body" weight="600" color="brand">
              Add exercise
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, shadows.modal]}>
        <Button
          label="Finish workout"
          variant="primary"
          fullWidth
          leftIcon={<Flag size={16} color={colors.white} strokeWidth={2.25} />}
          onPress={() => setFinishOpen(true)}
        />
      </View>

      <RestTimerOverlay
        startedAt={restTimer?.startedAt ?? null}
        durationSeconds={restTimer?.durationSeconds ?? 0}
        visible={restTimer !== null}
        onSkip={onSkipRest}
        onChangeDuration={onChangeRestDuration}
      />

      <FinishWorkoutSheet
        visible={finishOpen}
        skippedExercises={skippedExerciseNames}
        completedSets={completedSets}
        elapsedSeconds={elapsedSeconds}
        saving={saving}
        onCancel={() => setFinishOpen(false)}
        onConfirm={onConfirmFinish}
      />

      <SetTypePickerSheet
        visible={typePicker !== null}
        value={
          (typePicker
            ? session.exercises
                .find(e => e.id === typePicker.exerciseId)
                ?.sets.find(s => s.id === typePicker.setId)?.setType
            : null) ?? 'NORMAL'
        }
        setIndex={typePicker?.setIdx ?? 0}
        onSelect={next => {
          if (typePicker) {
            updateSet(typePicker.exerciseId, typePicker.setId, { setType: next });
          }
          setTypePicker(null);
        }}
        onCancel={() => setTypePicker(null)}
      />
    </Screen>
  );
}


function pickThumb(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images.length > 1 ? images[1] : images[0];
}

function toSessionRequest(s: LiveSessionState): SessionUpsertRequest {
  return {
    templateId: s.templateId,
    name: s.name,
    exercises: s.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      notes: null,
      sets: ex.sets
        .filter(set => set.completed) // POMEMBNO, LOGGAMO DEJANSKO SAMO SETE KERI SO "COMPLETED"
        .map(set => ({
          reps: set.reps,
          weightKg: set.weightKg,
          rpe: null,
          completed: true,
          setType: set.setType,
        })),
    })),
  };
}

/**
 * Build the PUT /templates/{id} body from the live session state.
 *
 * 2 opciji, controlled by "mode":
 *
 *   values-only ("Save values"):
 *     - Obdrzimo original template structure (only sets that came from the template).
 *     - Drop exercises added LIVE during the workout ("addedLive=true").
 *     - Do NOT drop skipped exercises — the template definition stays intact.
 *     - Propagate edited reps/weight/rest/setType + any extra sets the user added to an existing exercise.
 *
 *   structural ("Save values & update template"):
 *     - Include every exercise currently in the session (skupaj z "added-live").
 *     - If "removeSkipped" = true, drop exercises with zero completed sets.
 */

function toTemplateRequest(
  s: LiveSessionState,
  mode: 'values-only' | 'structural',
  removeSkipped: boolean,
): TemplateUpsertRequest {
  const base = mode === 'values-only' ? s.exercises.filter(ex => !ex.addedLive) : s.exercises;
  const kept =
    mode === 'structural' && removeSkipped
      ? base.filter(ex => ex.sets.some(set => set.completed))
      : base;
  return {
    name: s.name,
    exercises: kept.map((ex, idx) => ({
      exerciseId: ex.exerciseId,
      order: idx,
      notes: null,
      sets: ex.sets.map(set => ({
        targetReps: set.reps,
        targetWeightKg: set.weightKg,
        restSeconds: set.restSeconds,
        setType: set.setType,
      })),
    })),
  };
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerSpacer: { width: 40 },
  timer: { fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },

  scroll: { paddingTop: spacing.xl, paddingBottom: spacing.huge + 80 },
  list: { paddingHorizontal: spacing.xxl, gap: spacing.md },

  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primarySoftStrong,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  detail: { paddingHorizontal: spacing.xl },
  bootstrapBackBtn: { marginTop: spacing.lg },
});
