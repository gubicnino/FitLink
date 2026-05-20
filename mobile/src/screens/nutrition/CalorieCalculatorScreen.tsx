import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, Chip, IconButton, Input, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import {
  ActivityLevel,
  CalorieGender,
  CalorieGoal,
  calculateCalories,
} from '../../utils/calorieCalculator';

type Props = NativeStackScreenProps<RootStackParamList, 'CalorieCalculator'>;

const GENDERS: Array<{ label: string; value: CalorieGender }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const GOALS: Array<{ label: string; value: CalorieGoal }> = [
  { label: 'Lose', value: 'lose' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Gain', value: 'gain' },
];

const ACTIVITY_LEVELS: Array<{ label: string; value: ActivityLevel }> = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
  { label: 'Very active', value: 'veryActive' },
];

export function CalorieCalculatorScreen({ navigation }: Props) {
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
      setError('Enter a valid age.');
      setSubmitted(false);
      return;
    }
    if (!parsedHeight || parsedHeight < 80 || parsedHeight > 250) {
      setError('Enter a valid height in cm.');
      setSubmitted(false);
      return;
    }
    if (!parsedWeight || parsedWeight < 25 || parsedWeight > 300) {
      setError('Enter a valid weight in kg.');
      setSubmitted(false);
      return;
    }

    setError(null);
    setSubmitted(true);
  };

  return (
    <Screen scroll edges={['top']} background="surface">
      <ScreenHeader
        title="Calories"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <View style={styles.content}>
        <Card padding="lg">
          <View style={styles.form}>
            <Segment label="Gender">
              {GENDERS.map(item => (
                <Chip
                  key={item.value}
                  label={item.label}
                  selected={gender === item.value}
                  onPress={() => setGender(item.value)}
                />
              ))}
            </Segment>

            <View style={styles.row}>
              <Input
                label="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                containerStyle={styles.col}
              />
              <Input
                label="Height"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="cm"
                containerStyle={styles.col}
              />
            </View>

            <Input
              label="Weight"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              placeholder="kg"
            />

            <Segment label="Activity">
              {ACTIVITY_LEVELS.map(item => (
                <Chip
                  key={item.value}
                  label={item.label}
                  selected={activityLevel === item.value}
                  onPress={() => setActivityLevel(item.value)}
                />
              ))}
            </Segment>

            <Segment label="Goal">
              {GOALS.map(item => (
                <Chip
                  key={item.value}
                  label={item.label}
                  selected={goal === item.value}
                  onPress={() => setGoal(item.value)}
                />
              ))}
            </Segment>

            {error ? (
              <Card padding="md" style={styles.errorCard}>
                <Text variant="bodySmall" style={styles.errorText}>
                  {error}
                </Text>
              </Card>
            ) : null}

            <Button label="Calculate" onPress={handleCalculate} fullWidth />
          </View>
        </Card>

        {result ? (
          <Card padding="lg">
            <Text variant="caption" color="muted" style={styles.resultLabel}>
              Daily target
            </Text>
            <Text mono tabular weight="800" style={styles.calories}>
              {result.calories}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.kcal}>
              kcal / day
            </Text>

            <View style={styles.metrics}>
              <Metric label="BMR" value={result.bmr} unit="kcal" />
              <Metric label="TDEE" value={result.tdee} unit="kcal" />
            </View>

            <View style={styles.macros}>
              <Metric label="Protein" value={result.proteinGrams} unit="g" />
              <Metric label="Carbs" value={result.carbsGrams} unit="g" />
              <Metric label="Fat" value={result.fatGrams} unit="g" />
            </View>

            <Text variant="caption" color="muted" style={styles.disclaimer}>
              This is an estimate. Adjust based on progress over 2-3 weeks.
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function Segment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="caption" color="muted" style={styles.segmentLabel}>
        {label}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <View style={styles.metricValue}>
        <Text mono tabular weight="700" style={styles.metricNumber}>
          {value}
        </Text>
        <Text variant="micro" color="secondary">
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.lg },
  col: { flex: 1 },
  segmentLabel: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  errorCard: { borderColor: colors.danger },
  errorText: { color: colors.danger },
  resultLabel: { marginBottom: spacing.xs },
  calories: { fontSize: 42, lineHeight: 48, color: colors.inkPrimary },
  kcal: { marginBottom: spacing.xl },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xl,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  macros: { flexDirection: 'row', gap: spacing.md },
  disclaimer: { marginTop: spacing.xl, lineHeight: 16 },
  metric: { flex: 1 },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: 2 },
  metricNumber: { fontSize: 16 },
});
