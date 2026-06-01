import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { healthApi, type HealthSnapshotUpload } from '../api/healthApi';


export async function triggerHealthSync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!auth().currentUser) return;

  try {
    const sdkStatus = await getSdkStatus();
    if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) return;
    const ok = await initialize();
    if (!ok) return;

    const granted = await getGrantedPermissions();
    if (!granted.some(g => g.accessType === 'read' && g.recordType === 'Steps')) return;

    const now = new Date();
    const startOfDay = (d: Date) => { const o = new Date(d); o.setHours(0, 0, 0, 0); return o; };
    const endOfDay = (d: Date) => { const o = new Date(d); o.setHours(23, 59, 59, 999); return o; };
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 86400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400_000);
    const last24h = new Date(now.getTime() - 24 * 3600_000);
    const last48h = new Date(now.getTime() - 48 * 3600_000);

    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };

    const pickKcal = (energy: any): number => {
      if (!energy) return 0;
      const kcal = Number(energy.inKilocalories);
      if (Number.isFinite(kcal) && kcal > 0 && kcal < 20000) return kcal;
      const cal = Number(energy.inCalories);
      if (Number.isFinite(cal) && cal > 0) return cal / 1000;
      const joules = Number(energy.inJoules);
      if (Number.isFinite(joules) && joules > 0) return joules / 4184;
      return 0;
    };

    // --- Aggregates ---
    const stepsToday = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return Number(r.COUNT_TOTAL ?? 0);
    }, 0);

    const activeKcal = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return pickKcal(r.ACTIVE_CALORIES_TOTAL);
    }, 0);

    const totalKcal = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'TotalCaloriesBurned',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return pickKcal(r.ENERGY_TOTAL);
    }, 0);

    const distance = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'Distance',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return Number(r.DISTANCE?.inMeters ?? 0);
    }, 0);

    const floors = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'FloorsClimbed',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return Number(r.FLOORS_CLIMBED_TOTAL ?? 0);
    }, 0);

    const hydration = await safe(async () => {
      const r: any = await aggregateRecord({
        recordType: 'Hydration',
        timeRangeFilter: { operator: 'between', startTime: todayStart, endTime: todayEnd },
      });
      return Number(r.VOLUME_TOTAL?.inMilliliters ?? 0);
    }, 0);

    const steps7d = await safe(async () => {
      const groups: any[] = await aggregateGroupByPeriod({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay(sevenDaysAgo).toISOString(),
          endTime: todayEnd,
        },
        timeRangeSlicer: { period: 'DAYS', length: 1 },
      });
      return groups
        .map(g => ({ date: (g.startTime as string).slice(0, 10), value: Number(g.result.COUNT_TOTAL ?? 0) }))
        .reverse();
    }, [] as { date: string; value: number }[]);

    const weight = await safe(async () => {
      const res = await readRecords('Weight', {
        timeRangeFilter: { operator: 'between', startTime: sixtyDaysAgo.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 60,
      });
      const records = (res.records ?? []) as any[];
      const trend = records
        .map(r => ({ at: r.time as string, kg: Number(r.weight?.inKilograms ?? 0) }))
        .filter(p => p.kg > 0)
        .sort((a, b) => a.at.localeCompare(b.at));
      return { latest: trend[trend.length - 1] ?? null, trend };
    }, { latest: null as { at: string; kg: number } | null, trend: [] as { at: string; kg: number }[] });

    const heart = await safe(async () => {
      const res = await readRecords('HeartRate', {
        timeRangeFilter: { operator: 'between', startTime: last24h.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 1,
      });
      const records = (res.records ?? []) as any[];
      const samples: any[] = records[0]?.samples ?? [];
      const last = samples[samples.length - 1];
      if (!last) return null;
      return { at: last.time as string, bpm: Number(last.beatsPerMinute ?? 0) };
    }, null as { at: string; bpm: number } | null);

    const restingHR = await safe(async () => {
      const res = await readRecords('RestingHeartRate', {
        timeRangeFilter: { operator: 'between', startTime: sevenDaysAgo.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 1,
      });
      const r = (res.records ?? [])[0] as any;
      return r ? Number(r.beatsPerMinute ?? 0) : null;
    }, null as number | null);

    const lastSleep = await safe(async () => {
      const res = await readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: last48h.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 1,
      });
      const r = (res.records ?? [])[0] as any;
      if (!r) return null;
      const startAt = r.startTime as string;
      const endAt = r.endTime as string;
      const minutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
      return { endAt, minutes };
    }, null as { endAt: string; minutes: number } | null);

    const avgSleep7d = await safe(async () => {
      const res = await readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: sevenDaysAgo.toISOString(), endTime: todayEnd },
        pageSize: 50,
      });
      const records = (res.records ?? []) as any[];
      if (records.length === 0) return null;
      const mins = records.map(r => (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000);
      return Math.round(mins.reduce((a, b) => a + b, 0) / records.length);
    }, null as number | null);

    const exerciseSessions = await safe(async () => {
      const res = await readRecords('ExerciseSession', {
        timeRangeFilter: { operator: 'between', startTime: sevenDaysAgo.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 20,
      });
      const records = (res.records ?? []) as any[];
      return records.map(r => ({
        startAt: r.startTime as string,
        endAt: r.endTime as string,
        durationMinutes: Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000),
        title: (r.title ?? r.notes ?? null) as string | null,
        exerciseType: (r.exerciseType ?? null) as number | null,
      }));
    }, [] as HealthSnapshotUpload['recentExercises']);

    const readLatest = async (recordType: any, pick: (r: any) => number): Promise<number | null> => {
      return safe(async () => {
        const res = await readRecords(recordType, {
          timeRangeFilter: { operator: 'between', startTime: sixtyDaysAgo.toISOString(), endTime: todayEnd },
          ascendingOrder: false,
          pageSize: 1,
        });
        const r = (res.records ?? [])[0];
        if (!r) return null;
        const v = pick(r);
        return Number.isFinite(v) && v > 0 ? v : null;
      }, null);
    };

    const bodyFat = await readLatest('BodyFat', r => Number(r.percentage ?? 0));
    const heightCm = await readLatest('Height', r => Number(r.height?.inMeters ?? 0) * 100);
    const vo2Max = await readLatest('Vo2Max', r => Number(r.vo2MillilitersPerMinuteKilogram ?? 0));
    const bmrKcal = await readLatest('BasalMetabolicRate', r => Number(r.basalMetabolicRate?.inKilocaloriesPerDay ?? 0));
    const spo2 = await readLatest('OxygenSaturation', r => Number(r.percentage ?? 0));
    const respRate = await readLatest('RespiratoryRate', r => Number(r.rate ?? 0));
    const bodyTemp = await readLatest('BodyTemperature', r => Number(r.temperature?.inCelsius ?? 0));

    const bp = await safe(async () => {
      const res = await readRecords('BloodPressure', {
        timeRangeFilter: { operator: 'between', startTime: sixtyDaysAgo.toISOString(), endTime: todayEnd },
        ascendingOrder: false,
        pageSize: 1,
      });
      const r = (res.records ?? [])[0] as any;
      if (!r) return null;
      const sys = Number(r.systolic?.inMillimetersOfMercury ?? 0);
      const dia = Number(r.diastolic?.inMillimetersOfMercury ?? 0);
      if (!sys || !dia) return null;
      return { systolic: sys, diastolic: dia };
    }, null as { systolic: number; diastolic: number } | null);

    const payload: HealthSnapshotUpload = {
      stepsToday,
      activeCaloriesToday: activeKcal,
      totalCaloriesToday: totalKcal,
      distanceMetersToday: distance,
      floorsToday: floors,
      steps7d,
      latestWeightKg: weight.latest?.kg ?? null,
      latestWeightAt: weight.latest?.at ?? null,
      weightTrend: weight.trend,
      bodyFatPercent: bodyFat,
      heightCm,
      bmrKcal,
      latestHeartRateBpm: heart?.bpm ?? null,
      latestHeartRateAt: heart?.at ?? null,
      restingHeartRate: restingHR,
      lastSleepMinutes: lastSleep?.minutes ?? null,
      lastSleepEndedAt: lastSleep?.endAt ?? null,
      avgSleepMinutes7d: avgSleep7d,
      vo2Max,
      oxygenSaturation: spo2,
      respiratoryRate: respRate,
      bodyTemperatureC: bodyTemp,
      bloodPressureSystolic: bp?.systolic ?? null,
      bloodPressureDiastolic: bp?.diastolic ?? null,
      hydrationMlToday: hydration,
      recentExercises: exerciseSessions,
    };

    await healthApi.uploadMine(payload);
    console.warn('[hc-sync] background upload OK');
  } catch (err) {
    console.warn('[hc-sync] background upload failed', err);
  }
}
