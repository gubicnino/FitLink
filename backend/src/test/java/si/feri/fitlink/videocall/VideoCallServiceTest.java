package si.feri.fitlink.videocall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.Message;
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
    @DisplayName("schedule() with instant=true creates a LIVE call without scheduledFor input")
    void schedule_instant_createsLiveCall() {
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> {
            VideoCallRequest v = inv.getArgument(0);
            if (v.getId() == null) v.setId("generated-id");
            return v;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        VideoCallRequest result = service.schedule(TRAINER_ID, CONVERSATION_ID, null, true);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.LIVE);
        assertThat(result.getTrainerId()).isEqualTo(TRAINER_ID);
        assertThat(result.getTraineeId()).isEqualTo(TRAINEE_ID);
        assertThat(result.getMeetingUrl()).startsWith("https://meet.jit.si/fitlink-");
        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), any(), eq(CONVERSATION_ID), anyString(), eq(true));
    }

    @Test
    @DisplayName("schedule() with future timestamp creates PENDING call")
    void schedule_future_createsPendingCall() {
        Instant future = Instant.now().plus(1, ChronoUnit.HOURS);
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> {
            VideoCallRequest v = inv.getArgument(0);
            if (v.getId() == null) v.setId("generated-id-2");
            return v;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        VideoCallRequest result = service.schedule(TRAINER_ID, CONVERSATION_ID, future, false);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.PENDING);
        assertThat(result.getScheduledFor()).isEqualTo(future);
        verify(notifications).notifyVideoCallScheduled(
            eq(TRAINEE_ID), any(), eq(CONVERSATION_ID), anyString(), eq(false));
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
    }

    @Test
    @DisplayName("schedule() uses trainer display name in notification when present")
    void schedule_includesTrainerName() {
        User trainer = new User();
        trainer.setFirebaseUid(TRAINER_ID);
        trainer.setDisplayName("Coach Carter");
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> {
            VideoCallRequest v = inv.getArgument(0);
            if (v.getId() == null) v.setId("generated-id-3");
            return v;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
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
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.accept(call.getId(), TRAINEE_ID);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.ACCEPTED);
        assertThat(result.getDecidedAt()).isNotNull();
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

    @Test
    @DisplayName("accept() on already-ACCEPTED call throws IllegalStateException")
    void accept_alreadyAccepted_throws() {
        VideoCallRequest call = pendingCall();
        call.setStatus(VideoCallStatus.ACCEPTED);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.accept(call.getId(), TRAINEE_ID))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("accept() on EXPIRED call throws IllegalStateException")
    void accept_expired_throws() {
        VideoCallRequest call = pendingCall();
        call.setStatus(VideoCallStatus.EXPIRED);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.accept(call.getId(), TRAINEE_ID))
            .isInstanceOf(IllegalStateException.class);
    }

    // ---------- decline() ----------

    @Test
    @DisplayName("decline() transitions PENDING → DECLINED and stores the reason")
    void decline_storesReason() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.decline(call.getId(), TRAINEE_ID, "Busy at gym");

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.DECLINED);
        assertThat(result.getDeclineReason()).isEqualTo("Busy at gym");
    }

    @Test
    @DisplayName("decline() truncates reasons longer than 280 chars")
    void decline_truncatesLongReason() {
        VideoCallRequest call = pendingCall();
        String longReason = "x".repeat(500);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.decline(call.getId(), TRAINEE_ID, longReason);

        assertThat(result.getDeclineReason()).hasSize(280);
    }

    @Test
    @DisplayName("decline() with blank reason leaves declineReason null")
    void decline_blankReason_ignored() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.decline(call.getId(), TRAINEE_ID, "   ");

        assertThat(result.getDeclineReason()).isNull();
    }

    // ---------- cancel() ----------

    @Test
    @DisplayName("cancel() by trainer on PENDING call transitions to CANCELLED")
    void cancel_pending_byTrainer_ok() {
        VideoCallRequest call = pendingCall();
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.cancel(call.getId(), TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.CANCELLED);
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

    @Test
    @DisplayName("cancel() on already-DECLINED call throws IllegalStateException")
    void cancel_declined_throws() {
        VideoCallRequest call = pendingCall();
        call.setStatus(VideoCallStatus.DECLINED);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> service.cancel(call.getId(), TRAINER_ID))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("cancel() works on LIVE call (instant in-progress)")
    void cancel_live_ok() {
        VideoCallRequest call = pendingCall();
        call.setStatus(VideoCallStatus.LIVE);
        when(repo.findById(call.getId())).thenReturn(Optional.of(call));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        VideoCallRequest result = service.cancel(call.getId(), TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(VideoCallStatus.CANCELLED);
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

    // ---------- sweepStale() ----------

    @Test
    @DisplayName("sweepStale() expires PENDING calls whose scheduledFor has passed")
    void sweep_expiresPastPending() {
        VideoCallRequest stale = pendingCall();
        stale.setScheduledFor(Instant.now().minus(10, ChronoUnit.MINUTES));
        when(repo.findByStatusInAndScheduledForBefore(eq(List.of(VideoCallStatus.PENDING)), any()))
            .thenReturn(List.of(stale));
        when(repo.findByStatusInAndScheduledForBefore(
            eq(List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE)), any()))
            .thenReturn(List.of());
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepo.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        int touched = service.sweepStale();

        assertThat(touched).isEqualTo(1);
        assertThat(stale.getStatus()).isEqualTo(VideoCallStatus.EXPIRED);
        assertThat(stale.getDecidedAt()).isNotNull();
    }

    @Test
    @DisplayName("sweepStale() completes ACCEPTED/LIVE calls older than 2 hours")
    void sweep_completesOldAccepted() {
        VideoCallRequest old = pendingCall();
        old.setStatus(VideoCallStatus.ACCEPTED);
        old.setScheduledFor(Instant.now().minus(3, ChronoUnit.HOURS));
        when(repo.findByStatusInAndScheduledForBefore(eq(List.of(VideoCallStatus.PENDING)), any()))
            .thenReturn(List.of());
        when(repo.findByStatusInAndScheduledForBefore(
            eq(List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE)), any()))
            .thenReturn(List.of(old));
        when(repo.save(any(VideoCallRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        int touched = service.sweepStale();

        assertThat(touched).isEqualTo(1);
        assertThat(old.getStatus()).isEqualTo(VideoCallStatus.COMPLETED);
        assertThat(old.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("sweepStale() returns 0 when no stale calls exist")
    void sweep_noStale_returnsZero() {
        when(repo.findByStatusInAndScheduledForBefore(any(), any())).thenReturn(List.of());

        assertThat(service.sweepStale()).isZero();
        verify(repo, never()).save(any());
    }

    // ---------- helpers ----------

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
