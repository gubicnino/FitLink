package si.feri.fitlink.chat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.chat.domain.Attachment;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.ConversationParticipant;
import si.feri.fitlink.chat.domain.ConversationType;
import si.feri.fitlink.chat.domain.Message;
import si.feri.fitlink.chat.domain.MessageReceipt;
import si.feri.fitlink.chat.domain.MessageType;
import si.feri.fitlink.chat.event.ChatConversationUpdatedEvent;
import si.feri.fitlink.chat.event.ChatMessageSentEvent;
import si.feri.fitlink.chat.event.ChatReadReceiptEvent;
import si.feri.fitlink.chat.repo.ConversationParticipantRepository;
import si.feri.fitlink.chat.repo.ConversationRepository;
import si.feri.fitlink.chat.repo.MessageReceiptRepository;
import si.feri.fitlink.chat.repo.MessageRepository;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.coaching.CoachingRepository;
import si.feri.fitlink.coaching.CoachingStatus;
import si.feri.fitlink.common.exception.ResourceNotFoundException;


@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int LAST_MESSAGE_PREVIEW_MAX = 120;

    private final ConversationRepository conversationRepo;
    private final ConversationParticipantRepository participantRepo;
    private final MessageRepository messageRepo;
    private final MessageReceiptRepository receiptRepo;
    private final CoachingRepository coachingRepo;
    private final ApplicationEventPublisher events;


    public List<Conversation> listMyConversations(String userId) {
        return conversationRepo.findByParticipantIdsContainingOrderByUpdatedAtDesc(userId);
    }

    public Conversation getConversationForUser(String conversationId, String userId) {
        Conversation conv = conversationRepo.findById(conversationId)
            .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        requireMember(conv, userId);
        return conv;
    }

    public ConversationParticipant getOrCreateParticipant(String conversationId, String userId) {
        return participantRepo.findByConversationIdAndUserId(conversationId, userId)
            .orElseGet(() -> participantRepo.save(ConversationParticipant.builder()
                .conversationId(conversationId)
                .userId(userId)
                .joinedAt(Instant.now())
                .role("MEMBER")
                .build()));
    }

    public List<ConversationParticipant> listParticipants(String conversationId) {
        return participantRepo.findByConversationId(conversationId);
    }

    public Map<String, Long> unreadCounts(String userId) {
        List<ConversationParticipant> mine = participantRepo.findByUserId(userId);
        Map<String, Long> out = new HashMap<>();
        for (ConversationParticipant p : mine) {
            out.put(p.getConversationId(), receiptRepo.countUnreadInConversation(userId, p.getConversationId()));
        }
        return out;
    }

    public Conversation setMuted(String conversationId, String userId, boolean muted) {
        Conversation conv = getConversationForUser(conversationId, userId);
        ConversationParticipant p = getOrCreateParticipant(conv.getId(), userId);
        p.setMuted(muted);
        participantRepo.save(p);
        return conv;
    }

    public Conversation setArchived(String conversationId, String userId, boolean archived) {
        Conversation conv = getConversationForUser(conversationId, userId);
        conv.setArchived(archived);
        conv.setUpdatedAt(Instant.now());
        Conversation saved = conversationRepo.save(conv);
        events.publishEvent(new ChatConversationUpdatedEvent(saved.getId(), saved.getParticipantIds()));
        return saved;
    }


    public List<Message> listMessages(String conversationId, String userId, Instant before, int limit) {
        Conversation conv = getConversationForUser(conversationId, userId);
        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), 100));
        return before == null
            ? messageRepo.findByConversationIdOrderBySentAtDesc(conv.getId(), page)
            : messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(conv.getId(), before, page);
    }

    public List<Message> listMessagesSince(String conversationId, String userId, Instant since) {
        Conversation conv = getConversationForUser(conversationId, userId);
        return messageRepo.findSince(conv.getId(), since);
    }

    /**
     * Send TEXT or ATTACHMENT message.
     *  - sender more bite participant
     *  - linked coaching MORE BITE ACTIVE
     */
    @Transactional
    public Message sendMessage(
        String conversationId,
        String senderId,
        String clientMessageId,
        String text,
        List<Attachment> attachments
    ) {
        Conversation conv = getConversationForUser(conversationId, senderId);
        requireWritable(conv);

        // Idempotency check.
        Optional<Message> existing = messageRepo
            .findByConversationIdAndSenderIdAndClientMessageId(conv.getId(), senderId, clientMessageId);
        if (existing.isPresent()) return existing.get();

        boolean hasText = text != null && !text.isBlank();
        boolean hasAttachments = attachments != null && !attachments.isEmpty();
        if (!hasText && !hasAttachments) {
            throw new IllegalArgumentException("Message must have text or attachments");
        }

        MessageType type = hasAttachments ? MessageType.ATTACHMENT : MessageType.TEXT;

        Message msg = Message.builder()
            .conversationId(conv.getId())
            .senderId(senderId)
            .clientMessageId(clientMessageId)
            .type(type)
            .text(hasText ? text.trim() : null)
            .attachments(attachments)
            .sentAt(Instant.now())
            .build();

        Message saved;
        try {
            saved = messageRepo.save(msg);
        } catch (DuplicateKeyException e) {
            return messageRepo.findByConversationIdAndSenderIdAndClientMessageId(
                conv.getId(), senderId, clientMessageId
            ).orElseThrow();
        }

        conv.setUpdatedAt(saved.getSentAt());
        conv.setLastMessage(Conversation.LastMessagePreview.builder()
            .id(saved.getId())
            .text(buildPreview(saved))
            .senderId(saved.getSenderId())
            .sentAt(saved.getSentAt())
            .hasAttachments(hasAttachments)
            .build());
        conversationRepo.save(conv);

        // Pre-create unread receipts so countUnreadInConversation stays cheap.
        List<String> recipients = new ArrayList<>();
        for (String uid : conv.getParticipantIds()) {
            if (uid.equals(senderId)) continue;
            recipients.add(uid);
            receiptRepo.save(MessageReceipt.builder()
                .messageId(saved.getId())
                .conversationId(saved.getConversationId())
                .userId(uid)
                .build());
        }

        events.publishEvent(new ChatMessageSentEvent(saved, recipients));
        return saved;
    }

    /** Marks everything up to lastReadMessageId as read; notifies senders. */
    @Transactional
    public void markRead(String conversationId, String userId, String lastReadMessageId) {
        Conversation conv = getConversationForUser(conversationId, userId);
        Message msg = messageRepo.findById(lastReadMessageId)
            .filter(m -> m.getConversationId().equals(conv.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Message not found in conversation"));

        Instant now = Instant.now();

        ConversationParticipant p = getOrCreateParticipant(conv.getId(), userId);
        p.setLastReadMessageId(lastReadMessageId);
        p.setLastReadAt(now);
        participantRepo.save(p);


        Instant cutoff = msg.getSentAt();
        int updated = 0;
        for (Message m : messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(
                conv.getId(), cutoff.plusMillis(1), PageRequest.of(0, 500))) {
            if (m.getSenderId().equals(userId)) continue;
            MessageReceipt r = receiptRepo.findByMessageIdAndUserId(m.getId(), userId).orElse(null);
            if (r == null || r.getReadAt() != null) continue;
            r.setReadAt(now);
            receiptRepo.save(r);
            if (++updated > 200) break;
        }

        for (String uid : conv.getParticipantIds()) {
            if (uid.equals(userId)) continue;
            events.publishEvent(new ChatReadReceiptEvent(conv.getId(), userId, lastReadMessageId, now, uid));
        }
    }

    public void requireMember(Conversation conv, String userId) {
        if (conv.getParticipantIds() == null || !conv.getParticipantIds().contains(userId)) {
            throw new AccessDeniedException("Not a participant");
        }
    }

    public void requireWritable(Conversation conv) {
        if (conv.getCoachingId() == null) return;
        Coaching c = coachingRepo.findById(conv.getCoachingId())
            .orElseThrow(() -> new IllegalStateException("Coaching missing for conversation"));
        if (c.getStatus() != CoachingStatus.ACTIVE) {
            throw new AccessDeniedException("This conversation is read-only (coaching " + c.getStatus() + ")");
        }
    }

    public ReadOnlyState resolveReadOnlyState(Conversation conv) {
        if (conv.getCoachingId() == null) return new ReadOnlyState(false, null);
        Coaching c = coachingRepo.findById(conv.getCoachingId()).orElse(null);
        if (c == null) return new ReadOnlyState(true, "coaching missing");
        if (c.getStatus() == CoachingStatus.ACTIVE) return new ReadOnlyState(false, null);
        return new ReadOnlyState(true, "coaching " + c.getStatus().name().toLowerCase());
    }

    public record ReadOnlyState(boolean readOnly, String reason) {}


    private static String buildPreview(Message m) {
        if (m.getText() == null) return null;
        String t = m.getText();
        return t.length() <= LAST_MESSAGE_PREVIEW_MAX ? t : t.substring(0, LAST_MESSAGE_PREVIEW_MAX - 1) + "…";
    }

    /** Called by the lifecycle service. Both userA/userB are Firebase UIDs. */
    public Conversation createDirectConversation(String coachingId, String userA, String userB) {
        Instant now = Instant.now();
        Conversation conv = Conversation.builder()
            .type(ConversationType.DIRECT)
            .coachingId(coachingId)
            .participantIds(List.of(userA, userB))
            .createdAt(now)
            .updatedAt(now)
            .archived(false)
            .build();
        Conversation saved = conversationRepo.save(conv);

        participantRepo.save(ConversationParticipant.builder()
            .conversationId(saved.getId()).userId(userA).joinedAt(now).role("MEMBER").build());
        participantRepo.save(ConversationParticipant.builder()
            .conversationId(saved.getId()).userId(userB).joinedAt(now).role("MEMBER").build());

        events.publishEvent(new ChatConversationUpdatedEvent(saved.getId(), saved.getParticipantIds()));
        return saved;
    }
}
