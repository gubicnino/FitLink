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

import { Swipeable } from 'react-native-gesture-handler';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Trash2 } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Button, Screen, TabSwitcher, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { WorkoutTemplateCard, WorkoutTemplate as CardTemplate } from './WorkoutTemplateCard';
import { SessionHistoryCard } from './SessionHistoryCard';
import { workoutApi } from '../../api/workoutApi';
import type { WorkoutSession, WorkoutTemplate } from '../../types/workout';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TABS = ['Templates', 'History'] as const;
type Tab = (typeof TABS)[number];

export function WorkoutsListScreen() {
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
        workoutApi.listTemplates(),
        workoutApi.listSessions(),
      ]);
      setTemplates(t);
      setSessions(s);
    } catch (err) {
      setError(extractMessage(err));
    }
  }, []);

  // refetch on screen takka se newly created templati vidijo vcasii.
  // useFocusEffect ze sprozi load tudi on initial mount, takka extra useEffect ni potreben.
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

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="My Workouts"
        right={
          <Button
            label="New"
            size="sm"
            leftIcon={<Plus size={15} color={colors.white} strokeWidth={2.5} />}
            onPress={() => navigation.navigate('ExercisePicker', { mode: 'select' })}
          />
        }
      />

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
            templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                hint='Tap "+ New" in the top right to create your first workout template from the exercise library.'
              />
            ) : (
              <View style={styles.list}>
                {templates.map(t => (
                  <WorkoutTemplateCard
                    key={t.id}
                    template={toCardTemplate(t)}
                    onPress={() => navigation.navigate('TemplateDetail', { templateId: t.id })}
                  />
                ))}
              </View>
            )
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No completed workouts yet"
              hint="Start a session from a template to see your history here."
            />
          ) : (
            <View style={styles.list}>
              <Text variant="caption" color="muted" style={styles.swipeHint}>
                Swipe left on a workout to delete
              </Text>
              {sessions.map(s => (
                <SwipeableHistoryRow
                  key={s.id}
                  session={s}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
                  onDelete={() => onDeleteSession(s)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

    </Screen>
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

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Text variant="bodyLarge" weight="600" align="center">
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
        {hint}
      </Text>
    </View>
  );
}

function toCardTemplate(t: WorkoutTemplate): CardTemplate {
  return {
    id: t.id,
    name: t.name,
    exerciseCount: t.exercises?.length ?? 0,
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
  scrollContent: { paddingBottom: spacing.huge + 60 },
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, gap: spacing.md },
  swipeHint: { paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  empty: { padding: spacing.huge + spacing.xl, alignItems: 'center', gap: spacing.md },
  detail: { paddingHorizontal: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  retry: { marginTop: spacing.md },
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
