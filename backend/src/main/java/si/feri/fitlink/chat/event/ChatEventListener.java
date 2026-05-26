package si.feri.fitlink.chat.event;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.chat.dto.ChatDtos;
import si.feri.fitlink.chat.dto.ChatMapper;
import si.feri.fitlink.chat.ws.ChatEventPublisher;


@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventListener {

    private static final ChatMapper.AttachmentUrlBuilder DEFAULT_URLS =
        (id, thumb) -> "/api/chat/attachments/" + id + (thumb ? "/thumbnail" : "");

    private final ChatEventPublisher publisher;

    @Async
    @EventListener
    public void onMessageSent(ChatMessageSentEvent event) {
        ChatDtos.MessageResponse payload = ChatMapper.toMessageResponse(event.message(), DEFAULT_URLS);
        publisher.pushMessage(event.message().getSenderId(), payload);
        for (String uid : event.recipientUserIds()) {
            publisher.pushMessage(uid, payload);
        }
    }

    @Async
    @EventListener
    public void onReadReceipt(ChatReadReceiptEvent event) {
        ChatDtos.ReadReceiptDto payload = new ChatDtos.ReadReceiptDto(
            event.conversationId(),
            event.readerUserId(),
            event.lastReadMessageId(),
            event.readAt()
        );
        publisher.pushReadReceipt(event.notifyUserId(), payload);
    }

    @Async
    @EventListener
    public void onTyping(ChatTypingEvent event) {
        ChatDtos.TypingDto payload = new ChatDtos.TypingDto(
            event.conversationId(),
            event.typingUserId(),
            event.isTyping()
        );
        for (String uid : event.recipientUserIds()) {
            publisher.pushTyping(uid, payload);
        }
    }

    @Async
    @EventListener
    public void onConversationUpdated(ChatConversationUpdatedEvent event) {
        for (String uid : event.notifyUserIds()) {
            publisher.pushConversationUpdate(uid, java.util.Map.of("conversationId", event.conversationId()));
        }
    }
}
