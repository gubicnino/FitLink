package si.feri.fitlink.chat.event;

import java.util.List;

import si.feri.fitlink.chat.domain.Message;


public record ChatMessageSentEvent(Message message, List<String> recipientUserIds) {}
