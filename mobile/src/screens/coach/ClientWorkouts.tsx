import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Dumbbell, History, Plus, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { workoutApi } from '../../api/workoutApi';
import { ScreenHeader } from '../../components/layout';
import { Button, IconButton, Screen, TabSwitcher, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, shadows, spacing } from '../../theme';
import type { WorkoutSession, WorkoutTemplate } from '../../types/workout';
import { SessionHistoryCard } from '../workouts/SessionHistoryCard';
import { WeeklySummary } from '../workouts/WorkoutsHeroCards';
import { WorkoutTemplate as CardTemplate, WorkoutTemplateCard } from '../workouts/WorkoutTemplateCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = NativeStackScreenProps<RootStackParamList, 'ClientWorkouts'>;

const TABS = ['Templates', 'History'] as const;
type Tab = (typeof TABS)[number];

export function ClientWorkouts({ route }: Props) {
  const { traineeId } = route.params;
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('Templates');

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, s] = await Promise.all([
        workoutApi.listTemplatesForTraineeOfTrainer(traineeId),
        workoutApi.listSessionsForTraineeOfTrainer(traineeId),
      ]);
      setTemplates(t);
      setSessions(s);
    } catch (err) {
      setError(extractMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onDeleteSession = useCallback((session: WorkoutSession) => {
    Alert.alert(
      'Delete workout?',
      `"${session.name}" will be removed from your history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSessions(curr => curr.filter(s => s.id !== session.id));
            try {
              await workoutApi.deleteSession(session.id);
            } catch (err) {
              setSessions(curr =>
                curr.some(s => s.id === session.id) ? curr : [session, ...curr],
              );
              Alert.alert('Could not delete', extractMessage(err));
            }
          },
        },
      ],
    );
  }, []);

  const onNewTemplate = useCallback(() => {
    navigation.navigate('ExercisePicker', { mode: 'select', forTraineeId: traineeId });
  }, [navigation, traineeId]);

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Client's Workouts" left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        } />
      

      <View style={styles.gutter}>
        <TabSwitcher<Tab> tabs={TABS} value={tab} onChange={setTab} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600" align="center">
            Could not load workouts
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
            {error}
          </Text>
          <Button label="Retry" variant="outline" size="md" onPress={load} style={styles.retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {tab === 'Templates' ? (
            <View style={styles.section}>
              {templates.length === 0 ? (
                <EmptyState
                  icon={<Dumbbell size={28} color={colors.primary} strokeWidth={2} />}
                  title="No templates yet"
                  hint="Build your first workout from the exercise library. Add exercises, set targets, save."
                  ctaLabel="Create template"
                  onPress={onNewTemplate}
                />
              ) : (
                <>
                  <SectionHeader
                    label="Client's templates"
                    count={templates.length}
                  />
                  <View style={styles.list}>
                    {templates.map(t => (
                      <WorkoutTemplateCard
                        key={t.id}
                        template={toCardTemplate(t)}
                        onPress={() => navigation.navigate('TemplateDetail', { templateId: t.id, canStart: false })}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.section}>
              <EmptyState
                icon={<History size={28} color={colors.primary} strokeWidth={2} />}
                title="No completed workouts yet"
                hint="Start a session from a template - once you finish, it shows up here with stats and progress."
              />
            </View>
          ) : (
            <View style={styles.section}>
              <WeeklySummary sessions={sessions} />

              <SectionHeader
                label="Recent workouts"
                count={sessions.length}
                hint="Swipe left to delete"
              />

              <View style={styles.list}>
                {sessions.map(s => (
                  <SwipeableHistoryRow
                    key={s.id}
                    session={s}
                    onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
                    onDelete={() => onDeleteSession(s)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'Templates' && !loading && !error && templates.length > 0 ? (
        <Pressable
          onPress={onNewTemplate}
          style={({ pressed }) => [styles.fab, shadows.modal, pressed && { opacity: 0.88 }]}
          accessibilityRole="button"
          accessibilityLabel="Create new template"
        >
          <Plus size={22} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </Screen>
  );
}


function SectionHeader({
  label,
  count,
  hint,
}: {
  label: string;
  count: number;
  hint?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text variant="caption" weight="700" style={styles.sectionLabel}>
          {label}
        </Text>
        <Text variant="caption" color="muted" mono tabular>
          {count}
        </Text>
      </View>
      {hint ? (
        <Text variant="micro" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}


interface SwipeableHistoryRowProps {
  session: WorkoutSession;
  onPress: () => void;
  onDelete: () => void;
}

function SwipeableHistoryRow({ session, onPress, onDelete }: SwipeableHistoryRowProps) {
  const ref = useRef<Swipeable | null>(null);

  const renderRightActions = useCallback(
    () => (
      <Pressable
        onPress={() => {
          ref.current?.close();
          onDelete();
        }}
        style={({ pressed }) => [styles.deleteAction, pressed && { opacity: 0.85 }]}
        accessibilityLabel="Delete workout"
      >
        <Trash2 size={20} color={colors.white} strokeWidth={2.25} />
        <Text variant="micro" weight="700" color="inverse" style={styles.deleteActionLabel}>
          Delete
        </Text>
      </Pressable>
    ),
    [onDelete],
  );

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <SessionHistoryCard session={session} onPress={onPress} />
    </Swipeable>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
  ctaLabel?: string;
  onPress?: () => void;
}

function EmptyState({ icon, title, hint, ctaLabel, onPress }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text variant="h3" weight="700" align="center">
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
        {hint}
      </Text>
      {ctaLabel && onPress ? (
        <Button
          label={ctaLabel}
          variant="primary"
          size="md"
          leftIcon={<Plus size={15} color={colors.white} strokeWidth={2.5} />}
          onPress={onPress}
          style={styles.emptyCta}
        />
      ) : null}
    </View>
  );
}

function toCardTemplate(t: WorkoutTemplate): CardTemplate {
  const exerciseCount = t.exercises?.length ?? 0;
  const setCount = t.exercises?.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0) ?? 0;
  return {
    id: t.id,
    name: t.name,
    exerciseCount,
    setCount,
    durationMinutes: setCount > 0 ? Math.max(1, Math.round((setCount * 105) / 60)) : undefined,
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
  gutter: { paddingHorizontal: spacing.xxl },
  scrollContent: { paddingBottom: spacing.huge + 100 },

  section: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },

  sectionHeader: { gap: 4, paddingHorizontal: 2 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase', color: colors.inkSecondary },

  list: { gap: spacing.md },
  detail: { paddingHorizontal: spacing.xl },

  empty: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyCta: { marginTop: spacing.lg },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  retry: { marginTop: spacing.md },

  fab: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: spacing.xxl + 60,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 84,
    borderRadius: radii.lg,
    marginLeft: spacing.sm,
    gap: 4,
  },
  deleteActionLabel: { letterSpacing: 0.4 },
});
