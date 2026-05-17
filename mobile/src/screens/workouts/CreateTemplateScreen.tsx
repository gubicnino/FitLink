import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  CommonActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Dumbbell, Minus, Plus, Trash2 } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  Button,
  Card,
  IconButton,
  Input,
  Screen,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { exerciseApi } from '../../api/exerciseApi';
import { workoutApi } from '../../api/workoutApi';
import type { TemplateUpsertRequest } from '../../types/workout';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTemplate'>;
type Route = RouteProp<RootStackParamList, 'CreateTemplate'>;

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_WEIGHT = 0;
const DEFAULT_REST = 90;

interface ExerciseConfig {
  exerciseId: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
}

export function CreateTemplateScreen() {
  const navigation = useNavigation<Nav>();
  const { exerciseIds } = useRoute<Route>().params;

  const [name, setName] = useState('');
  const [items, setItems] = useState<ExerciseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exercise summaries za chosen IDs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Mongo lookup endpoint vrne single, zato fetchamo paralelno.
        const fetched = await Promise.all(
          exerciseIds.map(id => exerciseApi.getById(id)),
        );
        if (cancelled) return;
        setItems(
          fetched.map<ExerciseConfig>((e, idx) => ({
            exerciseId: e.id,
            name: e.name,
            category: e.category,
            thumbnailUrl:
              e.images && e.images.length > 0
                ? e.images[e.images.length > 1 ? 1 : 0]
                : null,
            sets: DEFAULT_SETS,
            reps: DEFAULT_REPS,
            weightKg: DEFAULT_WEIGHT,
            restSeconds: DEFAULT_REST,
            _order: idx,
          } as ExerciseConfig)),
        );
      } catch (err) {
        if (!cancelled) setError(extractMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseIds]);

  const updateItem = useCallback((index: number, patch: Partial<ExerciseConfig>) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

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

    const body: TemplateUpsertRequest = {
      name: trimmed,
      exercises: items.map((it, idx) => ({
        exerciseId: it.exerciseId,
        order: idx,
        notes: null,
        sets: Array.from({ length: it.sets }, () => ({
          targetReps: it.reps,
          targetWeightKg: it.weightKg,
          restSeconds: it.restSeconds,
        })),
      })),
    };

    setSaving(true);
    try {
      await workoutApi.createTemplate(body);
      navigation.dispatch(state => {
        const routes = state.routes.filter(
          r => r.name !== 'CreateTemplate' && r.name !== 'ExercisePicker',
        );
        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1,
        });
      });
    } catch (err) {
      Alert.alert('Could not save template', extractMessage(err));
      setSaving(false);
    }
  }, [name, items, navigation]);

  return (
    <Screen edges={['top']} keyboardAware>
      <ScreenHeader
        title="New template"
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
            Could not load exercises
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
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

          <Text variant="caption" color="muted" style={styles.listLabel}>
            Exercises ({items.length})
          </Text>

          <View style={styles.list}>
            {items.map((it, idx) => (
              <Card key={`${it.exerciseId}-${idx}`} padding="md">
                <View style={styles.itemHeader}>
                  <View style={styles.thumb}>
                    {it.thumbnailUrl ? (
                      <Image source={{ uri: it.thumbnailUrl }} style={styles.thumbImage} />
                    ) : (
                      <Dumbbell size={18} color={colors.primary} strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.itemHeaderText}>
                    <Text variant="bodyLarge" weight="600" numberOfLines={1}>
                      {it.name}
                    </Text>
                    {it.category ? (
                      <Text variant="micro" color="secondary">
                        {capitalize(it.category)}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton variant="ghost" size="sm" onPress={() => removeItem(idx)}>
                    <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                  </IconButton>
                </View>

                <View style={styles.fields}>
                  <NumberField
                    label="Sets"
                    value={it.sets}
                    min={1}
                    max={10}
                    step={1}
                    onChange={v => updateItem(idx, { sets: v })}
                  />
                  <NumberField
                    label="Reps"
                    value={it.reps}
                    min={1}
                    max={50}
                    step={1}
                    onChange={v => updateItem(idx, { reps: v })}
                  />
                  <NumberField
                    label="Weight (kg)"
                    value={it.weightKg}
                    min={0}
                    max={500}
                    step={2.5}
                    onChange={v => updateItem(idx, { weightKg: v })}
                  />
                  <NumberField
                    label="Rest (s)"
                    value={it.restSeconds}
                    min={0}
                    max={600}
                    step={15}
                    onChange={v => updateItem(idx, { restSeconds: v })}
                  />
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      )}

      {!loading && !error ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <Button
            label={saving ? 'Saving…' : 'Save template'}
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

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}

function NumberField({ label, value, min, max, step, onChange }: NumberFieldProps) {
  const dec = () => onChange(clamp(round(value - step), min, max));
  const inc = () => onChange(clamp(round(value + step), min, max));
  return (
    <View style={styles.numField}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <View style={styles.numRow}>
        <IconButton variant="surface" withBorder size="sm" onPress={dec}>
          <Minus size={14} color={colors.inkPrimary} strokeWidth={2.5} />
        </IconButton>
        <Text mono tabular weight="700" style={styles.numValue}>
          {formatNumber(value)}
        </Text>
        <IconButton variant="surface" withBorder size="sm" onPress={inc}>
          <Plus size={14} color={colors.inkPrimary} strokeWidth={2.5} />
        </IconButton>
      </View>
    </View>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  listLabel: { paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.xxl, gap: spacing.md },

  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  itemHeaderText: { flex: 1, minWidth: 0 },

  thumb: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 40, height: 40 },

  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  numField: { flexBasis: '47%', gap: spacing.xs },
  numRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numValue: { fontSize: 18, minWidth: 56, textAlign: 'center' },

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
