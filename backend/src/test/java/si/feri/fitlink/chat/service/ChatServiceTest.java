package si.feri.fitlink.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.chat.domain.Attachment;
import si.feri.fitlink.chat.domain.AttachmentKind;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.ConversationParticipant;
import si.feri.fitlink.chat.domain.Message;
import si.feri.fitlink.chat.domain.MessageReceipt;
import si.feri.fitlink.chat.domain.MessageType;
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

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ConversationRepository conversationRepo;
    @Mock private ConversationParticipantRepository participantRepo;
    @Mock private MessageRepository messageRepo;
    @Mock private MessageReceiptRepository receiptRepo;
    @Mock private CoachingRepository coachingRepo;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks private ChatService service;

    private static final String CONV_ID = "conv-1";
    private static final String COACHING_ID = "coaching-1";
    private static final String TRAINER = "trainer-uid";
    private static final String TRAINEE = "trainee-uid";
    private static final String CLIENT_MSG_ID = "client-msg-1";

    private Conversation conv;

    @BeforeEach
    void setUp() {
        conv = Conversation.builder()
            .id(CONV_ID)
            .coachingId(COACHING_ID)
            .participantIds(List.of(TRAINER, TRAINEE))
            .build();
    }

    // =====================================================================
    // sendMessage
    // =====================================================================

    @Nested
    @DisplayName("sendMessage")
    class SendMessage {

        @Test
        @DisplayName("text message is saved trimmed, updates the conversation preview, creates receipts for others and publishes an event")
        void sendMessage_text_savesAndNotifiesRecipients() {
            stubWritableConversation();
            stubNoExistingMessage();
            stubMessageSaveAssignsId();

            Message saved = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "  Hello there  ", null);

            assertThat(saved.getId()).isEqualTo("msg-1");
            assertThat(saved.getType()).isEqualTo(MessageType.TEXT);
            assertThat(saved.getText()).isEqualTo("Hello there");
            assertThat(saved.getSenderId()).isEqualTo(TRAINER);
            assertThat(saved.getConversationId()).isEqualTo(CONV_ID);
            assertThat(saved.getClientMessageId()).isEqualTo(CLIENT_MSG_ID);
            assertThat(saved.getSentAt()).isNotNull();

            verify(conversationRepo).save(conv);
            assertThat(conv.getUpdatedAt()).isEqualTo(saved.getSentAt());
            assertThat(conv.getLastMessage().getId()).isEqualTo("msg-1");
            assertThat(conv.getLastMessage().getText()).isEqualTo("Hello there");
            assertThat(conv.getLastMessage().getSenderId()).isEqualTo(TRAINER);
            assertThat(conv.getLastMessage().isHasAttachments()).isFalse();

            ArgumentCaptor<MessageReceipt> receipt = ArgumentCaptor.forClass(MessageReceipt.class);
            verify(receiptRepo).save(receipt.capture());
            assertThat(receipt.getValue().getUserId()).isEqualTo(TRAINEE);
            assertThat(receipt.getValue().getMessageId()).isEqualTo("msg-1");
            assertThat(receipt.getValue().getConversationId()).isEqualTo(CONV_ID);
            assertThat(receipt.getValue().getReadAt()).isNull();

            ArgumentCaptor<ChatMessageSentEvent> event = ArgumentCaptor.forClass(ChatMessageSentEvent.class);
            verify(events).publishEvent(event.capture());
            assertThat(event.getValue().message()).isSameAs(saved);
            assertThat(event.getValue().recipientUserIds()).containsExactly(TRAINEE);
        }

        @Test
        @DisplayName("attachment-only message gets type ATTACHMENT, null text and no text preview")
        void sendMessage_attachmentOnly_typeAttachment() {
            stubWritableConversation();
            stubNoExistingMessage();
            stubMessageSaveAssignsId();

            Message saved = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "   ", List.of(attachment()));

            assertThat(saved.getType()).isEqualTo(MessageType.ATTACHMENT);
            assertThat(saved.getText()).isNull();
            assertThat(saved.getAttachments()).hasSize(1);
            assertThat(conv.getLastMessage().getText()).isNull();
            assertThat(conv.getLastMessage().isHasAttachments()).isTrue();
        }

        @Test
        @DisplayName("message with text and attachment is an ATTACHMENT message that keeps its text")
        void sendMessage_textAndAttachment_keepsBoth() {
            stubWritableConversation();
            stubNoExistingMessage();
            stubMessageSaveAssignsId();

            Message saved = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "See file", List.of(attachment()));

            assertThat(saved.getType()).isEqualTo(MessageType.ATTACHMENT);
            assertThat(saved.getText()).isEqualTo("See file");
        }

        @ParameterizedTest(name = "text of {0} chars → preview of {1} chars, ellipsis={2}")
        @CsvSource({"119, 119, false", "120, 120, false", "121, 120, true", "500, 120, true"})
        @DisplayName("conversation preview is cut to 120 chars including a trailing ellipsis")
        void sendMessage_longText_previewTruncated(int textLength, int previewLength, boolean ellipsis) {
            stubWritableConversation();
            stubNoExistingMessage();
            stubMessageSaveAssignsId();
            String text = "x".repeat(textLength);

            Message saved = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, text, null);

            String preview = conv.getLastMessage().getText();
            assertThat(saved.getText()).hasSize(textLength);
            assertThat(preview).hasSize(previewLength);
            assertThat(preview.endsWith("…")).isEqualTo(ellipsis);
        }

        @Test
        @DisplayName("group conversation creates a receipt for every participant except the sender")
        void sendMessage_groupConversation_receiptsForAllButSender() {
            conv.setParticipantIds(List.of(TRAINER, TRAINEE, "third-uid"));
            stubWritableConversation();
            stubNoExistingMessage();
            stubMessageSaveAssignsId();

            service.sendMessage(CONV_ID, TRAINEE, CLIENT_MSG_ID, "hi", null);

            ArgumentCaptor<MessageReceipt> receipts = ArgumentCaptor.forClass(MessageReceipt.class);
            verify(receiptRepo, times(2)).save(receipts.capture());
            assertThat(receipts.getAllValues()).extracting(MessageReceipt::getUserId)
                .containsExactlyInAnyOrder(TRAINER, "third-uid");
        }

        @Test
        @DisplayName("conversation without a coaching is always writable")
        void sendMessage_noCoaching_writable() {
            conv.setCoachingId(null);
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            stubNoExistingMessage();
            stubMessageSaveAssignsId();

            assertThat(service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "hi", null)).isNotNull();
            verifyNoInteractions(coachingRepo);
        }

        @Test
        @DisplayName("resending the same clientMessageId returns the stored message without saving or notifying again")
        void sendMessage_duplicateClientMessageId_returnsExisting() {
            stubWritableConversation();
            Message existing = Message.builder().id("msg-existing").conversationId(CONV_ID).senderId(TRAINER)
                .clientMessageId(CLIENT_MSG_ID).text("Hello").build();
            when(messageRepo.findByConversationIdAndSenderIdAndClientMessageId(CONV_ID, TRAINER, CLIENT_MSG_ID))
                .thenReturn(Optional.of(existing));

            Message result = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "Hello", null);

            assertThat(result).isSameAs(existing);
            verify(messageRepo, never()).save(any());
            verify(conversationRepo, never()).save(any());
            verify(receiptRepo, never()).save(any());
            verify(events, never()).publishEvent(any());
        }

        @Test
        @DisplayName("concurrent duplicate (DuplicateKeyException on save) returns the stored message without notifying")
        void sendMessage_duplicateKeyRace_returnsStoredMessage() {
            stubWritableConversation();
            Message stored = Message.builder().id("msg-race").clientMessageId(CLIENT_MSG_ID).build();
            when(messageRepo.findByConversationIdAndSenderIdAndClientMessageId(CONV_ID, TRAINER, CLIENT_MSG_ID))
                .thenReturn(Optional.empty(), Optional.of(stored));
            when(messageRepo.save(any(Message.class))).thenThrow(new DuplicateKeyException("dup"));

            Message result = service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "Hello", null);

            assertThat(result).isSameAs(stored);
            verify(conversationRepo, never()).save(any());
            verify(receiptRepo, never()).save(any());
            verify(events, never()).publishEvent(any());
        }

        @ParameterizedTest(name = "text=''{0}'', attachments empty list={1}")
        @CsvSource(value = {"NULL, false", "'', false", "'   ', false", "NULL, true", "'  ', true"}, nullValues = "NULL")
        @DisplayName("message without text and without attachments throws IllegalArgumentException and saves nothing")
        void sendMessage_emptyMessage_throws(String text, boolean emptyAttachmentList) {
            stubWritableConversation();
            stubNoExistingMessage();
            List<Attachment> attachments = emptyAttachmentList ? List.of() : null;

            assertThatThrownBy(() -> service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, text, attachments))
                .isInstanceOf(IllegalArgumentException.class);
            verify(messageRepo, never()).save(any());
            verify(events, never()).publishEvent(any());
        }

        @Test
        @DisplayName("sender who is not a participant gets AccessDenied")
        void sendMessage_nonParticipant_throws() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));

            assertThatThrownBy(() -> service.sendMessage(CONV_ID, "stranger", CLIENT_MSG_ID, "hi", null))
                .isInstanceOf(AccessDeniedException.class);
            verify(messageRepo, never()).save(any());
        }

        @Test
        @DisplayName("unknown conversation throws ResourceNotFound")
        void sendMessage_unknownConversation_throws() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "hi", null))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(messageRepo, never()).save(any());
        }

        @ParameterizedTest(name = "coaching {0} → read-only")
        @EnumSource(value = CoachingStatus.class, names = "ACTIVE", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("conversation of a coaching that is not ACTIVE is read-only (AccessDenied)")
        void sendMessage_coachingNotActive_throws(CoachingStatus status) {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(coaching(status)));

            assertThatThrownBy(() -> service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "hi", null))
                .isInstanceOf(AccessDeniedException.class);
            verify(messageRepo, never()).save(any());
            verify(events, never()).publishEvent(any());
        }

        @Test
        @DisplayName("conversation whose coaching no longer exists throws IllegalStateException")
        void sendMessage_coachingMissing_throws() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.sendMessage(CONV_ID, TRAINER, CLIENT_MSG_ID, "hi", null))
                .isInstanceOf(IllegalStateException.class);
            verify(messageRepo, never()).save(any());
        }
    }

    // =====================================================================
    // markRead
    // =====================================================================

    @Nested
    @DisplayName("markRead")
    class MarkRead {

        private final Instant readUpTo = Instant.now().minus(1, ChronoUnit.MINUTES);

        @Test
        @DisplayName("marks only other people's unread receipts as read, updates the participant and notifies the others")
        void markRead_valid_marksOthersUnreadAndNotifies() {
            Message target = message("m3", TRAINER, readUpTo);
            Message ownMessage = message("m2", TRAINEE, readUpTo.minusSeconds(10));
            Message alreadyRead = message("m1", TRAINER, readUpTo.minusSeconds(20));
            MessageReceipt unread = MessageReceipt.builder().messageId("m3").userId(TRAINEE).build();
            MessageReceipt read = MessageReceipt.builder().messageId("m1").userId(TRAINEE)
                .readAt(readUpTo.minusSeconds(5)).build();
            ConversationParticipant participant = ConversationParticipant.builder()
                .conversationId(CONV_ID).userId(TRAINEE).build();

            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(messageRepo.findById("m3")).thenReturn(Optional.of(target));
            when(participantRepo.findByConversationIdAndUserId(CONV_ID, TRAINEE)).thenReturn(Optional.of(participant));
            when(messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(eq(CONV_ID), any(), any()))
                .thenReturn(List.of(target, ownMessage, alreadyRead));
            when(receiptRepo.findByMessageIdAndUserId("m3", TRAINEE)).thenReturn(Optional.of(unread));
            when(receiptRepo.findByMessageIdAndUserId("m1", TRAINEE)).thenReturn(Optional.of(read));
            Instant before = Instant.now();

            service.markRead(CONV_ID, TRAINEE, "m3");

            assertThat(participant.getLastReadMessageId()).isEqualTo("m3");
            assertThat(participant.getLastReadAt()).isAfterOrEqualTo(before);
            verify(participantRepo).save(participant);

            assertThat(unread.getReadAt()).isAfterOrEqualTo(before);
            verify(receiptRepo).save(unread);
            verify(receiptRepo, never()).save(read);
            verify(receiptRepo, never()).findByMessageIdAndUserId("m2", TRAINEE);

            ArgumentCaptor<ChatReadReceiptEvent> event = ArgumentCaptor.forClass(ChatReadReceiptEvent.class);
            verify(events).publishEvent(event.capture());
            assertThat(event.getValue().notifyUserId()).isEqualTo(TRAINER);
            assertThat(event.getValue().readerUserId()).isEqualTo(TRAINEE);
            assertThat(event.getValue().lastReadMessageId()).isEqualTo("m3");
        }

        @Test
        @DisplayName("the read range includes the target message itself (cutoff is just after its sentAt)")
        void markRead_cutoff_includesTargetMessage() {
            stubReadableTarget();
            when(messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(eq(CONV_ID), any(), any()))
                .thenReturn(List.of());

            service.markRead(CONV_ID, TRAINEE, "m-target");

            ArgumentCaptor<Instant> cutoff = ArgumentCaptor.forClass(Instant.class);
            verify(messageRepo).findByConversationIdAndSentAtBeforeOrderBySentAtDesc(
                eq(CONV_ID), cutoff.capture(), any(Pageable.class));
            assertThat(cutoff.getValue()).isAfter(readUpTo);
            assertThat(cutoff.getValue()).isBeforeOrEqualTo(readUpTo.plusSeconds(1));
        }

        @Test
        @DisplayName("marks at most 200 receipts per call")
        void markRead_manyUnread_capsAt200() {
            stubReadableTarget();
            List<Message> unreadMessages = IntStream.range(0, 250)
                .mapToObj(i -> message("u" + i, TRAINER, readUpTo.minusSeconds(i)))
                .toList();
            when(messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(eq(CONV_ID), any(), any()))
                .thenReturn(unreadMessages);
            when(receiptRepo.findByMessageIdAndUserId(anyString(), eq(TRAINEE)))
                .thenAnswer(inv -> Optional.of(MessageReceipt.builder()
                    .messageId(inv.getArgument(0)).userId(TRAINEE).build()));

            service.markRead(CONV_ID, TRAINEE, "m-target");

            verify(receiptRepo, times(200)).save(any(MessageReceipt.class));
        }

        @Test
        @DisplayName("creates the participant record on first read")
        void markRead_noParticipantYet_createsIt() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(messageRepo.findById("m-target")).thenReturn(Optional.of(message("m-target", TRAINER, readUpTo)));
            when(participantRepo.findByConversationIdAndUserId(CONV_ID, TRAINEE)).thenReturn(Optional.empty());
            when(participantRepo.save(any(ConversationParticipant.class))).thenAnswer(inv -> inv.getArgument(0));
            when(messageRepo.findByConversationIdAndSentAtBeforeOrderBySentAtDesc(eq(CONV_ID), any(), any()))
                .thenReturn(List.of());

            service.markRead(CONV_ID, TRAINEE, "m-target");

            ArgumentCaptor<ConversationParticipant> saved = ArgumentCaptor.forClass(ConversationParticipant.class);
            verify(participantRepo, times(2)).save(saved.capture());
            ConversationParticipant last = saved.getAllValues().get(1);
            assertThat(last.getUserId()).isEqualTo(TRAINEE);
            assertThat(last.getConversationId()).isEqualTo(CONV_ID);
            assertThat(last.getLastReadMessageId()).isEqualTo("m-target");
        }

        @Test
        @DisplayName("message from another conversation throws ResourceNotFound and changes nothing")
        void markRead_messageFromOtherConversation_throws() {
            Message foreign = message("m-foreign", TRAINER, readUpTo);
            foreign.setConversationId("other-conv");
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(messageRepo.findById("m-foreign")).thenReturn(Optional.of(foreign));

            assertThatThrownBy(() -> service.markRead(CONV_ID, TRAINEE, "m-foreign"))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(participantRepo, never()).save(any());
            verify(receiptRepo, never()).save(any());
            verify(events, never()).publishEvent(any());
        }

        @Test
        @DisplayName("unknown message throws ResourceNotFound")
        void markRead_unknownMessage_throws() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(messageRepo.findById("missing")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.markRead(CONV_ID, TRAINEE, "missing"))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("non-participant gets AccessDenied")
        void markRead_nonParticipant_throws() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));

            assertThatThrownBy(() -> service.markRead(CONV_ID, "stranger", "m-target"))
                .isInstanceOf(AccessDeniedException.class);
            verify(messageRepo, never()).findById(any());
        }

        private void stubReadableTarget() {
            when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
            when(messageRepo.findById("m-target")).thenReturn(Optional.of(message("m-target", TRAINER, readUpTo)));
            when(participantRepo.findByConversationIdAndUserId(CONV_ID, TRAINEE)).thenReturn(Optional.of(
                ConversationParticipant.builder().conversationId(CONV_ID).userId(TRAINEE).build()));
        }
    }

    // =====================================================================
    // resolveReadOnlyState
    // =====================================================================

    @Nested
    @DisplayName("resolveReadOnlyState")
    class ReadOnlyState {

        @Test
        @DisplayName("conversation without coaching is writable")
        void resolveReadOnlyState_noCoaching_writable() {
            conv.setCoachingId(null);

            assertThat(service.resolveReadOnlyState(conv)).isEqualTo(new ChatService.ReadOnlyState(false, null));
            verifyNoInteractions(coachingRepo);
        }

        @ParameterizedTest(name = "coaching {0} → readOnly={1}, reason={2}")
        @CsvSource(value = {
            "ACTIVE,   false, NULL",
            "PENDING,  true,  coaching pending",
            "ENDED,    true,  coaching ended",
            "REJECTED, true,  coaching rejected",
        }, nullValues = "NULL")
        @DisplayName("read-only state follows the coaching status")
        void resolveReadOnlyState_byCoachingStatus(CoachingStatus status, boolean readOnly, String reason) {
            when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(coaching(status)));

            assertThat(service.resolveReadOnlyState(conv)).isEqualTo(new ChatService.ReadOnlyState(readOnly, reason));
        }

        @Test
        @DisplayName("missing coaching makes the conversation read-only with reason 'coaching missing'")
        void resolveReadOnlyState_missingCoaching_readOnly() {
            when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.empty());

            assertThat(service.resolveReadOnlyState(conv))
                .isEqualTo(new ChatService.ReadOnlyState(true, "coaching missing"));
        }
    }

    // ---------- helpers ----------

    private void stubWritableConversation() {
        when(conversationRepo.findById(CONV_ID)).thenReturn(Optional.of(conv));
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(coaching(CoachingStatus.ACTIVE)));
    }

    private void stubNoExistingMessage() {
        when(messageRepo.findByConversationIdAndSenderIdAndClientMessageId(eq(CONV_ID), anyString(), eq(CLIENT_MSG_ID)))
            .thenReturn(Optional.empty());
    }

    private void stubMessageSaveAssignsId() {
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId("msg-1");
            return m;
        });
    }

    private static Coaching coaching(CoachingStatus status) {
        return Coaching.builder()
            .id(COACHING_ID)
            .trainerId(TRAINER)
            .traineeId(TRAINEE)
            .status(status)
            .checkIns(new ArrayList<>())
            .build();
    }

    private static Attachment attachment() {
        return Attachment.builder()
            .id("att-1")
            .kind(AttachmentKind.IMAGE)
            .fileName("photo.jpg")
            .mimeType("image/jpeg")
            .sizeBytes(1024)
            .build();
    }

    private static Message message(String id, String senderId, Instant sentAt) {
        return Message.builder()
            .id(id)
            .conversationId(CONV_ID)
            .senderId(senderId)
            .type(MessageType.TEXT)
            .text("text-" + id)
            .sentAt(sentAt)
            .build();
    }
}
