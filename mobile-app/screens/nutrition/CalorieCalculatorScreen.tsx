import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Activity,
  AlertCircle,
  Beef,
  ChevronLeft,
  Flame,
  Info,
  Mars,
  Ruler,
  Target,
  TrendingDown,
  TrendingUp,
  Venus,
  Wheat,
  Zap,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ScreenHeader } from '@/components/layout';
import { Button, IconButton, Screen, Text } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import {
  ActivityLevel,
  CalorieGender,
  CalorieGoal,
  calculateCalories,
} from '@/utils/calorieCalculator';

type Props = NativeStackScreenProps<RootStackParamList, 'CalorieCalculator'>;

const GENDERS: { label: string; value: CalorieGender; icon: 'male' | 'female' }[] = [
  { label: 'Male', value: 'male', icon: 'male' },
  { label: 'Female', value: 'female', icon: 'female' },
];

const GOALS: { label: string; value: CalorieGoal; icon: 'down' | 'target' | 'up' }[] = [
  { label: 'Lose', value: 'lose', icon: 'down' },
  { label: 'Maintain', value: 'maintain', icon: 'target' },
  { label: 'Gain', value: 'gain', icon: 'up' },
];

const ACTIVITY_LEVELS: { label: string; value: ActivityLevel; hint: string }[] = [
  { label: 'Sedentary', value: 'sedentary', hint: 'Desk job, little or no exercise' },
  { label: 'Light', value: 'light', hint: '1–3 light workouts per week' },
  { label: 'Moderate', value: 'moderate', hint: '3–5 workouts per week' },
  { label: 'Active', value: 'active', hint: '6–7 workouts per week' },
  { label: 'Very active', value: 'veryActive', hint: 'Twice a day or physical job' },
];

