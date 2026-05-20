import apiClient from '../api/apiClient';

export interface CourseStats {
  avgRating: number;
  ratingsCount: number;
  completionsCount: number;
}

export interface CourseDto {
  id: string;
  authorId: string;
  authorDisplayName?: string | null;
  authorBio?: string | null;
  authorSpecializations?: string[] | null;
  authorVerificationStatus?: string | null;
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
  contentType?: 'VIDEO' | 'ARTICLE' | 'PDF' | string;
  youtubeVideoId?: string | null;
  articleUrl?: string | null;
  pdfUrl?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string;
  stats?: CourseStats | null;
}

export type CoursePayload = Pick<
  CourseDto,
  'title' | 'description' | 'category' | 'level' | 'contentType' | 'youtubeVideoId' | 'articleUrl' | 'pdfUrl' | 'thumbnailUrl'
>;

export const courseService = {
  getAll: async () => {
    const response = await apiClient.get<CourseDto[]>('/courses');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<CourseDto>(`/courses/${id}`);
    return response.data;
  },

  create: async (payload: CoursePayload) => {
    const response = await apiClient.post<CourseDto>('/courses', payload);
    return response.data;
  },

  update: async (id: string, payload: CoursePayload) => {
    const response = await apiClient.put<CourseDto>(`/courses/${id}`, payload);
    return response.data;
  },

  remove: async (id: string) => {
    await apiClient.delete(`/courses/${id}`);
  },
};
