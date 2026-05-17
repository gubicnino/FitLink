import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronRight, Pause, X } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Button, Card, IconButton, Screen, Stepper, Tag, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EXERCISE_IMG =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80&auto=format';

export function LiveWorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const [weight, setWeight] = useState(70);
  const [reps, setReps] = useState(8);

  return (
    <Screen dark scroll edges={['top']}>
      <View style={styles.header}>
        <IconButton variant="dark" size="md" onPress={() => navigation.goBack()}>
          <X size={18} color={colors.white} strokeWidth={2} />
        </IconButton>
        <View style={styles.headerCenter}>
          <Text variant="micro" color="darkTextSecondary" style={styles.headerEyebrow}>
            Push Day
          </Text>
          <Text mono tabular color="darkText" style={styles.timer}>
            23:45
          </Text>
        </View>
        <IconButton variant="dark" size="md" onPress={() => {}}>
          <Pause size={16} color={colors.white} fill={colors.white} strokeWidth={2} />
        </IconButton>
      </View>

      <View style={styles.gutter}>
        <Card variant="dark" padding="none" bordered={false} style={styles.exerciseCard}>
          <View style={styles.imageWrap}>
            <Image source={{ uri: EXERCISE_IMG }} style={styles.image} />
            <View style={styles.imageGradient} />
          </View>
          <View style={styles.exerciseBody}>
            <View style={styles.exerciseTitleRow}>
              <View style={styles.flex}>
                <Text variant="h3" color="darkText" style={{ lineHeight: 22 }}>
                  Bench Press
                </Text>
                <Text variant="bodySmall" color="darkTextSecondary" style={{ marginTop: 2 }}>
                  Set 2 of 4 • Barbell
                </Text>
              </View>
              <Tag label="Active" tone="accent" />
            </View>

            <View style={styles.steppers}>
              <Stepper
                label="Weight"
                value={weight}
                unit="kg"
                dark
                onIncrement={() => setWeight(w => w + 2.5)}
                onDecrement={() => setWeight(w => Math.max(0, w - 2.5))}
                style={styles.stepperItem}
              />
              <Stepper
                label="Reps"
                value={reps}
                dark
                onIncrement={() => setReps(r => r + 1)}
                onDecrement={() => setReps(r => Math.max(0, r - 1))}
                style={styles.stepperItem}
              />
            </View>

            <Button
              label="Complete set"
              variant="accent"
              fullWidth
              leftIcon={<Check size={18} color={colors.white} strokeWidth={2.5} />}
            />
          </View>
        </Card>

        <Text variant="caption" color="darkTextSecondary" style={styles.subLabel}>
          Previous sets
        </Text>
        <Card variant="dark" padding="sm" bordered={false} style={styles.subCard}>
          <View style={styles.prevRow}>
            <View style={styles.checkBadge}>
              <Check size={14} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text variant="bodySmall" color="darkText" weight="500" style={styles.flex}>
              Set 1
            </Text>
            <Text mono tabular color="darkTextSecondary" style={styles.prevValue}>
              70 kg × 8 reps
            </Text>
          </View>
        </Card>

        <Card variant="dark" padding="sm" bordered={false} style={styles.subCard}>
          <View style={styles.upNextRow}>
            <Text variant="caption" color="darkTextSecondary">
              Up next
            </Text>
            <Text variant="bodySmall" color="darkText" weight="600" style={styles.flex}>
              Shoulder Press
            </Text>
            <ChevronRight size={16} color={colors.dark.textSecondary} strokeWidth={2} />
          </View>
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCenter: { alignItems: 'center' },
  headerEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timer: { fontSize: 18 },

  gutter: { paddingHorizontal: spacing.xxl },

  exerciseCard: { overflow: 'hidden', marginBottom: spacing.lg },
  imageWrap: { height: 160, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26,31,38,0.35)',
  },
  exerciseBody: { padding: spacing.xl, gap: spacing.lg },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  steppers: { flexDirection: 'row', gap: spacing.lg },
  stepperItem: { flex: 1 },

  subLabel: { marginBottom: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  subCard: { marginBottom: spacing.lg },
  prevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.successSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevValue: { fontSize: 13 },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  flex: { flex: 1 },
  bottomSpacer: { height: spacing.huge },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _r: { borderRadius: radii.lg },
});
