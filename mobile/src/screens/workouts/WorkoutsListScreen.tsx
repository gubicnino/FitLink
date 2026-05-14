import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Button, Screen, TabSwitcher, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { WorkoutTemplateCard, WorkoutTemplate } from './WorkoutTemplateCard';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TEMPLATES: WorkoutTemplate[] = [
  { id: 'push', name: 'Push Day', exerciseCount: 5, durationMinutes: 45, lastUsed: '2 days ago', tag: 'Strength' },
  { id: 'pull', name: 'Pull Day', exerciseCount: 6, durationMinutes: 50, lastUsed: '4 days ago', tag: 'Strength' },
  { id: 'legs', name: 'Legs', exerciseCount: 7, durationMinutes: 60, lastUsed: '6 days ago', tag: 'Strength' },
  { id: 'upper', name: 'Upper Body Hypertrophy', exerciseCount: 8, durationMinutes: 55, lastUsed: '1 week ago', tag: 'Hypertrophy' },
  { id: 'cond', name: 'Conditioning', exerciseCount: 5, durationMinutes: 30, lastUsed: '2 weeks ago', tag: 'Cardio' },
];

const TABS = ['Templates', 'History'] as const;
type Tab = (typeof TABS)[number];

export function WorkoutsListScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('Templates');

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="My Workouts"
        right={
          <Button label="New" size="sm" leftIcon={<Plus size={15} color={colors.white} strokeWidth={2.5} />} />
        }
      />

      <View style={styles.gutter}>
        <TabSwitcher<Tab> tabs={TABS} value={tab} onChange={setTab} />
      </View>

      <View style={[styles.gutter, styles.list]}>
        {tab === 'Templates' ? (
          TEMPLATES.map(t => (
            <WorkoutTemplateCard
              key={t.id}
              template={t}
              onPress={() => navigation.navigate('LiveWorkout', { workoutId: t.id })}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text variant="body" color="secondary" align="center">
              No completed workouts yet.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityLabel="Create workout"
        onPress={() => {}}
        style={({ pressed }) => [styles.fab, shadows.fab, pressed && { opacity: 0.9 }]}
      >
        <Plus size={26} color={colors.white} strokeWidth={2.5} />
      </Pressable>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  list: { marginTop: spacing.xxl, gap: spacing.md },
  empty: {
    paddingVertical: spacing.huge + spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: spacing.huge,
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: { height: spacing.huge },
});
