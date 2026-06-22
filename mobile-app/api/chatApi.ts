import apiClient from './apiClient';
import type {
  AttachmentDto,
  ConversationResponse,
  MarkReadRequest,
  MessageResponse,
  SendMessageRequest,
  SetArchivedRequest,
  SetMutedRequest,
} from '../types/chat';

/**
 * REST client for chat. Persistent mutations (send / mark read / edit /
 * delete) idejo tu skozi; the HTTP response is the source of truth.
 * STOMP is only used for live notifications.
 */
export const chatApi = {
  listConversations: async (): Promise<ConversationResponse[]> => {
    const res = await apiClient.get<ConversationResponse[]>('/chat/conversations');
    return res.data;
  },

  getConversation: async (id: string): Promise<ConversationResponse> => {
    const res = await apiClient.get<ConversationResponse>(
      `/chat/conversations/${encodeURIComponent(id)}`,
    );
    return res.data;
  },

  setMuted: async (id: string, body: SetMutedRequest): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ConversationResponse>(
      `/chat/conversations/${encodeURIComponent(id)}/muted`,
      body,
    );
    return res.data;
  },

  setArchived: async (id: string, body: SetArchivedRequest): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ConversationResponse>(
      `/chat/conversations/${encodeURIComponent(id)}/archived`,
      body,
    );
    return res.data;
  },

  listMessages: async (
    conversationId: string,
    params: { before?: string; limit?: number } = {},
  ): Promise<MessageResponse[]> => {
    const res = await apiClient.get<MessageResponse[]>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params },
    );
    return res.data;
  },

  messagesSince: async (conversationId: string, since: string): Promise<MessageResponse[]> => {
    const res = await apiClient.get<MessageResponse[]>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages/since`,
      { params: { since } },
    );
    return res.data;
  },

  sendMessage: async (
    conversationId: string,
    body: SendMessageRequest,
  ): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      body,
    );
    return res.data;
  },

  markRead: async (conversationId: string, body: MarkReadRequest): Promise<void> => {
    await apiClient.patch(
      `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
      body,
    );
  },

  uploadAttachment: async (file: { uri: string; name: string; type: string }): Promise<AttachmentDto> => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const res = await apiClient.post<AttachmentDto>('/chat/attachments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
