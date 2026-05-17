import apiClient from './apiClient';
import type {
  SessionUpsertRequest,
  TemplateUpsertRequest,
  WorkoutSession,
  WorkoutTemplate,
} from '../types/workout';

/**
 * REST klient za Workout (templates + sessions).
 *
 * Avtentikacija je transparentna preko apiClient request interceptorja
 * (avtomatsko doda Firebase ID token). Vse metode vržejo axios napako
 * in prikažejo response.data.message.
 */
export const workoutApi = {
  // Templates
  listTemplates: async (): Promise<WorkoutTemplate[]> => {
    const res = await apiClient.get<WorkoutTemplate[]>('/workouts/templates');
    return res.data;
  },

  getTemplate: async (id: string): Promise<WorkoutTemplate> => {
    const res = await apiClient.get<WorkoutTemplate>(
      `/workouts/templates/${encodeURIComponent(id)}`,
    );
    return res.data;
  },

  createTemplate: async (body: TemplateUpsertRequest): Promise<WorkoutTemplate> => {
    const res = await apiClient.post<WorkoutTemplate>('/workouts/templates', body);
    return res.data;
  },

  updateTemplate: async (id: string, body: TemplateUpsertRequest): Promise<WorkoutTemplate> => {
    const res = await apiClient.put<WorkoutTemplate>(
      `/workouts/templates/${encodeURIComponent(id)}`,
      body,
    );
    return res.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/workouts/templates/${encodeURIComponent(id)}`);
  },

  // Sessions
  listSessions: async (): Promise<WorkoutSession[]> => {
    const res = await apiClient.get<WorkoutSession[]>('/workouts/sessions');
    return res.data;
  },

  getSession: async (id: string): Promise<WorkoutSession> => {
    const res = await apiClient.get<WorkoutSession>(
      `/workouts/sessions/${encodeURIComponent(id)}`,
    );
    return res.data;
  },

  startSession: async (body: SessionUpsertRequest): Promise<WorkoutSession> => {
    const res = await apiClient.post<WorkoutSession>('/workouts/sessions', body);
    return res.data;
  },

  finishSession: async (id: string, body: SessionUpsertRequest): Promise<WorkoutSession> => {
    const res = await apiClient.patch<WorkoutSession>(
      `/workouts/sessions/${encodeURIComponent(id)}`,
      body,
    );
    return res.data;
  },
};
