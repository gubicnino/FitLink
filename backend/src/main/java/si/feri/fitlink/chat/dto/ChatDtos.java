package si.feri.fitlink.chat.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public final class ChatDtos {

    private ChatDtos() {}


    public record SendMessageRequest(
        @NotBlank @Size(max = 64) String clientMessageId,
        @Size(max = 4000) String text,
        List<AttachmentRef> attachments
    ) {}

    public record AttachmentRef(@NotBlank String attachmentId) {}

    public record MarkReadRequest(@NotBlank String messageId) {}

    public record SetMutedRequest(boolean muted) {}

    public record SetArchivedRequest(boolean archived) {}


    public record ConversationResponse(
        String id,
        String type,
        String coachingId,
        List<ParticipantSummary> participants,
        Instant createdAt,
        Instant updatedAt,
        LastMessageDto lastMessage,
        boolean archived,
        boolean muted,
        long unreadCount,
        boolean readOnly,
        String readOnlyReason
    ) {}

    public record ParticipantSummary(
        String userId,
        String displayName,
        String role,
        Instant lastReadAt,
        String lastReadMessageId
    ) {}

    public record LastMessageDto(
        String id,
        String text,
        String senderId,
        Instant sentAt,
        boolean hasAttachments
    ) {}

    public record MessageResponse(
        String id,
        String conversationId,
        String senderId,
        String clientMessageId,
        String type,
        String text,
        List<AttachmentDto> attachments,
        Instant sentAt,
        Instant editedAt,
        Instant deletedAt,
        String systemEvent
    ) {}

    public record AttachmentDto(
        String id,
        String kind,
        String fileName,
        String mimeType,
        long sizeBytes,
        String downloadUrl,
        String thumbnailUrl
    ) {}

    public record ReadReceiptDto(
        String conversationId,
        String readerUserId,
        String lastReadMessageId,
        Instant readAt
    ) {}

    public record TypingDto(
        String conversationId,
        String typingUserId,
        boolean isTyping
    ) {}
}
