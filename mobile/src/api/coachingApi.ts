import { Coaching, CoachingRequest } from '../types/coaching';
import apiClient from "./apiClient";

export const coachingApi = {
  requestCoaching: async (coachingRequest: CoachingRequest): Promise<CoachingRequest> => {
    const res = await apiClient.post<CoachingRequest>('/coaching/request', coachingRequest);
    return res.data;
  },
  getMyCoachings: async (): Promise<Coaching[]> => {
    const res = await apiClient.get<Coaching[]>('/coaching/me');
    return res.data;
  },
  getCoachingRequestsForTrainer: async (): Promise<Coaching[]> => {
    const res = await apiClient.get<Coaching[]>('/coaching/requests');
    return res.data;
  },
  acceptCoachingRequest: async (coachingId: string): Promise<void> => {
    await apiClient.post('/coaching/accept', { coachingId });
  },
  rejectCoachingRequest: async (coachingId: string): Promise<void> => {
    await apiClient.post('/coaching/reject', { coachingId });
  }
};
