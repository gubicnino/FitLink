export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'ATTACHMENT' | 'SYSTEM';
export type AttachmentKind = 'IMAGE' | 'PDF' | 'DOC' | 'OTHER';

export interface ParticipantSummary {
  userId: string;
  displayName: string | null;
  role: string | null;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
}

export interface LastMessageDto {
  id: string;
  text: string | null;
  senderId: string;
  sentAt: string;
  hasAttachments: boolean;
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  coachingId: string | null;
  participants: ParticipantSummary[];
  createdAt: string;
  updatedAt: string;
  lastMessage: LastMessageDto | null;
  archived: boolean;
  muted: boolean;
  unreadCount: number;
  readOnly: boolean;
  readOnlyReason: string | null;
}

export interface AttachmentDto {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  thumbnailUrl: string | null;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string | null;
  type: MessageType;
  text: string | null;
  attachments: AttachmentDto[];
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  systemEvent: string | null;
}

export interface ReadReceiptDto {
  conversationId: string;
  readerUserId: string;
  lastReadMessageId: string;
  readAt: string;
}

export interface TypingDto {
  conversationId: string;
  typingUserId: string;
  isTyping: boolean;
}

export interface SendMessageRequest {
  clientMessageId: string;
  text?: string;
  attachments?: { attachmentId: string }[];
}
export interface MarkReadRequest { messageId: string; }
export interface SetMutedRequest { muted: boolean; }
export interface SetArchivedRequest { archived: boolean; }

export type LocalMessageStatus = 'sending' | 'sent' | 'failed';

export interface LocalMessage extends Omit<MessageResponse, 'id' | 'sentAt'> {
  id: string;
  sentAt: string;
  status: LocalMessageStatus;
}
