package si.feri.fitlink.videocall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.Message;
import si.feri.fitlink.chat.domain.MessageType;
import si.feri.fitlink.chat.event.ChatMessageSentEvent;
import si.feri.fitlink.chat.repo.ConversationRepository;
import si.feri.fitlink.chat.repo.MessageRepository;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class VideoCallServiceTest {

    @Mock private VideoCallRepository repo;
    @Mock private ConversationRepository conversationRepo;
    @Mock private MessageRepository messageRepo;
    @Mock private ApplicationEventPublisher events;
    @Mock private NotificationService notifications;
    @Mock private UserRepository userRepo;

    @InjectMocks private VideoCallService service;

    private static final String TRAINER_ID = "trainer-uid";
    private static final String TRAINEE_ID = "trainee-uid";
    private static final String CONVERSATION_ID = "conv-1";
    private static final String COACHING_ID = "coaching-1";

    private Conversation conv;

    @BeforeEach
    void setUp() {
        conv = Conversation.builder()
            .id(CONVERSATION_ID)
            .coachingId(COACHING_ID)
            .participantIds(List.of(TRAINER_ID, TRAINEE_ID))
            .build();
    }

    // ---------- schedule() ----------

    @Test
    @DisplayName("schedule() with instant=true creates a LIVE call starting now, with a Jitsi room for the coaching")
    void schedule_instant_createsLiveCall() {
        stubScheduleHappyPath("generated-id");
        Instant before = Instant.now();

        VideoCallRequest result = service.schedule(TRAINER_ID, CONVERSATION_ID, null, true);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.LIVE);
        assertThat(result.getTrainerId()).isEqualTo(TRAINER_ID);
        assertThat(result.getTraineeId()).isEqualTo(TRAINEE_ID);
        assertThat(result.getScheduledByUserId()).isEqualTo(TRAINER_ID);
        assertThat(result.getCoachingId()).isEqualTo(COACHING_ID);
        assertThat(result.getScheduledFor()).isBetween(before, Instant.now());
        // coaching id is stripped of non-alphanumerics, followed by a random UUID room id
        assertThat(result.getMeetingUrl())
            .matches("https://meet\\.jit\\.si/fitlink-coaching1-[0-9a-f\\-]{36}");
        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), any(), eq(CONVERSATION_ID), eq("generated-id"), eq(true));
    }

    @Test
    @DisplayName("schedule() posts a SYSTEM chat message and publishes it to both participants")
    void schedule_emitsSystemMessage() {
        stubScheduleHappyPath("generated-id");

        service.schedule(TRAINER_ID, CONVERSATION_ID, null, true);

        ArgumentCaptor<Message> msg = ArgumentCaptor.forClass(Message.class);
        verify(messageRepo).save(msg.capture());
        assertThat(msg.getValue().getType()).isEqualTo(MessageType.SYSTEM);
        assertThat(msg.getValue().getConversationId()).isEqualTo(CONVERSATION_ID);
        assertThat(msg.getValue().getSystemEvent()).isEqualTo("video_call:generated-id:scheduled");
        assertThat(msg.getValue().getText()).isEqualTo("Video call started — tap to join");

        ArgumentCaptor<ChatMessageSentEvent> event = ArgumentCaptor.forClass(ChatMessageSentEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().recipientUserIds()).containsExactlyInAnyOrder(TRAINER_ID, TRAINEE_ID);
    }

    @Test
    @DisplayName("schedule() with future timestamp creates a PENDING call at that time")
    void schedule_future_createsPendingCall() {
        Instant future = Instant.now().plus(1, ChronoUnit.HOURS);
        stubScheduleHappyPath("generated-id-2");

        VideoCallRequest result = service.schedule(TRAINER_ID, CONVERSATION_ID, future, false);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.PENDING);
        assertThat(result.getScheduledFor()).isEqualTo(future);
        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), any(), eq(CONVERSATION_ID), eq("generated-id-2"), eq(false));
    }

    @Test
    @DisplayName("schedule() still succeeds when the chat system message cannot be stored")
    void schedule_messageFailure_doesNotBreakScheduling() {
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepo.save(any(Message.class))).thenThrow(new RuntimeException("mongo down"));

        VideoCallRequest result = service.schedule(TRAINER_ID, CONVERSATION_ID, null, true);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.LIVE);
        verify(events, never()).publishEvent(any());
        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), any(), eq(CONVERSATION_ID), any(), eq(true));
    }

    @Test
    @DisplayName("schedule() throws when conversation does not exist")
    void schedule_missingConversation_throws() {
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.schedule(TRAINER_ID, CONVERSATION_ID, null, true))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("schedule() throws AccessDenied when caller is not a participant")
    void schedule_nonParticipant_throws() {
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        assertThatThrownBy(() -> service.schedule("stranger-uid", CONVERSATION_ID, null, true))
            .isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
        verify(notifications, never()).notifyVideoCallScheduled(any(), any(), any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("schedule() uses trainer display name in notification when present")
    void schedule_includesTrainerName() {
        User trainer = new User();
        trainer.setFirebaseUid(TRAINER_ID);
        trainer.setDisplayName("Coach Carter");
        stubScheduleHappyPath("generated-id-3");
        when(userRepo.findByFirebaseUid(TRAINER_ID)).thenReturn(Optional.of(trainer));

        service.schedule(TRAINER_ID, CONVERSATION_ID, null, true);

        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), eq("Coach Carter"), eq(CONVERSATION_ID), anyString(), eq(true));
    }

    // ---------- accept() ----------

    @Test
    @DisplayName("accept() transitions PENDING → ACCEPTED for the trainee")
    void accept_pending_transitionsToAccepted() {
        VideoCallRequest call = pendingCall();
        stubDecisionHappyPath(call);

        VideoCallRequest result = service.accept(call.getId(), TRAINEE_ID);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.ACCEPTED);
        assertThat(result.getDecidedAt()).isNotNull();
        verify(repo).save(call);
    }

    @Test
    @DisplayName("accept() by trainer (not trainee) throws AccessDenied")
    void accept_byTrainer_throws() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.accept(call.getId(), TRAINER_ID))
            .isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @ParameterizedTest(name = "accept() on {0} call is rejected")
    @EnumSource(value = VideoCallStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("accept() only works on PENDING calls")
    void accept_notPending_throws(VideoCallStatus status) {
        VideoCallRequest call = pendingCall();
        call.setStatus(status);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.accept(call.getId(), TRAINEE_ID))
            .isInstanceOf(IllegalStateException.class);
        assertThat(call.getStatus()).isEqualTo(status);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("accept() on missing call throws ResourceNotFound")
    void accept_missing_throws() {
        when(repo.findById("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept("nope", TRAINEE_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- decline() ----------

    @Test
    @DisplayName("decline() transitions PENDING → DECLINED and stores the reason")
    void decline_storesReason() {
        VideoCallRequest call = pendingCall();
        stubDecisionHappyPath(call);

        VideoCallRequest result = service.decline(call.getId(), TRAINEE_ID, "Busy at gym");

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.DECLINED);
        assertThat(result.getDecidedAt()).isNotNull();
        assertThat(result.getDeclineReason()).isEqualTo("Busy at gym");
    }

    @Test
    @DisplayName("decline() keeps a reason of exactly 280 chars and truncates longer ones to the first 280")
    void decline_truncatesLongReason() {
        String exact = "a".repeat(280);
        String tooLong = "b".repeat(280) + "TAIL";

        VideoCallRequest first = pendingCall();
        stubDecisionHappyPath(first);
        assertThat(service.decline(first.getId(), TRAINEE_ID, exact).getDeclineReason()).isEqualTo(exact);

        VideoCallRequest second = pendingCall();
        second.setId("call-2");
        when(repo.findById("call-2")).thenReturn(Optional.of(second));
        assertThat(service.decline("call-2", TRAINEE_ID, tooLong).getDeclineReason())
            .isEqualTo("b".repeat(280));
    }

    @Test
    @DisplayName("decline() with blank reason leaves declineReason null")
    void decline_blankReason_ignored() {
        VideoCallRequest call = pendingCall();
        stubDecisionHappyPath(call);

        VideoCallRequest result = service.decline(call.getId(), TRAINEE_ID, "   ");

        assertThat(result.getDeclineReason()).isNull();
    }

    @Test
    @DisplayName("decline() by trainer throws AccessDenied")
    void decline_byTrainer_throws() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.decline(call.getId(), TRAINER_ID, "no"))
            .isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @ParameterizedTest(name = "decline() on {0} call is rejected")
    @EnumSource(value = VideoCallStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("decline() only works on PENDING calls")
    void decline_notPending_throws(VideoCallStatus status) {
        VideoCallRequest call = pendingCall();
        call.setStatus(status);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.decline(call.getId(), TRAINEE_ID, "no"))
            .isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
    }

    // ---------- cancel() ----------

    @ParameterizedTest(name = "cancel() on {0} call → CANCELLED")
    @EnumSource(value = VideoCallStatus.class, names = {"PENDING", "LIVE"})
    @DisplayName("cancel() by trainer works on PENDING and LIVE calls")
    void cancel_byTrainer_ok(VideoCallStatus status) {
        VideoCallRequest call = pendingCall();
        call.setStatus(status);
        stubDecisionHappyPath(call);

        VideoCallRequest result = service.cancel(call.getId(), TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.CANCELLED);
        assertThat(result.getDecidedAt()).isNotNull();
    }

    @Test
    @DisplayName("cancel() by trainee throws AccessDenied")
    void cancel_byTrainee_throws() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.cancel(call.getId(), TRAINEE_ID))
            .isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @ParameterizedTest(name = "cancel() on finished {0} call is rejected")
    @EnumSource(value = VideoCallStatus.class, names = {"DECLINED", "CANCELLED", "EXPIRED", "COMPLETED"})
    @DisplayName("cancel() on an already finished call throws IllegalStateException")
    void cancel_finished_throws(VideoCallStatus status) {
        VideoCallRequest call = pendingCall();
        call.setStatus(status);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.cancel(call.getId(), TRAINER_ID))
            .isInstanceOf(IllegalStateException.class);
        assertThat(call.getStatus()).isEqualTo(status);
        verify(repo, never()).save(any());
    }

    // ---------- get() ----------

    @Test
    @DisplayName("get() allows the trainer to read the call")
    void get_byTrainer_ok() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThat(service.get(call.getId(), TRAINER_ID)).isSameAs(call);
    }

    @Test
    @DisplayName("get() allows the trainee to read the call")
    void get_byTrainee_ok() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThat(service.get(call.getId(), TRAINEE_ID)).isSameAs(call);
    }

    @Test
    @DisplayName("get() by a third party throws AccessDenied")
    void get_byStranger_throws() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.get(call.getId(), "stranger-uid"))
            .isInstanceOf(AccessDeniedException.class);
    }

    // ---------- listForConversation() ----------

    @Test
    @DisplayName("listForConversation() returns the calls of the conversation to a participant")
    void listForConversation_participant_ok() {
        VideoCallRequest call = pendingCall();
        lenient().when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.findByConversationIdOrderByScheduledForDesc(CONVERSATION_ID)).thenReturn(List.of(call));

        assertThat(service.listForConversation(CONVERSATION_ID, TRAINEE_ID)).containsExactly(call);
    }

    @Test
    @DisplayName("listForConversation() by a non-participant throws AccessDenied")
    void listForConversation_stranger_throws() {
        lenient().when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        lenient().when(repo.findByConversationIdOrderByScheduledForDesc(CONVERSATION_ID))
            .thenReturn(List.of(pendingCall()));

        assertThatThrownBy(() -> service.listForConversation(CONVERSATION_ID, "stranger-uid"))
            .isInstanceOf(AccessDeniedException.class);
    }

    // ---------- windowForUser() ----------

    @Test
    @DisplayName("windowForUser() merges calls as trainee and as trainer without duplicates")
    void windowForUser_mergesWithoutDuplicates() {
        Instant from = Instant.now();
        Instant to = from.plus(7, ChronoUnit.DAYS);
        VideoCallRequest shared = pendingCall();
        VideoCallRequest asTraineeOnly = pendingCall();
        asTraineeOnly.setId("call-trainee");
        VideoCallRequest asTrainerOnly = pendingCall();
        asTrainerOnly.setId("call-trainer");
        when(repo.findByTraineeIdAndScheduledForBetweenOrderByScheduledForAsc("u", from, to))
            .thenReturn(List.of(shared, asTraineeOnly));
        when(repo.findByTrainerIdAndScheduledForBetweenOrderByScheduledForAsc("u", from, to))
            .thenReturn(List.of(shared, asTrainerOnly));

        List<VideoCallRequest> result = service.windowForUser("u", from, to);

        assertThat(result).extracting(VideoCallRequest::getId)
            .containsExactlyInAnyOrder("call-1", "call-trainee", "call-trainer");
    }

    // ---------- sweepStale() ----------

    @Test
    @DisplayName("sweepStale() expires PENDING calls scheduled before now and posts an 'expired' message")
    void sweep_expiresPastPending() {
        VideoCallRequest stale = pendingCall();
        stale.setScheduledFor(Instant.now().minus(10, ChronoUnit.MINUTES));
        when(repo.findByStatusInAndScheduledForBefore(eq(List.of(VideoCallStatus.PENDING)), any()))
            .thenReturn(List.of(stale));
        when(repo.findByStatusInAndScheduledForBefore(
            eq(List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE)), any()))
            .thenReturn(List.of());
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        Instant before = Instant.now();

        int touched = service.sweepStale();

        assertThat(touched).isEqualTo(1);
        assertThat(stale.getStatus()).isEqualTo(VideoCallStatus.EXPIRED);
        assertThat(stale.getDecidedAt()).isNotNull();
        verify(repo).save(stale);

        ArgumentCaptor<Instant> pendingCutoff = ArgumentCaptor.forClass(Instant.class);
        verify(repo).findByStatusInAndScheduledForBefore(eq(List.of(VideoCallStatus.PENDING)), pendingCutoff.capture());
        assertThat(pendingCutoff.getValue()).isBetween(before, Instant.now());

        ArgumentCaptor<Message> msg = ArgumentCaptor.forClass(Message.class);
        verify(messageRepo).save(msg.capture());
        assertThat(msg.getValue().getSystemEvent()).isEqualTo("video_call:call-1:expired");
    }

    @Test
    @DisplayName("sweepStale() completes ACCEPTED/LIVE calls whose start is more than 2 hours ago")
    void sweep_completesOldAccepted() {
        VideoCallRequest old = pendingCall();
        old.setStatus(VideoCallStatus.ACCEPTED);
        old.setScheduledFor(Instant.now().minus(3, ChronoUnit.HOURS));
        when(repo.findByStatusInAndScheduledForBefore(eq(List.of(VideoCallStatus.PENDING)), any()))
            .thenReturn(List.of());
        when(repo.findByStatusInAndScheduledForBefore(
            eq(List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE)), any()))
            .thenReturn(List.of(old));

        int touched = service.sweepStale();

        assertThat(touched).isEqualTo(1);
        assertThat(old.getStatus()).isEqualTo(VideoCallStatus.COMPLETED);
        assertThat(old.getCompletedAt()).isNotNull();
        verify(repo).save(old);

        ArgumentCaptor<Instant> completedCutoff = ArgumentCaptor.forClass(Instant.class);
        verify(repo).findByStatusInAndScheduledForBefore(
            eq(List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE)), completedCutoff.capture());
        assertThat(completedCutoff.getValue())
            .isCloseTo(Instant.now().minus(2, ChronoUnit.HOURS), within(5, ChronoUnit.SECONDS));
    }

    @Test
    @DisplayName("sweepStale() returns 0 when no stale calls exist")
    void sweep_noStale_returnsZero() {
        when(repo.findByStatusInAndScheduledForBefore(any(), any())).thenReturn(List.of());

        assertThat(service.sweepStale()).isZero();
        verify(repo, never()).save(any());
    }

    // ---------- helpers ----------

    private void stubScheduleHappyPath(String generatedId) {
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> {
            VideoCallRequest v = inv.getArgument(0);
            if (v.getId() == null) v.setId(generatedId);
            return v;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubDecisionHappyPath(VideoCallRequest call) {
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
    }

    private VideoCallRequest pendingCall() {
        return VideoCallRequest.builder()
            .id("call-1")
            .conversationId(CONVERSATION_ID)
            .coachingId(COACHING_ID)
            .scheduledByUserId(TRAINER_ID)
            .trainerId(TRAINER_ID)
            .traineeId(TRAINEE_ID)
            .status(VideoCallStatus.PENDING)
            .scheduledFor(Instant.now().plus(1, ChronoUnit.HOURS))
            .createdAt(Instant.now())
            .meetingUrl("https://meet.jit.si/fitlink-test")
            .build();
    }
}
