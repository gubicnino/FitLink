import apiClient, { API_ORIGIN } from '../api/apiClient';
import { authService } from './authService';

export interface CourseStats {
  avgRating: number;
  ratingsCount: number;
  completionsCount: number;
}

export interface CourseDto {
  id: string;
  authorId: string;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
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
  reviews?: CourseReviewDto[] | null;
}

export interface CourseReviewDto {
  id: string;
  userId: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  rating: number;
  comment: string;
  createdAt?: string;
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

  uploadThumbnail: async (asset: { uri: string; fileName?: string | null; type?: string | null }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `course-thumbnail.${asset.type?.split('/')[1] ?? 'jpg'}`,
      type: asset.type ?? 'image/jpeg',
    } as any);

    const token = await authService.getToken();
    const response = await fetch(`${API_ORIGIN}/api/courses/thumbnail`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Thumbnail upload failed with status ${response.status}`);
    }

    return (await response.json()) as { thumbnailUrl: string };
  },

  addReview: async (id: string, payload: { rating: number; comment: string }) => {
    const response = await apiClient.post<CourseDto>(`/courses/${id}/reviews`, payload);
    return response.data;
  },
};
