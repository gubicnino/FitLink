// Vse metriki in njihovi tipi zaa health podatke za UI

export interface DailyValue {
  date: string;
  value: number;
}

export interface WeightPoint {
  at: string;
  kg: number;
}

export interface HeartRatePoint {
  at: string;
  bpm: number;
}

export interface SleepSession {
  startAt: string;
  endAt: string;
  durationMinutes: number;
}

export interface ExerciseSession {
  startAt: string;
  endAt: string;
  durationMinutes: number;
  title: string | null;
  exerciseType: number | null;
}

export interface HealthSnapshot {
  stepsToday: number;
  steps7d: DailyValue[];
  activeCaloriesToday: number;
  totalCaloriesToday: number;
  distanceMetersToday: number;
  floorsToday: number;
  latestWeight: WeightPoint | null;
  weightTrend: WeightPoint[];
  latestHeartRate: HeartRatePoint | null;
  restingHeartRate: number | null;
  lastSleep: SleepSession | null;
  avgSleepMinutes7d: number | null;
  hydrationMlToday: number;
  recentExercises: ExerciseSession[];

  bodyFatPercent: number | null;
  heightCm: number | null;
  vo2Max: number | null;
  bmrKcal: number | null;
  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  bodyTemperatureC: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
}

export type HealthPermissionStatus =
  | 'unknown'
  | 'granted'
  | 'partial'
  | 'denied'
  | 'unavailable';
