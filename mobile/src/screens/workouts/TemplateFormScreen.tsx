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
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  Button,
  IconButton,
  Input,
  Screen,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { exerciseApi } from '../../api/exerciseApi';
import { workoutApi } from '../../api/workoutApi';
import type { RootStackParamList } from '../../navigation/types';
import type { TemplateUpsertRequest, WorkoutTemplate } from '../../types/workout';
import {
  FormSet,
  TemplateExerciseRow,
  TemplateFormExercise,
} from './TemplateExerciseRow';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TemplateForm'>;
type Route = RouteProp<RootStackParamList, 'TemplateForm'>;

const DEFAULT_SET_COUNT = 3;
const DEFAULT_REPS = 10;
const DEFAULT_WEIGHT = 0;
// REST JE BY DEFAULT NULL, ZATO KER NEMO SILILI UPORABNIKE KA UPORABLJAJO REST FUNKCIONALNOST KER ZNAN IZ PERSONLA EXPERIENCA KA JE ANNOYING, MAJO PA OPCIJO.

// default values za sets, reps, weight na nove vaje
function defaultSets(count: number = DEFAULT_SET_COUNT): FormSet[] {
  return Array.from({ length: count }, () => ({
    reps: DEFAULT_REPS,
    weightKg: DEFAULT_WEIGHT,
    restSeconds: null,
    setType: 'NORMAL',
  }));
}

