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
  articleContent?: string | null;
  pdfUrl?: string | null;
  thumbnailUrl?: string | null;
  reviewsEnabled?: boolean | null;
  completedByCurrentUser?: boolean | null;
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
  pinned?: boolean | null;
  originalRating?: number | null;
  originalComment?: string | null;
  createdAt?: string;
  editedAt?: string | null;
}

export type CoursePayload = Pick<
  CourseDto,
  'title' | 'description' | 'category' | 'level' | 'contentType' | 'youtubeVideoId' | 'articleUrl' | 'articleContent' | 'pdfUrl' | 'thumbnailUrl' | 'reviewsEnabled'
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

  getSaved: async () => {
    const response = await apiClient.get<CourseDto[]>('/courses/saved');
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

  save: async (id: string) => {
    const response = await apiClient.post<CourseDto>(`/courses/${id}/save`);
    return response.data;
  },

  unsave: async (id: string) => {
    const response = await apiClient.delete<CourseDto>(`/courses/${id}/save`);
    return response.data;
  },

  complete: async (id: string) => {
    const response = await apiClient.post<CourseDto>(`/courses/${id}/complete`);
    return response.data;
  },

  uncomplete: async (id: string) => {
    const response = await apiClient.delete<CourseDto>(`/courses/${id}/complete`);
    return response.data;
  },

  uploadThumbnail: async (asset: { uri: string; fileName?: string | null; type?: string | null }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `course-thumbnail.${asset.type?.split('/')[1] ?? 'jpg'}`,
      type: asset.type ?? 'image/jpeg',
    } as any);

    const response = await apiClient.post('/courses/thumbnail', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });

    return response.data as { thumbnailUrl: string };
  },

  uploadPdf: async (asset: { uri: string; fileName?: string | null; type?: string | null }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? 'course-document.pdf',
      type: asset.type ?? 'application/pdf',
    } as any);

    const response = await apiClient.post('/courses/pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });

    return response.data as { pdfUrl: string };
  },

  addReview: async (id: string, payload: { rating: number; comment: string }) => {
    const response = await apiClient.post<CourseDto>(`/courses/${id}/reviews`, payload);
    return response.data;
  },

  updateReview: async (id: string, reviewId: string, payload: { rating: number; comment: string }) => {
    const response = await apiClient.put<CourseDto>(`/courses/${id}/reviews/${reviewId}`, payload);
    return response.data;
  },

  deleteReview: async (id: string, reviewId: string) => {
    const response = await apiClient.delete<CourseDto>(`/courses/${id}/reviews/${reviewId}`);
    return response.data;
  },

  pinReview: async (id: string, reviewId: string) => {
    const response = await apiClient.post<CourseDto>(`/courses/${id}/reviews/${reviewId}/pin`);
    return response.data;
  },

  unpinReview: async (id: string, reviewId: string) => {
    const response = await apiClient.delete<CourseDto>(`/courses/${id}/reviews/${reviewId}/pin`);
    return response.data;
  },
};
