import apiClient from './apiClient';
import type { ScheduleVideoCallBody, VideoCall } from '../types/videoCall';

export const videoCallApi = {
  schedule: async (conversationId: string, body: ScheduleVideoCallBody): Promise<VideoCall> => {
    const res = await apiClient.post<VideoCall>(
      `/video-calls/conversations/${encodeURIComponent(conversationId)}`,
      body,
    );
    return res.data;
  },

  accept: async (callId: string): Promise<VideoCall> => {
    const res = await apiClient.post<VideoCall>(`/video-calls/${encodeURIComponent(callId)}/accept`);
    return res.data;
  },

  decline: async (callId: string, reason?: string): Promise<VideoCall> => {
    const res = await apiClient.post<VideoCall>(
      `/video-calls/${encodeURIComponent(callId)}/decline`,
      reason ? { reason } : {},
    );
    return res.data;
  },

  cancel: async (callId: string): Promise<VideoCall> => {
    const res = await apiClient.post<VideoCall>(`/video-calls/${encodeURIComponent(callId)}/cancel`);
    return res.data;
  },

  get: async (callId: string): Promise<VideoCall> => {
    const res = await apiClient.get<VideoCall>(`/video-calls/${encodeURIComponent(callId)}`);
    return res.data;
  },

  listForConversation: async (conversationId: string): Promise<VideoCall[]> => {
    const res = await apiClient.get<VideoCall[]>(
      `/video-calls/conversations/${encodeURIComponent(conversationId)}`,
    );
    return res.data;
  },

  upcoming: async (): Promise<VideoCall[]> => {
    const res = await apiClient.get<VideoCall[]>('/video-calls/me/upcoming');
    return res.data;
  },

  window: async (from: Date, to: Date): Promise<VideoCall[]> => {
    const res = await apiClient.get<VideoCall[]>('/video-calls/me/window', {
      params: { from: from.toISOString(), to: to.toISOString() },
    });
    return res.data;
  },
};
