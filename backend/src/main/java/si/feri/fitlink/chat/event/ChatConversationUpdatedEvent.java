package si.feri.fitlink.chat.event;

import java.util.List;


public record ChatConversationUpdatedEvent(
    String conversationId,
    List<String> notifyUserIds
) {}