export function TemplateFormScreen() {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;
  const isEdit = params.mode === 'edit';
  const editTemplateId = params.mode === 'edit' ? params.templateId : undefined;
  const createExerciseIds = params.mode === 'create' ? params.exerciseIds : undefined;
  const pendingExerciseIds = params.pendingExerciseIds;

  const [name, setName] = useState('');
  const [items, setItems] = useState<TemplateFormExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dejansko trackamo keri exerciseId-je so bli ze hidrerane takka dejanski "add exercise" fetcha samo nove.
  const knownIds = useMemo(() => new Set(items.map(i => i.exerciseId)), [items]);

  // Create mode → load Exercise detail za vsak passed ID.
  // Edit mode → load template, hidrira form, in fetch detail za vsako vajo (za thumbNNail + ime).

  const loadCreate = useCallback(async (exerciseIds: string[]) => {
    const fetched = await Promise.all(exerciseIds.map(id => exerciseApi.getById(id)));
    return fetched.map<TemplateFormExercise>(e => ({
      exerciseId: e.id,
      name: e.name,
      category: e.category,
      thumbnailUrl: pickThumb(e.images),
      sets: defaultSets(),
    }));
  }, []);

  const loadEdit = useCallback(
    async (templateId: string): Promise<{ name: string; items: TemplateFormExercise[] }> => {
      const template = await workoutApi.getTemplate(templateId);
      const ids = template.exercises.map(e => e.exerciseId);
      const detail = await Promise.all(ids.map(id => exerciseApi.getById(id)));
      const detailById = new Map(detail.map(d => [d.id, d]));
      const formItems: TemplateFormExercise[] = template.exercises.map(e => {
        const d = detailById.get(e.exerciseId);
        const sets: FormSet[] =
          e.sets.length > 0
            ? e.sets.map(s => ({
                reps: s.targetReps,
                weightKg: s.targetWeightKg,
                restSeconds: s.restSeconds,
                setType: s.setType ?? 'NORMAL',
              }))
            : defaultSets(1);
        return {
          exerciseId: e.exerciseId,
          name: d?.name ?? e.exerciseId,
          category: d?.category ?? null,
          thumbnailUrl: d ? pickThumb(d.images) : null,
          sets,
        };
      });
      return { name: template.name, items: formItems };
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (editTemplateId) {
          const result = await loadEdit(editTemplateId);
          if (cancelled) return;
          setName(result.name);
          setItems(result.items);
        } else if (createExerciseIds) {
          const list = await loadCreate(createExerciseIds);
          if (cancelled) return;
          setItems(list);
        }
      } catch (err) {
        if (!cancelled) setError(extractMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // rehidracija kda user pride nazaj z ExercisePickera
  // (v ExercisePickerju lahko izbere več vaj, keri se potem appendajo na obstoječ seznam vaj v formi)

  useFocusEffect(
    useCallback(() => {
      if (!pendingExerciseIds || pendingExerciseIds.length === 0) return;
      const toAdd = pendingExerciseIds.filter(id => !knownIds.has(id));
      if (toAdd.length === 0) {
        navigation.setParams({ pendingExerciseIds: undefined });
        return;
      }
      (async () => {
        try {
          const fetched = await Promise.all(toAdd.map(id => exerciseApi.getById(id)));
          const newItems = fetched.map<TemplateFormExercise>(e => ({
            exerciseId: e.id,
            name: e.name,
            category: e.category,
            thumbnailUrl: pickThumb(e.images),
            sets: defaultSets(),
          }));
          setItems(prev => [...prev, ...newItems]);
        } catch (err) {
          Alert.alert('Could not add exercise', extractMessage(err));
        } finally {
          navigation.setParams({ pendingExerciseIds: undefined });
        }
      })();
    }, [pendingExerciseIds, knownIds, navigation]),
  );


  const updateItem = useCallback((index: number, patch: Partial<TemplateFormExercise>) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveItem = useCallback((from: number, to: number) => {
    setItems(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const onAddExercise = useCallback(() => {
    navigation.navigate('ExercisePicker', {
      mode: 'select',
      appendToTemplateId: editTemplateId,
    });
  }, [navigation, editTemplateId]);

  const handleSaveSuccess = useCallback(
    (saved: WorkoutTemplate) => {
      navigation.dispatch(state => {
        const keep = state.routes.filter(
          r =>
            r.name !== 'TemplateForm' &&
            r.name !== 'ExercisePicker' &&
            r.name !== 'TemplateDetail',
        );

        // po create ali edit, land nazaj na templateDetail za template keri je glihkar biu shranjene
        const next = [
          ...keep,
          { name: 'TemplateDetail' as const, params: { templateId: saved.id } },
        ];
        return CommonActions.reset({
          ...state,
          routes: next,
          index: next.length - 1,
        });
      });
    },
    [navigation],
  );

  // Save templatte: validation + API call
  const onSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give your template a name.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise.');
      return;
    }

    // Validacija: sepravi vsaka vaja more mete at least 1 set
    const empty = items.find(it => it.sets.length === 0);
    if (empty) {
      Alert.alert('No sets', `"${empty.name}" needs at least one set.`);
      return;
    }

    const body: TemplateUpsertRequest = {
      name: trimmed,
      exercises: items.map((it, idx) => ({
        exerciseId: it.exerciseId,
        order: idx,
        notes: null,
        sets: it.sets.map(s => ({
          targetReps: s.reps,
          targetWeightKg: s.weightKg,
          restSeconds: s.restSeconds,
          setType: s.setType,
        })),
      })),
    };

    setSaving(true);
    try {
      const saved = editTemplateId
        ? await workoutApi.updateTemplate(editTemplateId, body)
        : await workoutApi.createTemplate(body);
      handleSaveSuccess(saved);
    } catch (err) {
      Alert.alert('Could not save template', extractMessage(err));
      setSaving(false);
    }
  }, [name, items, editTemplateId, handleSaveSuccess]);

  // DEjanski rendering

  return (
    <Screen edges={['top']} keyboardAware>
      <ScreenHeader
        title={isEdit ? 'Edit template' : 'New template'}
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600" align="center">
            Could not load
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Input
              label="Template name"
              placeholder="Push Day"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.listHeader}>
            <Text variant="caption" color="muted">
              Exercises
            </Text>
            <Text variant="caption" color="muted">
              {items.length}
            </Text>
          </View>

          <View style={styles.list}>
            {items.map((it, idx) => (
              <TemplateExerciseRow
                key={`${it.exerciseId}-${idx}`}
                item={it}
                index={idx}
                total={items.length}
                onChange={patch => updateItem(idx, patch)}
                onRemove={() => removeItem(idx)}
                onMoveUp={() => moveItem(idx, idx - 1)}
                onMoveDown={() => moveItem(idx, idx + 1)}
                onInfoPress={() =>
                  navigation.navigate('ExerciseDetail', { exerciseId: it.exerciseId })
                }
              />
            ))}

            <Pressable
              onPress={onAddExercise}
              style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.25} />
              <Text variant="body" weight="600" color="brand">
                Add exercise
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {!loading && !error ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <Button
            label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save template'}
            variant="primary"
            fullWidth
            loading={saving}
            onPress={onSave}
          />
        </View>
      ) : null}
    </Screen>
  );
}


function pickThumb(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images.length > 1 ? images[1] : images[0];
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
  scroll: { paddingBottom: spacing.huge + 80 },
  section: { paddingHorizontal: spacing.xxl, marginBottom: spacing.xl },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.xxl, gap: spacing.md },

  addRow: {
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
});
