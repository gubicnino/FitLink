import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import {
  CORE_READ_PERMISSIONS,
  HEALTH_PERMISSIONS,
} from '../constants/healthPermissions';
import type {
  DailyValue,
  ExerciseSession,
  HealthPermissionStatus,
  HealthSnapshot,
  HeartRatePoint,
  SleepSession,
  WeightPoint,
} from '../types/health';

const EMPTY_SNAPSHOT: HealthSnapshot = {
  stepsToday: 0,
  steps7d: [],
  activeCaloriesToday: 0,
  totalCaloriesToday: 0,
  distanceMetersToday: 0,
  floorsToday: 0,
  latestWeight: null,
  weightTrend: [],
  latestHeartRate: null,
  restingHeartRate: null,
  lastSleep: null,
  avgSleepMinutes7d: null,
  hydrationMlToday: 0,
  recentExercises: [],
  bodyFatPercent: null,
  heightCm: null,
  vo2Max: null,
  bmrKcal: null,
  oxygenSaturation: null,
  respiratoryRate: null,
  bodyTemperatureC: null,
  bloodPressure: null,
};


// CENTRALEN HOOK ZA VSE HEALTH CONNECT RELATED PODATKE. 
export function useHealthConnect() {
  const [status, setStatus] = useState<HealthPermissionStatus>('unknown');
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const initialised = useRef(false);

  const ensureInitialised = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setStatus('unavailable');
      return false;
    }
    if (initialised.current) return true;
    try {
      const sdkStatus = await getSdkStatus();
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        setStatus('unavailable');
        return false;
      }
      const ok = await initialize();
      initialised.current = ok;
      return ok;
    } catch (err) {
      console.warn('[hc] initialise failed', err);
      setStatus('unavailable');
      return false;
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!(await ensureInitialised())) return;
    try {
      const granted = await getGrantedPermissions();
      setStatus(classifyPermissions(granted));
    } catch (err) {
      console.warn('[hc] getGrantedPermissions failed', err);
    }
  }, [ensureInitialised]);

  const requestPermissions = useCallback(async () => {
    if (!(await ensureInitialised())) return;
    try {
      const granted = await requestPermission(HEALTH_PERMISSIONS);
      setStatus(classifyPermissions(granted));
    } catch (err) {
      console.warn('[hc] requestPermission failed', err);
      setStatus('denied');
    }
  }, [ensureInitialised]);

  const openSettings = useCallback(() => {
    openHealthConnectSettings();
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (!(await ensureInitialised())) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        stepsToday,
        steps7d,
        activeKcal,
        totalKcal,
        distance,
        floors,
        weight,
        heartRate,
        restingHeartRate,
        sleep,
        sleepWeek,
        hydration,
        exercises,
        bodyFat,
        height,
        vo2,
        bmr,
        spo2,
        respRate,
        bodyTemp,
        bloodPressure,
      ] = await Promise.allSettled([
        aggregateSafe<'Steps', number>({
          recordType: 'Steps',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => Number(r.COUNT_TOTAL ?? 0),
        }),
        groupByDay<'Steps'>({
          recordType: 'Steps',
          startTime: startOfDay(sevenDaysAgo).toISOString(),
          endTime: todayEnd,
          pick: r => Number(r.COUNT_TOTAL ?? 0),
        }),
        aggregateSafe<'ActiveCaloriesBurned', number>({
          recordType: 'ActiveCaloriesBurned',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => pickKcal(r.ACTIVE_CALORIES_TOTAL),
        }),
        aggregateSafe<'TotalCaloriesBurned', number>({
          recordType: 'TotalCaloriesBurned',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => pickKcal(r.ENERGY_TOTAL),
        }),
        aggregateSafe<'Distance', number>({
          recordType: 'Distance',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => Number(r.DISTANCE?.inMeters ?? 0),
        }),
        aggregateSafe<'FloorsClimbed', number>({
          recordType: 'FloorsClimbed',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => Number(r.FLOORS_CLIMBED_TOTAL ?? 0),
        }),
        readWeight(sixtyDaysAgo.toISOString(), todayEnd),
        readHeartRate(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), todayEnd),
        readRestingHeartRate(sevenDaysAgo.toISOString(), todayEnd),
        readLastSleep(new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), todayEnd),
        readSleepWeekAverage(sevenDaysAgo.toISOString(), todayEnd),
        aggregateSafe<'Hydration', number>({
          recordType: 'Hydration',
          startTime: todayStart,
          endTime: todayEnd,
          pick: r => Number(r.VOLUME_TOTAL?.inMilliliters ?? 0),
        }),
        readExerciseSessions(sevenDaysAgo.toISOString(), todayEnd),
        readLatest('BodyFat', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.percentage ?? 0)),
        readLatest('Height', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.height?.inMeters ?? 0) * 100),
        readLatest('Vo2Max', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.vo2MillilitersPerMinuteKilogram ?? 0)),
        readLatest('BasalMetabolicRate', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.basalMetabolicRate?.inKilocaloriesPerDay ?? 0)),
        readLatest('OxygenSaturation', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.percentage ?? 0)),
        readLatest('RespiratoryRate', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.rate ?? 0)),
        readLatest('BodyTemperature', sixtyDaysAgo.toISOString(), todayEnd, r => Number(r.temperature?.inCelsius ?? 0)),
        readLatestBloodPressure(sixtyDaysAgo.toISOString(), todayEnd),
      ]);

      const ws = settled(weight, { latest: null as WeightPoint | null, trend: [] as WeightPoint[] });

      setSnapshot({
        stepsToday: settled(stepsToday, 0),
        steps7d: settled(steps7d, []),
        activeCaloriesToday: settled(activeKcal, 0),
        totalCaloriesToday: settled(totalKcal, 0),
        distanceMetersToday: settled(distance, 0),
        floorsToday: settled(floors, 0),
        latestWeight: ws.latest,
        weightTrend: ws.trend,
        latestHeartRate: settled(heartRate, null as HeartRatePoint | null),
        restingHeartRate: settled(restingHeartRate, null as number | null),
        lastSleep: settled(sleep, null as SleepSession | null),
        avgSleepMinutes7d: settled(sleepWeek, null as number | null),
        hydrationMlToday: settled(hydration, 0),
        recentExercises: settled(exercises, [] as ExerciseSession[]),
        bodyFatPercent: settled(bodyFat, null),
        heightCm: settled(height, null),
        vo2Max: settled(vo2, null),
        bmrKcal: settled(bmr, null),
        oxygenSaturation: settled(spo2, null),
        respiratoryRate: settled(respRate, null),
        bodyTemperatureC: settled(bodyTemp, null),
        bloodPressure: settled(bloodPressure, null as { systolic: number; diastolic: number } | null),
      });
    } catch (err) {
      console.warn('[hc] refreshSnapshot fatal', err);
    } finally {
      setLoading(false);
    }
  }, [ensureInitialised]);

  useEffect(() => {
    (async () => {
      const ok = await ensureInitialised();
      if (!ok) return;
      await refreshPermissions();
    })();
  }, [ensureInitialised, refreshPermissions]);


  const logWeightKg = useCallback(async (kg: number) => {
    if (!(await ensureInitialised())) return;
    const at = new Date().toISOString();
    await insertRecords([
      {
        recordType: 'Weight',
        time: at,
        weight: { value: kg, unit: 'kilograms' },
      },
    ]);
  }, [ensureInitialised]);

  const logStepsNow = useCallback(async (count: number) => {
    if (!(await ensureInitialised())) return;
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    await insertRecords([
      {
        recordType: 'Steps',
        count: Math.max(1, Math.round(count)),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    ]);
  }, [ensureInitialised]);

  const logHydrationMl = useCallback(async (ml: number) => {
    if (!(await ensureInitialised())) return;
    const end = new Date();
    const start = new Date(end.getTime() - 5 * 60 * 1000);
    await insertRecords([
      {
        recordType: 'Hydration',
        volume: { value: ml / 1000, unit: 'liters' },
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    ]);
  }, [ensureInitialised]);

  const logHeartRateBpm = useCallback(async (bpm: number) => {
    if (!(await ensureInitialised())) return;
    const at = new Date().toISOString();
    await insertRecords([
      {
        recordType: 'HeartRate',
        startTime: at,
        endTime: at,
        samples: [{ time: at, beatsPerMinute: Math.round(bpm) }],
      },
    ]);
  }, [ensureInitialised]);


  const seedDemoData = useCallback(async () => {
    if (!(await ensureInitialised())) return;
    const now = new Date();

    const steps: Parameters<typeof insertRecords>[0] = [];
    const weights: Parameters<typeof insertRecords>[0] = [];
    const calories: Parameters<typeof insertRecords>[0] = [];
    const distances: Parameters<typeof insertRecords>[0] = [];
    const floors: Parameters<typeof insertRecords>[0] = [];
    const sleeps: Parameters<typeof insertRecords>[0] = [];
    const heartRates: Parameters<typeof insertRecords>[0] = [];
    const resting: Parameters<typeof insertRecords>[0] = [];
    const hydration: Parameters<typeof insertRecords>[0] = [];
    const exercises: Parameters<typeof insertRecords>[0] = [];
    const bodyFat: Parameters<typeof insertRecords>[0] = [];
    const height: Parameters<typeof insertRecords>[0] = [];
    const bmr: Parameters<typeof insertRecords>[0] = [];
    const vo2: Parameters<typeof insertRecords>[0] = [];
    const spo2: Parameters<typeof insertRecords>[0] = [];
    const respRate: Parameters<typeof insertRecords>[0] = [];
    const bodyTemp: Parameters<typeof insertRecords>[0] = [];
    const bloodPressure: Parameters<typeof insertRecords>[0] = [];

    // Health Connect rejects records whose time is in the future. The seed
    // builder picks plausible hours (08:00, 19:00, etc.) for each day; when
    // i = 0 (today) those hours may not have happened yet, so we cap every
    // candidate at "now". `endOfDay` for today is similarly clamped.
    const clampToNow = (d: Date) => (d.getTime() > now.getTime() ? now : d);

    for (let i = 0; i < 7; i++) {
      const dayStart = startOfDay(new Date(now.getTime() - i * 86400_000));
      const dayEnd = clampToNow(endOfDay(dayStart));
      const morning = clampToNow(new Date(dayStart.getTime() + 8 * 3600_000));

      steps.push({
        recordType: 'Steps',
        count: 5000 + Math.floor(Math.random() * 6000),
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
      });

      weights.push({
        recordType: 'Weight',
        time: morning.toISOString(),
        weight: { value: 80 + (Math.random() - 0.5) * 1.5, unit: 'kilograms' },
      });

      calories.push({
        recordType: 'ActiveCaloriesBurned',
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
        energy: { value: 350 + Math.random() * 300, unit: 'kilocalories' },
      });

      distances.push({
        recordType: 'Distance',
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
        distance: { value: 3 + Math.random() * 5, unit: 'kilometers' },
      });

      floors.push({
        recordType: 'FloorsClimbed',
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
        floors: 5 + Math.floor(Math.random() * 15),
      });

      const sleepStart = clampToNow(new Date(dayStart.getTime() - 2 * 3600_000));
      const sleepEnd = clampToNow(new Date(dayStart.getTime() + 6 * 3600_000));
      if (sleepStart.getTime() < sleepEnd.getTime()) {
        sleeps.push({
          recordType: 'SleepSession',
          startTime: sleepStart.toISOString(),
          endTime: sleepEnd.toISOString(),
          title: 'Night sleep',
        });
      }

      resting.push({
        recordType: 'RestingHeartRate',
        time: morning.toISOString(),
        beatsPerMinute: 55 + Math.floor(Math.random() * 15),
      });

      for (const hour of [10, 14, 18]) {
        const candidate = new Date(dayStart.getTime() + hour * 3600_000);
        if (candidate.getTime() > now.getTime()) continue;
        const endCandidate = clampToNow(new Date(candidate.getTime() + 5 * 60_000));
        hydration.push({
          recordType: 'Hydration',
          startTime: candidate.toISOString(),
          endTime: endCandidate.toISOString(),
          volume: { value: 0.25, unit: 'liters' },
        });
      }

      if (i % 2 === 0) {
        const workoutStart = new Date(dayStart.getTime() + 17 * 3600_000);
        const workoutEnd = new Date(workoutStart.getTime() + 45 * 60_000);
        if (workoutEnd.getTime() <= now.getTime()) {
          exercises.push({
            recordType: 'ExerciseSession',
            startTime: workoutStart.toISOString(),
            endTime: workoutEnd.toISOString(),
            exerciseType: 64, // strength training
            title: 'Strength session',
          });
        }
      }
    }

    const today = startOfDay(now);
    const todayMorning = clampToNow(new Date(today.getTime() + 8 * 3600_000));
    const yesterdayEvening = clampToNow(new Date(today.getTime() - 4 * 3600_000));

    heartRates.push({
      recordType: 'HeartRate',
      startTime: yesterdayEvening.toISOString(),
      endTime: todayMorning.toISOString(),
      samples: [
        { time: yesterdayEvening.toISOString(), beatsPerMinute: 68 },
        { time: new Date(today.getTime()).toISOString(), beatsPerMinute: 62 },
        { time: todayMorning.toISOString(), beatsPerMinute: 72 },
      ],
    });

    bodyFat.push({
      recordType: 'BodyFat',
      time: todayMorning.toISOString(),
      percentage: 18.5,
    });

    height.push({
      recordType: 'Height',
      time: todayMorning.toISOString(),
      height: { value: 1.82, unit: 'meters' },
    });

    bmr.push({
      recordType: 'BasalMetabolicRate',
      time: todayMorning.toISOString(),
      basalMetabolicRate: { value: 1750, unit: 'kilocaloriesPerDay' },
    });

    vo2.push({
      recordType: 'Vo2Max',
      time: todayMorning.toISOString(),
      vo2MillilitersPerMinuteKilogram: 42.5,
      measurementMethod: 1,
    });

    spo2.push({
      recordType: 'OxygenSaturation',
      time: todayMorning.toISOString(),
      percentage: 97,
    });

    respRate.push({
      recordType: 'RespiratoryRate',
      time: todayMorning.toISOString(),
      rate: 14,
    });

    bodyTemp.push({
      recordType: 'BodyTemperature',
      time: todayMorning.toISOString(),
      temperature: { value: 36.6, unit: 'celsius' },
    });

    bloodPressure.push({
      recordType: 'BloodPressure',
      time: todayMorning.toISOString(),
      systolic: { value: 120, unit: 'millimetersOfMercury' },
      diastolic: { value: 78, unit: 'millimetersOfMercury' },
      bodyPosition: 0,
      measurementLocation: 0,
    });

    const allBatches: Array<[string, Parameters<typeof insertRecords>[0]]> = [
      ['Steps', steps],
      ['Weight', weights],
      ['ActiveCaloriesBurned', calories],
      ['Distance', distances],
      ['FloorsClimbed', floors],
      ['SleepSession', sleeps],
      ['HeartRate', heartRates],
      ['RestingHeartRate', resting],
      ['Hydration', hydration],
      ['ExerciseSession', exercises],
      ['BodyFat', bodyFat],
      ['Height', height],
      ['BasalMetabolicRate', bmr],
      ['Vo2Max', vo2],
      ['OxygenSaturation', spo2],
      ['RespiratoryRate', respRate],
      ['BodyTemperature', bodyTemp],
      ['BloodPressure', bloodPressure],
    ];

    const failed: string[] = [];
    for (const [label, batch] of allBatches) {
      if (batch.length === 0) continue;
      try {
        await insertRecords(batch);
        console.warn(`[hc] seed OK ${label} (${batch.length})`);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.warn(`[hc] seed FAIL ${label}: ${msg}`);
        failed.push(`${label}: ${msg}`);
      }
    }
    if (failed.length > 0) {
      throw new Error(failed.join('\n'));
    }
  }, [ensureInitialised]);

  return {
    status,
    snapshot,
    loading,
    refreshPermissions,
    refreshSnapshot,
    requestPermissions,
    openSettings,
    logWeightKg,
    logStepsNow,
    logHydrationMl,
    logHeartRateBpm,
    seedDemoData,
  };
}

function classifyPermissions(
  granted: Array<{ accessType: string; recordType: string }>,
): HealthPermissionStatus {
  if (granted.length === 0) return 'denied';
  const grantedReads = new Set(
    granted.filter(g => g.accessType === 'read').map(g => g.recordType),
  );
  const hasAllCore = CORE_READ_PERMISSIONS.every(rt => grantedReads.has(rt));
  if (!hasAllCore) return 'partial';
  if (granted.length < HEALTH_PERMISSIONS.length) return 'partial';
  return 'granted';
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}


function pickKcal(energy: any): number {
  if (!energy) return 0;
  const kcal = Number(energy.inKilocalories);
  if (Number.isFinite(kcal) && kcal > 0 && kcal < 20000) return kcal;
  const cal = Number(energy.inCalories);
  if (Number.isFinite(cal) && cal > 0) return cal / 1000;
  const joules = Number(energy.inJoules);
  if (Number.isFinite(joules) && joules > 0) return joules / 4184;
  return 0;
}

interface AggregateOpts<R> {
  recordType: 'Steps' | 'ActiveCaloriesBurned' | 'TotalCaloriesBurned' | 'Distance' | 'FloorsClimbed' | 'Hydration';
  startTime: string;
  endTime: string;
  pick: (raw: any) => R;
}

async function aggregateSafe<_T, R>(opts: AggregateOpts<R>): Promise<R> {
  const res: any = await aggregateRecord({
    recordType: opts.recordType as any,
    timeRangeFilter: { operator: 'between', startTime: opts.startTime, endTime: opts.endTime },
  });
  return opts.pick(res);
}

async function groupByDay<_T>(opts: AggregateOpts<number>): Promise<DailyValue[]> {
  const groups: any[] = await aggregateGroupByPeriod({
    recordType: opts.recordType as any,
    timeRangeFilter: { operator: 'between', startTime: opts.startTime, endTime: opts.endTime },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  return groups
    .map(g => ({
      date: (g.startTime as string).slice(0, 10),
      value: opts.pick(g.result),
    }))
    .reverse();
}

async function readWeight(startTime: string, endTime: string): Promise<{ latest: WeightPoint | null; trend: WeightPoint[] }> {
  const res = await readRecords('Weight', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: false,
    pageSize: 60,
  });
  const records = (res.records ?? []) as any[];
  const trend = records
    .map(r => ({ at: r.time as string, kg: Number(r.weight?.inKilograms ?? 0) }))
    .filter(p => p.kg > 0)
    .sort((a, b) => a.at.localeCompare(b.at));
  return { latest: trend[trend.length - 1] ?? null, trend };
}

async function readHeartRate(startTime: string, endTime: string): Promise<HeartRatePoint | null> {
  const res = await readRecords('HeartRate', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: false,
    pageSize: 1,
  });
  const records = (res.records ?? []) as any[];
  const samples: any[] = records[0]?.samples ?? [];
  const last = samples[samples.length - 1];
  if (!last) return null;
  return { at: last.time as string, bpm: Number(last.beatsPerMinute ?? 0) };
}

async function readRestingHeartRate(startTime: string, endTime: string): Promise<number | null> {
  const res = await readRecords('RestingHeartRate', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: false,
    pageSize: 1,
  });
  const records = (res.records ?? []) as any[];
  if (!records[0]) return null;
  return Number(records[0].beatsPerMinute ?? 0);
}