export function CalorieCalculatorScreen() {
  const navigation = useAppNavigation();
  const [gender, setGender] = useState<CalorieGender>('male');
  const [goal, setGoal] = useState<CalorieGoal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;
    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    if (!parsedAge || !parsedHeight || !parsedWeight) return null;
    return calculateCalories({
      gender,
      goal,
      activityLevel,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
    });
  }, [activityLevel, age, gender, goal, heightCm, submitted, weightKg]);

  const handleCalculate = () => {
    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    if (!parsedAge || parsedAge < 10 || parsedAge > 100) {
      setError('Enter a valid age (10–100).');
      setSubmitted(false);
      return;
    }
    if (!parsedHeight || parsedHeight < 80 || parsedHeight > 250) {
      setError('Enter a valid height (80–250 cm).');
      setSubmitted(false);
      return;
    }
    if (!parsedWeight || parsedWeight < 25 || parsedWeight > 300) {
      setError('Enter a valid weight (25–300 kg).');
      setSubmitted(false);
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <Screen edges={['top']} keyboardAware>
      <ScreenHeader
        title="Calories"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero ----------------------------------------------- */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, shadows.card]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroIcon}>
              <Flame size={20} color={colors.accent} strokeWidth={2.5} />
            </View>
            <Text variant="micro" weight="800" style={styles.heroEyebrow}>
              CALORIE CALCULATOR
            </Text>
            <Text style={styles.heroTitle}>Daily energy target</Text>
            <Text style={styles.heroSub}>
              Get your BMR, TDEE and macros based on your stats and goal.
            </Text>
          </View>
        </View>

        {/* Gender -------------------------------------------- */}
        <SectionHeader label="GENDER" />
        <View style={styles.gutter}>
          <View style={styles.genderRow}>
            {GENDERS.map(g => {
              const active = gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  onPress={() => setGender(g.value)}
                  style={({ pressed }) => [
                    styles.genderCard,
                    active && styles.genderCardActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.genderIcon, active && styles.genderIconActive]}>
                    {g.icon === 'male' ? (
                      <Mars
                        size={20}
                        color={active ? colors.primary : colors.inkSecondary}
                        strokeWidth={2.25}
                      />
                    ) : (
                      <Venus
                        size={20}
                        color={active ? colors.primary : colors.inkSecondary}
                        strokeWidth={2.25}
                      />
                    )}
                  </View>
                  <Text
                    variant="bodySmall"
                    weight="800"
                    style={{ color: active ? colors.primary : colors.inkPrimary, letterSpacing: -0.1 }}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Body ---------------------------------------------- */}
        <SectionHeader label="BODY" />
        <View style={styles.gutter}>
          <View style={styles.bodyRow}>
            <NumberField
              label="Age"
              value={age}
              onChangeText={setAge}
              suffix="yrs"
            />
            <NumberField
              label="Height"
              value={heightCm}
              onChangeText={setHeightCm}
              suffix="cm"
            />
            <NumberField
              label="Weight"
              value={weightKg}
              onChangeText={setWeightKg}
              suffix="kg"
            />
          </View>
        </View>

        {/* Activity ------------------------------------------ */}
        <SectionHeader label="ACTIVITY" />
        <View style={styles.gutter}>
          <View style={styles.activityList}>
            {ACTIVITY_LEVELS.map((a, idx) => {
              const active = activityLevel === a.value;
              return (
                <Pressable
                  key={a.value}
                  onPress={() => setActivityLevel(a.value)}
                  style={({ pressed }) => [
                    styles.activityRow,
                    idx > 0 && styles.activityRowDivider,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={[styles.activityRadio, active && styles.activityRadioActive]}>
                    {active ? <View style={styles.activityRadioDot} /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      variant="bodySmall"
                      weight="800"
                      style={{ color: active ? colors.primary : colors.inkPrimary, letterSpacing: -0.1 }}
                    >
                      {a.label}
                    </Text>
                    <Text variant="micro" color="muted" numberOfLines={1}>
                      {a.hint}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Goal ---------------------------------------------- */}
        <SectionHeader label="GOAL" />
        <View style={styles.gutter}>
          <View style={styles.goalRow}>
            {GOALS.map(g => {
              const active = goal === g.value;
              return (
                <Pressable
                  key={g.value}
                  onPress={() => setGoal(g.value)}
                  style={({ pressed }) => [
                    styles.goalCard,
                    active && styles.goalCardActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.goalIcon, active && styles.goalIconActive]}>
                    {g.icon === 'down' ? (
                      <TrendingDown
                        size={16}
                        color={active ? colors.white : colors.inkSecondary}
                        strokeWidth={2.5}
                      />
                    ) : g.icon === 'up' ? (
                      <TrendingUp
                        size={16}
                        color={active ? colors.white : colors.inkSecondary}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Target
                        size={16}
                        color={active ? colors.white : colors.inkSecondary}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                  <Text
                    variant="bodySmall"
                    weight="800"
                    style={{ color: active ? colors.primary : colors.inkPrimary, letterSpacing: -0.1 }}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Error --------------------------------------------- */}
        {error ? (
          <View style={[styles.gutter, { marginTop: spacing.md }]}>
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.danger} strokeWidth={2.25} />
              <Text variant="bodySmall" weight="600" color="danger" style={{ flex: 1 }}>
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {/* CTA ----------------------------------------------- */}
        <View style={[styles.gutter, { marginTop: spacing.xl }]}>
          <Button
            label="Calculate"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleCalculate}
            leftIcon={<Zap size={16} color={colors.white} strokeWidth={2.5} />}
          />
        </View>

        {/* Result -------------------------------------------- */}
        {result ? (
          <>
            <SectionHeader label="YOUR TARGET" />
            <View style={styles.gutter}>
              <ResultCard result={result} goal={goal} />
            </View>

            <SectionHeader label="MACROS" />
            <View style={styles.gutter}>
              <MacroBreakdown result={result} />
            </View>

            <View style={[styles.gutter, { marginTop: spacing.xl }]}>
              <View style={styles.disclaimer}>
                <Info size={14} color={colors.inkMuted} strokeWidth={2} />
                <Text variant="micro" color="muted" style={{ flex: 1, lineHeight: 16 }}>
                  This is an estimate. Track your weight over 2–3 weeks and adjust calories by
                  ±100–200 kcal/day based on your progress.
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text variant="caption" weight="800" style={styles.sectionLabel}>
        {label}
      </Text>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  suffix: string;
}) {
  return (
    <View style={styles.numberField}>
      <Text variant="micro" weight="800" style={styles.numberLabel}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.numberInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.inkMuted}
          style={styles.numberInput}
          maxLength={4}
        />
        <Text style={styles.numberSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function ResultCard({
  result,
  goal,
}: {
  result: ReturnType<typeof calculateCalories>;
  goal: CalorieGoal;
}) {
  const diffFromTdee = result.calories - result.tdee;
  const goalCopy =
    goal === 'lose' ? 'Calorie deficit' : goal === 'gain' ? 'Calorie surplus' : 'Maintenance';
  return (
    <View style={[styles.resultCard, shadows.card]}>
      <View style={styles.resultGlow} />

      <Text variant="micro" weight="800" style={styles.resultEyebrow}>
        DAILY TARGET
      </Text>
      <View style={styles.resultBigRow}>
        <Text mono tabular style={styles.resultBigValue}>
          {result.calories.toLocaleString()}
        </Text>
        <Text style={styles.resultBigUnit}>kcal</Text>
      </View>

      <View style={styles.resultGoalPill}>
        <Text style={styles.resultGoalText}>
          {goalCopy}
          {diffFromTdee !== 0
            ? `  ${diffFromTdee > 0 ? '+' : '−'}${Math.abs(diffFromTdee)} vs TDEE`
            : ''}
        </Text>
      </View>

      <View style={styles.resultMetricsRow}>
        <ResultMetric
          icon={<Activity size={13} color={colors.white} strokeWidth={2.5} />}
          label="BMR"
          value={result.bmr.toLocaleString()}
          unit="kcal"
        />
        <View style={styles.resultMetricDivider} />
        <ResultMetric
          icon={<Ruler size={13} color={colors.white} strokeWidth={2.5} />}
          label="TDEE"
          value={result.tdee.toLocaleString()}
          unit="kcal"
        />
      </View>
    </View>
  );
}

function ResultMetric({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={styles.resultMetricHeader}>
        <View style={styles.resultMetricIcon}>{icon}</View>
        <Text style={styles.resultMetricLabel}>{label}</Text>
      </View>
      <View style={styles.resultMetricValueRow}>
        <Text mono tabular style={styles.resultMetricValue}>{value}</Text>
        <Text style={styles.resultMetricUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function MacroBreakdown({
  result,
}: {
  result: ReturnType<typeof calculateCalories>;
}) {
  const proteinCal = result.proteinGrams * 4;
  const carbsCal = result.carbsGrams * 4;
  const fatCal = result.fatGrams * 9;
  const total = Math.max(1, proteinCal + carbsCal + fatCal);
  const proteinPct = (proteinCal / total) * 100;
  const carbsPct = (carbsCal / total) * 100;
  const fatPct = (fatCal / total) * 100;

  return (
    <View style={styles.macroCard}>
      <View style={styles.macroBar}>
        <View style={[styles.macroBarSegment, { flex: proteinPct, backgroundColor: colors.primary }]} />
        <View style={[styles.macroBarSegment, { flex: carbsPct, backgroundColor: colors.accent }]} />
        <View style={[styles.macroBarSegment, { flex: fatPct, backgroundColor: colors.warning }]} />
      </View>

      <View style={styles.macroRows}>
        <MacroRow
          color={colors.primary}
          icon={<Beef size={14} color={colors.primary} strokeWidth={2.25} />}
          label="Protein"
          grams={result.proteinGrams}
          pct={proteinPct}
        />
        <View style={styles.macroDivider} />
        <MacroRow
          color={colors.accent}
          icon={<Wheat size={14} color={colors.accent} strokeWidth={2.25} />}
          label="Carbs"
          grams={result.carbsGrams}
          pct={carbsPct}
        />
        <View style={styles.macroDivider} />
        <MacroRow
          color={colors.warning}
          icon={<Flame size={14} color={colors.warning} strokeWidth={2.25} />}
          label="Fat"
          grams={result.fatGrams}
          pct={fatPct}
        />
      </View>
    </View>
  );
}

function MacroRow({
  color,
  icon,
  label,
  grams,
  pct,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  grams: number;
  pct: number;
}) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroIcon, { backgroundColor: hexA(color, 0.14) }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmall" weight="800" style={{ letterSpacing: -0.1 }}>
          {label}
        </Text>
        <Text variant="micro" color="muted">
          {Math.round(pct)}% of calories
        </Text>
      </View>
      <View style={styles.macroValueRow}>
        <Text mono tabular weight="800" style={styles.macroValue}>
          {grams}
        </Text>
        <Text style={styles.macroUnit}>g</Text>
      </View>
    </View>
  );
}

function hexA(hex: string, alpha: number): string {
  // Accept #RRGGBB; ignore other formats.
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 40, paddingTop: spacing.xs },
  gutter: { paddingHorizontal: spacing.xxl },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: colors.white,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },

  // Gender
  genderRow: { flexDirection: 'row', gap: spacing.md },
  genderCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
  },
  genderCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  genderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderIconActive: {
    backgroundColor: colors.primarySoftStrong,
  },

  // Body
  bodyRow: { flexDirection: 'row', gap: spacing.md },
  numberField: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 4,
  },
  numberLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.inkMuted,
  },
  numberInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  numberInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.inkPrimary,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  numberSuffix: { fontSize: 11, color: colors.inkSecondary, fontWeight: '700' },

  // Activity
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  activityRowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  activityRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityRadioActive: { borderColor: colors.primary },
  activityRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Goal
  goalRow: { flexDirection: 'row', gap: spacing.md },
  goalCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconActive: {
    backgroundColor: colors.primary,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },

  // Result card
  resultCard: {
    backgroundColor: colors.dark.bg,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  resultGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  resultEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
  },
  resultBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  resultBigValue: {
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.8,
    fontWeight: '800',
    color: colors.white,
  },
  resultBigUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  resultGoalPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  resultGoalText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.accent,
  },
  resultMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  resultMetricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: spacing.md,
  },
  resultMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultMetricIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMetricLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  resultMetricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  resultMetricValue: {
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: colors.white,
  },
  resultMetricUnit: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  // Macro breakdown
  macroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  macroBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  macroBarSegment: { height: '100%' },
  macroRows: { gap: 0 },
  macroDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  macroIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  macroValue: {
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.inkPrimary,
  },
  macroUnit: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
});
