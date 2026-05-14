import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Camera, ChevronLeft, Lock, TrendingDown } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import {
  Button,
  Card,
  IconButton,
  Screen,
  Tag,
  Text,
  Textarea,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { MoodPicker, MoodOption } from './MoodPicker';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MOODS: MoodOption[] = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Below avg' },
  { value: 3, label: 'Average' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' },
];

export function WeeklyCheckInScreen() {
  const navigation = useNavigation<Nav>();
  const [notes, setNotes] = useState(
    'Sleep was solid most nights. Felt strong in the gym, especially on push day. Considering bumping volume on legs.',
  );
  const [mood, setMood] = useState(4);

  return (
    <Screen scroll keyboardAware edges={['top']}>
      <ScreenHeader
        title="Weekly Check-in"
        eyebrow="May 6 — May 12"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
        right={<Tag label="Week 6" tone="primary" uppercase />}
      />

      <View style={styles.gutter}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Progress photo
        </Text>
        <Pressable style={styles.photoCard}>
          <View style={styles.photoIcon}>
            <Camera size={20} color={colors.inkSecondary} strokeWidth={1.75} />
          </View>
          <Text variant="bodySmall" weight="600" style={styles.photoTitle}>
            Tap to take photo
          </Text>
          <View style={styles.photoMeta}>
            <Lock size={10} color={colors.inkSecondary} strokeWidth={2} />
            <Text variant="micro" color="secondary">
              {' '}
              Shared only with your coach
            </Text>
          </View>
        </Pressable>

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Body weight
        </Text>
        <Card padding="md" style={styles.section}>
          <View style={styles.weightRow}>
            <View style={styles.weightValue}>
              <Text mono tabular style={styles.weightNumber}>
                75.2
              </Text>
              <Text variant="bodySmall" color="secondary" weight="500" style={styles.weightUnit}>
                kg
              </Text>
            </View>
            <View style={styles.deltaBadge}>
              <TrendingDown size={13} color={colors.success} strokeWidth={2.25} />
              <Text mono tabular weight="600" style={styles.deltaText}>
                -0.8 kg
              </Text>
            </View>
          </View>
          <Text variant="micro" color="secondary">
            From last week
          </Text>
        </Card>

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          How did you feel this week?
        </Text>
        <Textarea value={notes} onChangeText={setNotes} rows={3} containerStyle={styles.section} />

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Overall energy
        </Text>
        <View style={styles.section}>
          <MoodPicker options={MOODS} value={mood} onChange={setMood} />
        </View>

        <Button label="Submit check-in" variant="accent" fullWidth style={styles.cta} />
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  sectionLabel: { marginBottom: spacing.md, marginTop: spacing.md },
  section: { marginBottom: spacing.xl },

  photoCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  photoTitle: { marginBottom: spacing.xs },
  photoMeta: { flexDirection: 'row', alignItems: 'center' },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weightValue: { flexDirection: 'row', alignItems: 'baseline' },
  weightNumber: { fontSize: 32, fontWeight: '700', lineHeight: 32 },
  weightUnit: { marginLeft: 4 },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.xs,
    backgroundColor: colors.successSoft,
  },
  deltaText: { fontSize: 11, color: colors.success },

  cta: { marginTop: spacing.xl },
  bottomSpacer: { height: spacing.huge },
});
