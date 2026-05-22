import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Dumbbell,
  Hash,
  Info,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  Button,
  Dot,
  IconButton,
  Screen,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { exerciseApi } from '../../api/exerciseApi';
import { workoutApi } from '../../api/workoutApi';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutTemplate } from '../../types/workout';
import { setTypeMeta } from '../../utils/setTypeMeta';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TemplateDetail'>;
type Route = RouteProp<RootStackParamList, 'TemplateDetail'>;

interface ExerciseDetail {
  id: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
}

export function TemplateDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { templateId } = useRoute<Route>().params;

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [details, setDetails] = useState<Map<string, ExerciseDetail>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const t = await workoutApi.getTemplate(templateId);
      const fetched = await Promise.all(
        t.exercises.map(e => exerciseApi.getById(e.exerciseId)),
      );
      const map = new Map<string, ExerciseDetail>();
      for (const e of fetched) {
        map.set(e.id, {
          id: e.id,
          name: e.name,
          category: e.category,
          thumbnailUrl: pickThumb(e.images),
        });
      }
      setTemplate(t);
      setDetails(map);
    } catch (err) {
      setError(extractMessage(err));
    }
  }, [templateId]);

  // refetcha na focus takka newly edited template se vidi takoj.
  // tu dejansko ne nucamo useEffect ker ze mamo useFocusEffect spodaj.

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onEdit = useCallback(() => {
    navigation.navigate('TemplateForm', { mode: 'edit', templateId });
  }, [navigation, templateId]);

  const onStart = useCallback(() => {
    navigation.navigate('LiveWorkout', { templateId });
  }, [navigation, templateId]);

  const onDelete = useCallback(() => {
    Alert.alert(
      'Delete template?',
      `"${template?.name ?? 'This template'}" will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await workoutApi.deleteTemplate(templateId);
              navigation.dispatch(state => {
                const routes = state.routes.filter(r => r.name !== 'TemplateDetail');
                return CommonActions.reset({
                  ...state,
                  routes,
                  index: routes.length - 1,
                });
              });
            } catch (err) {
              setDeleting(false);
              Alert.alert('Could not delete', extractMessage(err));
            }
          },
        },
      ],
    );
  }, [navigation, templateId, template?.name]);


  if (loading || !template) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Template"
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
                Could not load template
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

  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const estimatedMinutes = estimateMinutes(template);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Template"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
        right={
          <IconButton variant="surface" withBorder onPress={onDelete} disabled={deleting}>
            <Trash2 size={16} color={colors.danger} strokeWidth={2} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text variant="micro" weight="700" style={styles.heroEyebrow}>
            WORKOUT TEMPLATE
          </Text>
          <Text variant="display" style={styles.heroTitle}>
            {template.name}
          </Text>

          <View style={styles.heroStats}>
            <HeroStat
              icon={<Dumbbell size={14} color={colors.white} strokeWidth={2.25} />}
              value={String(template.exercises.length)}
              label={template.exercises.length === 1 ? 'exercise' : 'exercises'}
            />
            <View style={styles.heroStatDivider} />
            <HeroStat
              icon={<Hash size={14} color={colors.white} strokeWidth={2.25} />}
              value={String(totalSets)}
              label={totalSets === 1 ? 'set' : 'sets'}
            />
            <View style={styles.heroStatDivider} />
            <HeroStat
              icon={<Clock size={14} color={colors.white} strokeWidth={2.25} />}
              value={`~${estimatedMinutes}`}
              unit="min"
              label="duration"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="caption" weight="700" style={styles.sectionLabel}>
            EXERCISES
          </Text>
          <Text variant="caption" color="muted" mono tabular>
            {template.exercises.length}
          </Text>
        </View>

        {/* accordion: kliknes na row ka expandas table, samo 1 open naenkrat */}
        <View style={styles.list}>
          {template.exercises.map((ex, idx) => {
            const detail = details.get(ex.exerciseId);
            const uniform = areSetsUniform(ex.sets);
            const first = ex.sets[0];
            const isOpen = expandedIdx === idx;
            return (
              <View key={`${ex.exerciseId}-${idx}`} style={styles.row}>
                <Pressable
                  onPress={() => setExpandedIdx(isOpen ? null : idx)}
                  style={({ pressed }) => [styles.rowHeader, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={styles.rowIndex}>
                    <Text variant="micro" color="muted" weight="700" mono tabular>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>

                  <View style={styles.rowThumb}>
                    {detail?.thumbnailUrl ? (
                      <Image source={{ uri: detail.thumbnailUrl }} style={styles.thumbImg} />
                    ) : (
                      <Dumbbell size={16} color={colors.primary} strokeWidth={2} />
                    )}
                  </View>

                  <View style={styles.rowBody}>
                    <Text variant="body" weight="600" numberOfLines={1}>
                      {detail?.name ?? ex.exerciseId}
                    </Text>
                    {uniform && first ? (
                      <View style={styles.rowMeta}>
                        <Text variant="micro" color="secondary" weight="600">
                          {ex.sets.length} × {first.targetReps}
                        </Text>
                        {first.targetWeightKg > 0 ? (
                          <>
                            <Dot />
                            <Text mono tabular variant="micro" color="secondary">
                              {formatNumber(first.targetWeightKg)} kg
                            </Text>
                          </>
                        ) : null}
                        {first.restSeconds != null ? (
                          <>
                            <Dot />
                            <View style={styles.restInline}>
                              <Clock size={10} color={colors.inkMuted} strokeWidth={2} />
                              <Text variant="micro" color="muted">
                                {' '}
                                {formatSeconds(first.restSeconds)}
                              </Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    ) : (
                      <Text variant="micro" color="secondary">
                        {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() =>
                      navigation.navigate('ExerciseDetail', { exerciseId: ex.exerciseId })
                    }
                    hitSlop={8}
                    style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}
                    accessibilityLabel="Exercise details"
                  >
                    <Info size={16} color={colors.inkSecondary} strokeWidth={2} />
                  </Pressable>

                  <View
                    style={[styles.chevronWrap, isOpen && styles.chevronWrapOpen]}
                  >
                    <ChevronDown
                      size={16}
                      color={isOpen ? colors.primary : colors.inkMuted}
                      strokeWidth={2.25}
                    />
                  </View>
                </Pressable>

                {isOpen ? (
                  <View style={styles.setTable}>
                    <View style={styles.setTableHeader}>
                      <Text variant="caption" color="muted" style={styles.setColIdx}>
                        Set
                      </Text>
                      <Text variant="caption" color="muted" style={styles.setColReps}>
                        Reps
                      </Text>
                      <Text variant="caption" color="muted" style={styles.setColWeight}>
                        Weight
                      </Text>
                      <Text variant="caption" color="muted" style={styles.setColRest}>
                        Rest
                      </Text>
                    </View>
                    {ex.sets.map((s, sIdx) => {
                      const meta = setTypeMeta(s.setType);
                      const isNormal = (s.setType ?? 'NORMAL') === 'NORMAL';
                      return (
                      <View key={sIdx} style={styles.setTableRow}>
                        <View style={styles.setColIdx}>
                          <View
                            style={[
                              styles.setBadge,
                              {
                                backgroundColor: meta.badgeBg,
                                borderColor: isNormal ? colors.line : meta.badgeFg,
                              },
                            ]}
                          >
                            <Text
                              variant="micro"
                              weight="700"
                              mono
                              tabular
                              style={{ color: meta.badgeFg }}
                            >
                              {isNormal ? String(sIdx + 1) : meta.shortLabel}
                            </Text>
                          </View>
                        </View>
                        <Text mono tabular variant="bodySmall" style={styles.setColReps}>
                          {s.targetReps}
                        </Text>
                        <Text mono tabular variant="bodySmall" style={styles.setColWeight}>
                          {s.targetWeightKg > 0 ? `${formatNumber(s.targetWeightKg)} kg` : '-'}
                        </Text>
                        <Text mono tabular variant="bodySmall" color="secondary" style={styles.setColRest}>
                          {s.restSeconds != null ? formatSeconds(s.restSeconds) : '-'}
                        </Text>
                      </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, shadows.modal]}>
        <Button
          label="Edit"
          variant="ghost"
          size="lg"
          leftIcon={<Pencil size={16} color={colors.inkPrimary} strokeWidth={2} />}
          onPress={onEdit}
          style={styles.ctaEdit}
        />
        <Button
          label="Start workout"
          variant="primary"
          size="lg"
          leftIcon={<Play size={16} color={colors.white} fill={colors.white} strokeWidth={0} />}
          onPress={onStart}
          style={styles.ctaStart}
        />
      </View>
    </Screen>
  );
}

interface HeroStatProps {
  icon?: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}

function HeroStat({ icon, value, unit, label }: HeroStatProps) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatHeader}>
        {icon}
        <Text variant="micro" style={styles.heroStatLabel}>
          {label}
        </Text>
      </View>
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
    </View>
  );
}

// true samo in edino če so vsi seti v vaje enake (weight, sets, reps), te pokazemo malo na "lepše" v seznamu vaj.
function areSetsUniform(sets: { targetReps: number; targetWeightKg: number; restSeconds: number | null }[]): boolean {
  if (sets.length <= 1) return true;
  const [first, ...rest] = sets;
  return rest.every(
    s =>
      s.targetReps === first.targetReps &&
      s.targetWeightKg === first.targetWeightKg &&
      s.restSeconds === first.restSeconds,
  );
}

function pickThumb(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images.length > 1 ? images[1] : images[0];
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

// priblizen rough estimate za workout. Per set: ~45s execution + rest (configured ali default 60s ce nega resta).
function estimateMinutes(t: WorkoutTemplate): number {
  const FALLBACK_REST_SECONDS = 60;
  let totalSeconds = 0;
  for (const ex of t.exercises) {
    for (const set of ex.sets) {
      totalSeconds += 45;
      totalSeconds += set.restSeconds ?? FALLBACK_REST_SECONDS;
    }
  }
  return Math.max(1, Math.round(totalSeconds / 60));
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

  hero: {
    marginHorizontal: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
  heroTitle: { letterSpacing: -0.4, color: colors.white },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radii.md,
    gap: spacing.md,
  },
  heroStat: { flex: 1, gap: 2 },
  heroStatHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatLabel: {
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: { fontSize: 22, lineHeight: 24, letterSpacing: -0.5, color: colors.white },
  heroStatUnit: { marginLeft: 4, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase', color: colors.inkSecondary },

  list: { paddingHorizontal: spacing.xxl, gap: spacing.sm },
  row: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIndex: {
    width: 24,
    alignItems: 'center',
  },
  rowThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: 40, height: 40 },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  restInline: { flexDirection: 'row', alignItems: 'center' },

  setTable: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: spacing.xs,
  },
  setTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapOpen: {
    transform: [{ rotate: '180deg' }],
  },

  setColIdx: { width: 32, textAlign: 'left', alignItems: 'flex-start', justifyContent: 'center' },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  setColReps: { flex: 1, textAlign: 'center' },
  setColWeight: { flex: 1.2, textAlign: 'center' },
  setColRest: { flex: 1, textAlign: 'right' },

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
    flexDirection: 'row',
    gap: spacing.md,
  },
  ctaEdit: { flex: 1 },
  ctaStart: { flex: 2 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  detail: { paddingHorizontal: spacing.xl },
});
