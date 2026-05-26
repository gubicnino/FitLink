package si.feri.fitlink.chat.service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.chat.event.ChatMessageSentEvent;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;


@Component
@RequiredArgsConstructor
public class ChatNotificationHook {

    private static final Duration THROTTLE = Duration.ofMinutes(1);

    private final PresenceService presence;
    private final NotificationService notifications;
    private final UserRepository userRepo;

    private final ConcurrentMap<String, Instant> lastNotifiedAt = new ConcurrentHashMap<>();

    @Async
    @EventListener
    public void onMessageSent(ChatMessageSentEvent event) {
        var msg = event.message();
        for (String recipientId : event.recipientUserIds()) {
            if (presence.isOnline(recipientId)) continue;

            String key = msg.getSenderId() + "->" + recipientId;
            Instant last = lastNotifiedAt.get(key);
            Instant now = Instant.now();
            if (last != null && Duration.between(last, now).compareTo(THROTTLE) < 0) continue;
            lastNotifiedAt.put(key, now);

            String senderName = userRepo.findByFirebaseUid(msg.getSenderId())
                .map(User::getDisplayName)
                .orElse("New message");
            String preview = msg.getText() != null ? msg.getText()
                : (msg.getAttachments() != null && !msg.getAttachments().isEmpty() ? "Sent an attachment" : "");
            notifications.notifyChatMessage(recipientId, senderName, preview);
        }
    }
}
