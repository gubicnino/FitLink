export type CalorieGender = 'male' | 'female';
export type CalorieGoal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';

export interface CalorieInput {
  gender: CalorieGender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: CalorieGoal;
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export function calculateCalories(input: CalorieInput): CalorieResult {
  const bmr =
    input.gender === 'male'
      ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
      : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;

  const tdee = bmr * activityMultipliers[input.activityLevel];
  const calories =
    input.goal === 'lose' ? tdee - 500 : input.goal === 'gain' ? tdee + 300 : tdee;

  const proteinGrams = input.weightKg * 1.8;
  const fatGrams = input.weightKg * 0.8;
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const carbsGrams = Math.max(0, (calories - proteinCalories - fatCalories) / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    proteinGrams: Math.round(proteinGrams),
    fatGrams: Math.round(fatGrams),
    carbsGrams: Math.round(carbsGrams),
  };
}
