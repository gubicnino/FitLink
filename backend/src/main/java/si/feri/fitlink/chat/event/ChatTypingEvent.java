package si.feri.fitlink.chat.event;

import java.util.List;


public record ChatTypingEvent(
    String conversationId,
    String typingUserId,
    boolean isTyping,
    List<String> recipientUserIds
) {}
