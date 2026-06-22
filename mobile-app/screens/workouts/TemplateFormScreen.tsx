import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import {
    CommonActions,
    RouteProp,
    useFocusEffect,
    useNavigation,
    useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { exerciseApi } from '@/api/exerciseApi';
import { workoutApi } from '@/api/workoutApi';
import { ScreenHeader } from '@/components/layout';
import {
    Button,
    IconButton,
    Input,
    Screen,
    Text,
} from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { TemplateUpsertRequest, WorkoutTemplate } from '@/types/workout';
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
  const navigation = useAppNavigation();
  const route = useAppRoute();
  const params = route.params;
  const isEdit = params.mode === 'edit';
  const editTemplateId = params.mode === 'edit' ? params.templateId : undefined;
  const createExerciseIds = params.mode === 'create' ? params.exerciseIds : undefined;
  const createForTraineeId = params.mode === 'create' ? params.traineeId : undefined;
  const canStart = params.canStart ?? true;
  const trainerContext = Boolean(createForTraineeId || !canStart);
  const processingRef = React.useRef(false);
  const pendingItemsRef = React.useRef<TemplateFormExercise[]>([]);



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
          // Merge any exercises that arrived from picker while we were loading
          setItems([...result.items, ...pendingItemsRef.current]);
          pendingItemsRef.current = [];
        } else if (createExerciseIds) {
          const list = await loadCreate(createExerciseIds);
          if (cancelled) return;
          setItems([...list, ...pendingItemsRef.current]);
          pendingItemsRef.current = [];
        }
      } catch (err) {
        if (!cancelled) setError(extractMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // rehidracija kda user pride nazaj z ExercisePickera
  // (v ExercisePickerju lahko izbere več vaj, keri se potem appendajo na obstoječ seznam vaj v formi)
  const knownIdsRef = React.useRef(knownIds);
  useEffect(() => { knownIdsRef.current = knownIds; }, [knownIds]);
  useFocusEffect(
    useCallback(() => {
      const pendingIds = route.params?.pendingExerciseIds;
      if (!pendingIds || pendingIds.length === 0 || processingRef.current) return;

      processingRef.current = true;
      const toAdd = pendingIds.filter((id: string) => !knownIdsRef.current.has(id));

      // Clear params immediately and synchronously before any async work
      navigation.setParams({ pendingExerciseIds: undefined });

      if (toAdd.length === 0) {
        processingRef.current = false;
        return;
      }

      (async () => {
        try {
          const fetched = await Promise.all(toAdd.map((id: string) => exerciseApi.getById(id)));
          console.log('[FOCUS] fetched:', fetched.map(e => e.id));
          const newItems = fetched.map<TemplateFormExercise>(e => ({
            exerciseId: e.id,
            name: e.name,
            category: e.category,
            thumbnailUrl: pickThumb(e.images),
            sets: defaultSets(),
          }));
          if (loading) {
            // Initial load still in flight — stash for merge
            console.log('[FOCUS] still loading, stashing', newItems.length, 'items');
            pendingItemsRef.current = [...pendingItemsRef.current, ...newItems];
          } else {
            console.log('[FOCUS] calling setItems with', newItems.length, 'new items');
            setItems(prev => [...prev, ...newItems]);
          }
        } catch (err) {
          console.log('[FOCUS] fetch error:', err);
          Alert.alert('Could not add exercise', extractMessage(err));
        } finally {
          processingRef.current = false;
        }
      })();
    }, [route.params?.pendingExerciseIds, navigation]),
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
      forTraineeId: createForTraineeId,
    });
  }, [navigation, editTemplateId, createForTraineeId]);

  const handleSaveSuccess = useCallback(
    (saved: WorkoutTemplate) => {
      // After create or edit, land back on the detail screen for the saved
      // template (replacing the form so back doesn't return to it).
      navigation.replace('TemplateDetail', {
        templateId: saved.id,
        canStart: trainerContext ? false : undefined,
      });
    },
    [navigation, trainerContext],
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
        : createForTraineeId
          ? await workoutApi.createTemplateForTrainee(createForTraineeId, body)
          : await workoutApi.createTemplate(body);
      handleSaveSuccess(saved);
    } catch (err) {
      Alert.alert('Could not save template', extractMessage(err));
      setSaving(false);
    }
  }, [name, items, editTemplateId, createForTraineeId, handleSaveSuccess]);

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
          <View style={styles.hero}>
            <Text variant="micro" weight="700" style={styles.heroEyebrow}>
              {isEdit ? 'EDITING TEMPLATE' : 'NEW TEMPLATE'}
            </Text>
            <Input
              placeholder="Push Day"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              style={styles.heroTitleInput}
            />

            <View style={styles.heroStats}>
              <HeroStat
                value={String(items.length)}
                label={items.length === 1 ? 'exercise' : 'exercises'}
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={String(totalSetsCount(items))}
                label="sets"
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                value={`~${estimateMinutes(items)}`}
                unit="min"
                label="duration"
              />
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text variant="caption" weight="700" style={styles.sectionLabel}>
              EXERCISES
            </Text>
            <Text variant="caption" color="muted" mono tabular>
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
              accessibilityLabel="Add exercise"
            >
              <View style={styles.addRowIcon}>
                <Plus size={18} color={colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.addRowText}>
                <Text variant="body" weight="700" color="brand">
                  Add exercise
                </Text>
                <Text variant="micro" color="muted">
                  Browse the library or search
                </Text>
              </View>
            </Pressable>

            {items.length === 0 ? (
              <View style={styles.emptyHint}>
                <Text variant="bodySmall" color="secondary" align="center">
                  Start by adding exercises from the library
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {!loading && !error ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <View style={styles.ctaInfo}>
            <Text variant="micro" color="muted" style={styles.ctaInfoLabel}>
              {items.length} {items.length === 1 ? 'exercise' : 'exercises'} · {totalSetsCount(items)} sets
            </Text>
            <Text variant="bodySmall" weight="700" numberOfLines={1}>
              {name.trim() || (isEdit ? 'Edit template' : 'New template')}
            </Text>
          </View>
          <Button
            label={saving ? 'Saving…' : isEdit ? 'Save' : 'Save'}
            variant="primary"
            size="lg"
            loading={saving}
            onPress={onSave}
            style={styles.ctaButton}
          />
        </View>
      ) : null}
    </Screen>
  );
}

