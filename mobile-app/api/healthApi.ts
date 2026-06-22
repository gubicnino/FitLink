import apiClient from './apiClient';


export interface HealthSnapshotUpload {
  stepsToday: number;
  activeCaloriesToday: number;
  totalCaloriesToday: number;
  distanceMetersToday: number;
  floorsToday: number;
  steps7d: { date: string; value: number }[];

  latestWeightKg: number | null;
  latestWeightAt: string | null;
  weightTrend: { at: string; kg: number }[];
  bodyFatPercent: number | null;
  heightCm: number | null;
  bmrKcal: number | null;

  latestHeartRateBpm: number | null;
  latestHeartRateAt: string | null;
  restingHeartRate: number | null;
  lastSleepMinutes: number | null;
  lastSleepEndedAt: string | null;
  avgSleepMinutes7d: number | null;
  vo2Max: number | null;

  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  bodyTemperatureC: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;

  hydrationMlToday: number;

  recentExercises: {
    startAt: string;
    endAt: string;
    durationMinutes: number;
    title: string | null;
    exerciseType: number | null;
  }[];
}

export interface HealthSnapshotResponse extends HealthSnapshotUpload {
  id: string;
  userId: string;
  uploadedAt: string;
}

export const healthApi = {
  uploadMine: async (snapshot: HealthSnapshotUpload): Promise<HealthSnapshotResponse> => {
    const res = await apiClient.put<HealthSnapshotResponse>('/health/me/snapshot', snapshot);
    return res.data;
  },

  getMine: async (): Promise<HealthSnapshotResponse | null> => {
    try {
      const res = await apiClient.get<HealthSnapshotResponse>('/health/me/snapshot');
      return res.data;
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
      throw err;
    }
  },

  getForClient: async (traineeId: string): Promise<HealthSnapshotResponse | null> => {
    try {
      const res = await apiClient.get<HealthSnapshotResponse>(
        `/health/client/${encodeURIComponent(traineeId)}`,
      );
      return res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },


  requestClientSync: async (traineeId: string): Promise<void> => {
    await apiClient.post(`/health/client/${encodeURIComponent(traineeId)}/request-sync`);
  },
};
