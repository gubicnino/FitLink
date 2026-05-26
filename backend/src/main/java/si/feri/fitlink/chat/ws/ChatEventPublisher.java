package si.feri.fitlink.chat.ws;

import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Destinations:
 *   /user/{uid}/queue/messages        new chat messages
 *   /user/{uid}/queue/read-receipts   peer marked my message as read
 *   /user/{uid}/queue/typing          peer is typing
 *   /user/{uid}/queue/conv-updates    conversation created / archived / muted
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventPublisher {

    private final SimpMessagingTemplate messaging;

    public void pushMessage(String userId, Object payload) {
        sendToUser(userId, "/queue/messages", payload);
    }

    public void pushReadReceipt(String userId, Object payload) {
        sendToUser(userId, "/queue/read-receipts", payload);
    }

    public void pushTyping(String userId, Object payload) {
        sendToUser(userId, "/queue/typing", payload);
    }

    public void pushConversationUpdate(String userId, Object payload) {
        sendToUser(userId, "/queue/conv-updates", payload);
    }

    private void sendToUser(String userId, String destination, Object payload) {
        if (userId == null || userId.isBlank()) return;
        String topicDest = "/topic/user." + userId + destination;
        log.info("[STOMP push] → {}", topicDest);
        try {
            messaging.convertAndSend(topicDest, payload, Map.of("source", "fitlink-chat"));
        } catch (Exception ex) {
            // Push nesmi nikdar blokerate business logike!!!!
            log.warn("STOMP push failed for destination={}: {}", topicDest, ex.getMessage());
        }
    }
}