interface HeroStatProps {
  value: string;
  unit?: string;
  label: string;
}

function HeroStat({ value, unit, label }: HeroStatProps) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        <Text mono tabular weight="800" style={styles.heroStatValue}>
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" style={styles.heroStatUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="micro" style={styles.heroStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function totalSetsCount(items: TemplateFormExercise[]): number {
  return items.reduce((sum, it) => sum + it.sets.length, 0);
}

function estimateMinutes(items: TemplateFormExercise[]): number {
  const FALLBACK_REST_SECONDS = 60;
  let totalSeconds = 0;
  for (const it of items) {
    for (const set of it.sets) {
      totalSeconds += 45;
      totalSeconds += set.restSeconds ?? FALLBACK_REST_SECONDS;
    }
  }
  return Math.max(0, Math.round(totalSeconds / 60));
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
  scroll: { paddingBottom: spacing.huge + 80, paddingTop: spacing.xs },

  // Hero card
  hero: {
    marginHorizontal: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
  heroTitleInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radii.md,
    gap: spacing.md,
  },
  heroStat: { flex: 1, gap: 2 },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: { fontSize: 20, lineHeight: 22, letterSpacing: -0.4, color: colors.white },
  heroStatUnit: { marginLeft: 3, color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  heroStatLabel: {
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // Section
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase', color: colors.inkSecondary },

  list: { paddingHorizontal: spacing.xxl, gap: spacing.md },

  // Add exercise CTA
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.primarySoft,
  },
  addRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowText: { flex: 1, gap: 2 },

  emptyHint: { paddingVertical: spacing.lg, alignItems: 'center' },

  // Sticky save bar
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
  ctaInfoLabel: { letterSpacing: 0.3 },
  ctaButton: { minWidth: 110 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  detail: { paddingHorizontal: spacing.xl },
});