async function readLastSleep(startTime: string, endTime: string): Promise<SleepSession | null> {
  const res = await readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: false,
    pageSize: 1,
  });
  const r = (res.records ?? [])[0] as any;
  if (!r) return null;
  const startAt = r.startTime as string;
  const endAt = r.endTime as string;
  return {
    startAt,
    endAt,
    durationMinutes: Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
  };
}

async function readSleepWeekAverage(startTime: string, endTime: string): Promise<number | null> {
  const res = await readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    pageSize: 50,
  });
  const records = (res.records ?? []) as any[];
  if (records.length === 0) return null;
  const minutes = records.map(r => (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000);
  const sum = minutes.reduce((a, b) => a + b, 0);
  return Math.round(sum / records.length);
}

async function readExerciseSessions(startTime: string, endTime: string): Promise<ExerciseSession[]> {
  const res = await readRecords('ExerciseSession', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: false,
    pageSize: 20,
  });
  const records = (res.records ?? []) as any[];
  return records.map(r => ({
    startAt: r.startTime as string,
    endAt: r.endTime as string,
    durationMinutes: Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000),
    title: r.title ?? r.notes ?? null,
    exerciseType: r.exerciseType ?? null,
  }));
}

async function readLatest(
  recordType: any,
  startTime: string,
  endTime: string,
  pick: (raw: any) => number,
): Promise<number | null> {
  try {
    const res = await readRecords(recordType, {
      timeRangeFilter: { operator: 'between', startTime, endTime },
      ascendingOrder: false,
      pageSize: 1,
    });
    const r = (res.records ?? [])[0];
    if (!r) return null;
    const v = pick(r);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

async function readLatestBloodPressure(startTime: string, endTime: string): Promise<{ systolic: number; diastolic: number } | null> {
  try {
    const res = await readRecords('BloodPressure', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
      ascendingOrder: false,
      pageSize: 1,
    });
    const r = (res.records ?? [])[0] as any;
    if (!r) return null;
    const sys = Number(r.systolic?.inMillimetersOfMercury ?? 0);
    const dia = Number(r.diastolic?.inMillimetersOfMercury ?? 0);
    if (!sys || !dia) return null;
    return { systolic: sys, diastolic: dia };
  } catch {
    return null;
  }
}
