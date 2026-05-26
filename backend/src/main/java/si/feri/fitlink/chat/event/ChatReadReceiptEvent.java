package si.feri.fitlink.chat.event;

import java.time.Instant;


public record ChatReadReceiptEvent(
    String conversationId,
    String readerUserId,
    String lastReadMessageId,
    Instant readAt,
    String notifyUserId
) {}
