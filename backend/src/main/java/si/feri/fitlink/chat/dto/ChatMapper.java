package si.feri.fitlink.chat.dto;

import java.util.List;

import si.feri.fitlink.chat.domain.Attachment;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.Message;

/**
 * Download URLs come in via the
 * functional interface so the controller (which knows its base path)
 * ostane glaven za routing detaile.
 */
public final class ChatMapper {

    private ChatMapper() {}

    @FunctionalInterface
    public interface AttachmentUrlBuilder {
        String url(String attachmentId, boolean thumbnail);
    }

    public static ChatDtos.MessageResponse toMessageResponse(Message m, AttachmentUrlBuilder urls) {
        return new ChatDtos.MessageResponse(
            m.getId(),
            m.getConversationId(),
            m.getSenderId(),
            m.getClientMessageId(),
            m.getType() == null ? null : m.getType().name(),
            m.getText(),
            m.getAttachments() == null ? List.of()
                : m.getAttachments().stream().map(a -> toAttachmentDto(a, urls)).toList(),
            m.getSentAt(),
            m.getEditedAt(),
            m.getDeletedAt(),
            m.getSystemEvent()
        );
    }

    public static ChatDtos.AttachmentDto toAttachmentDto(Attachment a, AttachmentUrlBuilder urls) {
        return new ChatDtos.AttachmentDto(
            a.getId(),
            a.getKind() == null ? null : a.getKind().name(),
            a.getFileName(),
            a.getMimeType(),
            a.getSizeBytes(),
            urls.url(a.getId(), false),
            a.getThumbnailKey() != null ? urls.url(a.getId(), true) : null
        );
    }

    public static ChatDtos.LastMessageDto toLastMessageDto(Conversation.LastMessagePreview lm) {
        if (lm == null) return null;
        return new ChatDtos.LastMessageDto(
            lm.getId(), lm.getText(), lm.getSenderId(), lm.getSentAt(), lm.isHasAttachments()
        );
    }
}
