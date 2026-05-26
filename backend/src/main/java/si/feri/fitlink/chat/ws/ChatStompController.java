package si.feri.fitlink.chat.ws;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.event.ChatTypingEvent;
import si.feri.fitlink.chat.service.ChatService;

/**
 * Client → server STOMP handlers. Only ephemeral / latency-critical actions
 * live here. Persistent mutations (send, edit, delete) stay on REST so the
 * HTTP response je edine source of truth oziroma najvisji!
 */
@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatService chatService;
    private final ApplicationEventPublisher events;

    /** /app/conv.{conversationId}/typing  body: {"isTyping": true|false} */
    @MessageMapping("/conv.{conversationId}/typing")
    public void typing(
        @DestinationVariable String conversationId,
        @Payload TypingPayload payload,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null) {
            throw new AccessDeniedException("Unauthenticated STOMP frame");
        }
        String userId = principal.getName();
        Conversation conv = chatService.getConversationForUser(conversationId, userId);

        List<String> recipients = new ArrayList<>();
        for (String uid : conv.getParticipantIds()) {
            if (!uid.equals(userId)) recipients.add(uid);
        }
        events.publishEvent(new ChatTypingEvent(
            conv.getId(), userId, payload != null && payload.isTyping(), recipients
        ));
    }

    /** /app/conv.{conversationId}/seen  body: {"messageId": "..."} */
    @MessageMapping("/conv.{conversationId}/seen")
    public void seen(
        @DestinationVariable String conversationId,
        @Payload SeenPayload payload,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null) {
            throw new AccessDeniedException("Unauthenticated STOMP frame");
        }
        if (payload == null || payload.messageId() == null || payload.messageId().isBlank()) return;
        chatService.markRead(conversationId, principal.getName(), payload.messageId());
    }

    public record TypingPayload(boolean isTyping) {}
    public record SeenPayload(String messageId) {}
}
