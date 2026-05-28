package si.feri.fitlink.chat.service;

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

    private final NotificationService notifications;
    private final UserRepository userRepo;

    @Async
    @EventListener
    public void onMessageSent(ChatMessageSentEvent event) {
        var msg = event.message();
        String senderName = userRepo.findByFirebaseUid(msg.getSenderId())
            .map(User::getDisplayName)
            .orElse("New message");
        String preview = msg.getText() != null ? msg.getText()
            : (msg.getAttachments() != null && !msg.getAttachments().isEmpty() ? "Sent an attachment" : "");
        for (String recipientId : event.recipientUserIds()) {
            notifications.notifyChatMessage(recipientId, senderName, preview, msg.getConversationId());
        }
    }
}
