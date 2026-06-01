import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import auth from '@react-native-firebase/auth';
import { healthApi, type HealthSnapshotUpload } from '../api/healthApi';
import type { HealthSnapshot } from '../types/health';
import { useHealthConnect } from './useHealthConnect';

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 MIN


export function useHealthSync() {
  const { status, snapshot, refreshSnapshot } = useHealthConnect();
  const lastUploadAt = useRef<number>(0);
  const inFlight = useRef(false);

  const upload = async (current: HealthSnapshot) => {
    if (!auth().currentUser) {
      console.warn('[health-sync] skip: no current user');
      return;
    }
    if (status !== 'granted' && status !== 'partial') {
      console.warn('[health-sync] skip: status=', status);
      return;
    }
    if (inFlight.current) {
      console.warn('[health-sync] skip: in flight');
      return;
    }
    if (current.stepsToday === 0 && current.weightTrend.length === 0) {
      console.warn('[health-sync] skip: empty snapshot');
      return;
    }
    inFlight.current = true;
    try {
      const payload = toUpload(current);
      console.warn('[health-sync] uploading: steps=', payload.stepsToday, 'weight=', payload.latestWeightKg, 'hr=', payload.latestHeartRateBpm);
      await healthApi.uploadMine(payload);
      lastUploadAt.current = Date.now();
      console.warn('[health-sync] upload OK');
    } catch (err) {
      console.warn('[health-sync] upload failed', err);
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', async next => {
      if (next !== 'active') return;
      if (Date.now() - lastUploadAt.current < 60_000) return;
      await refreshSnapshot();
      setTimeout(() => upload(snapshotRef.current), 500);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      await refreshSnapshot();
      setTimeout(() => upload(snapshotRef.current), 500);
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (status === 'granted' || status === 'partial') {
      const id = setTimeout(() => upload(snapshot), 800);
      return () => clearTimeout(id);
    }
    return () => {};
  }, [status, snapshot.stepsToday, snapshot.latestWeight?.at]);
}

function toUpload(s: HealthSnapshot): HealthSnapshotUpload {
  return {
    stepsToday: s.stepsToday,
    activeCaloriesToday: s.activeCaloriesToday,
    totalCaloriesToday: s.totalCaloriesToday,
    distanceMetersToday: s.distanceMetersToday,
    floorsToday: s.floorsToday,
    steps7d: s.steps7d,
    latestWeightKg: s.latestWeight?.kg ?? null,
    latestWeightAt: s.latestWeight?.at ?? null,
    weightTrend: s.weightTrend,
    bodyFatPercent: s.bodyFatPercent,
    heightCm: s.heightCm,
    bmrKcal: s.bmrKcal,
    latestHeartRateBpm: s.latestHeartRate?.bpm ?? null,
    latestHeartRateAt: s.latestHeartRate?.at ?? null,
    restingHeartRate: s.restingHeartRate,
    lastSleepMinutes: s.lastSleep?.durationMinutes ?? null,
    lastSleepEndedAt: s.lastSleep?.endAt ?? null,
    avgSleepMinutes7d: s.avgSleepMinutes7d,
    vo2Max: s.vo2Max,
    oxygenSaturation: s.oxygenSaturation,
    respiratoryRate: s.respiratoryRate,
    bodyTemperatureC: s.bodyTemperatureC,
    bloodPressureSystolic: s.bloodPressure?.systolic ?? null,
    bloodPressureDiastolic: s.bloodPressure?.diastolic ?? null,
    hydrationMlToday: s.hydrationMlToday,
    recentExercises: s.recentExercises.map(e => ({
      startAt: e.startAt,
      endAt: e.endAt,
      durationMinutes: e.durationMinutes,
      title: e.title,
      exerciseType: e.exerciseType,
    })),
  };
}
