import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Button, Screen, TabSwitcher, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { WorkoutTemplateCard, WorkoutTemplate as CardTemplate } from './WorkoutTemplateCard';
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
              {sessions.map(s => (
                <WorkoutTemplateCard
                  key={s.id}
                  template={toCardSession(s)}
                  onPress={() => navigation.navigate('LiveWorkout', { workoutId: s.id })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

    </Screen>
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

function toCardSession(s: WorkoutSession): CardTemplate {
  return {
    id: s.id,
    name: s.name,
    exerciseCount: s.exercises?.length ?? 0,
    durationMinutes: s.durationMinutes || undefined,
    lastUsed: s.finishedAt ? relativeTime(s.finishedAt) : undefined,
  };
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
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
});
