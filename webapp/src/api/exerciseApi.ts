import apiClient from './apiClient';
import type {
  Exercise,
  ExerciseFacets,
  ExerciseListParams,
  ExerciseSummary,
  PageResponse,
} from '../types/exercise';

/**
 * REST klient za Exercise.
 *
 * Avtentikacijo ma prek request interceptor v apiClient
 * (avtomatsko doda Firebase ID token). Vse metode vržejo axios napako
 * klicna mesta naj to ujamejo in prikažejo polje response.data.message.
 * 
 * SEPRAVI: ka nede vsak ekran ki rabi vaje sam pisal svoj axios klic basically, ampak da imamo en centralen exerciseApi z vsemi potrebnimi metodami.
 */


export const exerciseApi = {
  list: async (params: ExerciseListParams = {}): Promise<PageResponse<ExerciseSummary>> => {
    const res = await apiClient.get<PageResponse<ExerciseSummary>>('/exercises', {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 50,
        sort: params.sort ?? 'name,asc',
        category: params.category || undefined,
        level: params.level || undefined,
        muscle: params.muscle || undefined,
        q: params.q || undefined,
      },
    });
    return res.data;
  },

  getById: async (id: string): Promise<Exercise> => {
    const res = await apiClient.get<Exercise>(`/exercises/${encodeURIComponent(id)}`);
    return res.data;
  },

  facets: async (): Promise<ExerciseFacets> => {
    const res = await apiClient.get<ExerciseFacets>('/exercises/facets');
    return res.data;
  },
};
