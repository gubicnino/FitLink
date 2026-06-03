package si.feri.fitlink.coaching;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.chat.service.ConversationLifecycleService;
import si.feri.fitlink.checkin.CheckIn;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.coaching.dto.TrainerCalendarDTO;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.health.HealthSnapshotDoc;
import si.feri.fitlink.health.HealthSnapshotRepository;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class CoachingServiceTest {

    @Mock private CoachingRepository coachingRepo;
    @Mock private NotificationService notificationService;
    @Mock private ConversationLifecycleService conversationLifecycle;
    @Mock private HealthSnapshotRepository healthSnapshotRepo;
    @Mock private UserRepository userRepo;

    @InjectMocks private CoachingService service;

    private static final String TRAINER_ID = "trainer-uid";
    private static final String TRAINEE_ID = "trainee-uid";
    private static final String COACHING_ID = "coaching-1";

    // ---------- requestCoaching ----------

    @Test
    @DisplayName("requestCoaching creates a PENDING coaching and notifies the trainer")
    void requestCoaching_createsAndNotifies() {
        CoachingRequestDTO dto = new CoachingRequestDTO();
        dto.setTrainerId(TRAINER_ID);
        dto.setRequestMessage("Hi!");
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(any(), any(), any()))
            .thenReturn(List.of());
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> {
            Coaching c = inv.getArgument(0);
            if (c.getId() == null) c.setId(COACHING_ID);
            return c;
        });

        Coaching result = service.requestCoaching(TRAINEE_ID, dto);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.PENDING);
        assertThat(result.getTraineeId()).isEqualTo(TRAINEE_ID);
        assertThat(result.getTrainerId()).isEqualTo(TRAINER_ID);
        assertThat(result.getRequestMessage()).isEqualTo("Hi!");
        verify(notificationService).notifyCoachingRequest(result);
    }

    @Test
    @DisplayName("requestCoaching throws when a PENDING or ACTIVE request already exists")
    void requestCoaching_duplicate_throws() {
        CoachingRequestDTO dto = new CoachingRequestDTO();
        dto.setTrainerId(TRAINER_ID);
        Coaching existing = activeCoaching();
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(any(), any(), any()))
            .thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.requestCoaching(TRAINEE_ID, dto))
            .isInstanceOf(IllegalStateException.class);
        verify(coachingRepo, never()).save(any());
        verify(notificationService, never()).notifyCoachingRequest(any());
    }

    // ---------- acceptCoaching ----------

    @Test
    @DisplayName("acceptCoaching transitions PENDING → ACTIVE and creates conversation")
    void acceptCoaching_ok() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        Coaching result = service.acceptCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.ACTIVE);
        assertThat(result.getStartedAt()).isNotNull();
        verify(notificationService).notifyCoachingAccepted(result);
        verify(conversationLifecycle).onCoachingActivated(result);
    }

    @Test
    @DisplayName("acceptCoaching by wrong trainer throws AccessDenied")
    void acceptCoaching_wrongTrainer_throws() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.acceptCoaching(COACHING_ID, "other-trainer"))
            .isInstanceOf(AccessDeniedException.class);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("acceptCoaching on missing id throws ResourceNotFound")
    void acceptCoaching_notFound_throws() {
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.acceptCoaching(COACHING_ID, TRAINER_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("acceptCoaching swallows conversation lifecycle failure")
    void acceptCoaching_conversationFailure_doesNotRollback() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.doThrow(new RuntimeException("chat down"))
            .when(conversationLifecycle).onCoachingActivated(any());

        Coaching result = service.acceptCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.ACTIVE);
    }

    // ---------- rejectCoaching ----------

    @Test
    @DisplayName("rejectCoaching transitions PENDING → REJECTED")
    void rejectCoaching_ok() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        Coaching result = service.rejectCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.REJECTED);
    }

    @Test
    @DisplayName("rejectCoaching by non-trainer throws AccessDenied")
    void rejectCoaching_wrongTrainer_throws() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.rejectCoaching(COACHING_ID, "other"))
            .isInstanceOf(AccessDeniedException.class);
    }

    // ---------- endCoaching ----------

    @Test
    @DisplayName("endCoaching by trainer marks ENDED and records endedBy")
    void endCoaching_byTrainer_ok() {
        Coaching active = activeCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        Coaching result = service.endCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.ENDED);
        assertThat(result.getEndedBy()).isEqualTo(TRAINER_ID);
        assertThat(result.getEndedAt()).isNotNull();
    }

    @Test
    @DisplayName("endCoaching by trainee also allowed (either party may end)")
    void endCoaching_byTrainee_ok() {
        Coaching active = activeCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        Coaching result = service.endCoaching(COACHING_ID, TRAINEE_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.ENDED);
        assertThat(result.getEndedBy()).isEqualTo(TRAINEE_ID);
    }

    @Test
    @DisplayName("endCoaching by stranger throws AccessDenied")
    void endCoaching_byStranger_throws() {
        Coaching active = activeCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.endCoaching(COACHING_ID, "stranger"))
            .isInstanceOf(AccessDeniedException.class);
    }

    // ---------- isTrainerOfTrainee ----------

    @Test
    @DisplayName("isTrainerOfTrainee true only when an ACTIVE coaching exists")
    void isTrainerOfTrainee_activeExists_true() {
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            TRAINEE_ID, TRAINER_ID, List.of(CoachingStatus.ACTIVE)))
            .thenReturn(List.of(activeCoaching()));

        assertThat(service.isTrainerOfTrainee(TRAINER_ID, TRAINEE_ID)).isTrue();
    }

    @Test
    @DisplayName("isTrainerOfTrainee false when no ACTIVE coaching")
    void isTrainerOfTrainee_none_false() {
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            TRAINEE_ID, TRAINER_ID, List.of(CoachingStatus.ACTIVE)))
            .thenReturn(List.of());

        assertThat(service.isTrainerOfTrainee(TRAINER_ID, TRAINEE_ID)).isFalse();
    }

    // ---------- buildTrainerCalendar ----------

    @Test
    @DisplayName("buildTrainerCalendar returns 15-day window (back 7 + today + forward 7)")
    void buildCalendar_windowSize() {
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of());

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out).hasSize(15);
    }

    @Test
    @DisplayName("buildTrainerCalendar counts a check-in inside the window")
    void buildCalendar_countsCheckInInWindow() {
        Coaching c = activeCoaching();
        CheckIn ci = CheckIn.builder()
            .id("ci-1")
            .traineeId(TRAINEE_ID)
            .start(Instant.now())
            .createdAt(Instant.now())
            .build();
        c.getCheckIns().add(ci);
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of(c));
        when(userRepo.findByFirebaseUid(TRAINEE_ID)).thenReturn(Optional.of(userWithName("Bob")));
        when(healthSnapshotRepo.findByUserId(TRAINEE_ID)).thenReturn(Optional.empty());

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);
        int totalCheckIns = out.stream().mapToInt(TrainerCalendarDTO::getCheckInsCount).sum();

        assertThat(totalCheckIns).isEqualTo(1);
    }

    @Test
    @DisplayName("buildTrainerCalendar flags overdue client when last check-in older than 7 days")
    void buildCalendar_flagsOverdue() {
        Coaching c = activeCoaching();
        CheckIn old = CheckIn.builder()
            .id("ci-old")
            .traineeId(TRAINEE_ID)
            .start(Instant.now().minus(30, ChronoUnit.DAYS))
            .createdAt(Instant.now().minus(30, ChronoUnit.DAYS))
            .build();
        c.getCheckIns().add(old);
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of(c));
        when(userRepo.findByFirebaseUid(TRAINEE_ID)).thenReturn(Optional.of(userWithName("Anna")));
        when(healthSnapshotRepo.findByUserId(TRAINEE_ID)).thenReturn(Optional.empty());

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);
        TrainerCalendarDTO today = out.get(7); // index 7 == today

        assertThat(today.getOverdueClientNames()).contains("Anna");
    }

    @Test
    @DisplayName("buildTrainerCalendar counts a weight log via HealthSnapshot")
    void buildCalendar_countsWeightLog() {
        Coaching c = activeCoaching();
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of(c));
        when(userRepo.findByFirebaseUid(TRAINEE_ID)).thenReturn(Optional.of(userWithName("Cara")));
        HealthSnapshotDoc snap = new HealthSnapshotDoc();
        snap.setUserId(TRAINEE_ID);
        snap.setLatestWeightAt(Instant.now());
        when(healthSnapshotRepo.findByUserId(TRAINEE_ID)).thenReturn(Optional.of(snap));

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);
        int totalWeightLogs = out.stream().mapToInt(TrainerCalendarDTO::getWeightLogsCount).sum();

        assertThat(totalWeightLogs).isEqualTo(1);
    }

    // ---------- helpers ----------

    private Coaching pendingCoaching() {
        return Coaching.builder()
            .id(COACHING_ID)
            .traineeId(TRAINEE_ID)
            .trainerId(TRAINER_ID)
            .status(CoachingStatus.PENDING)
            .build();
    }

    private Coaching activeCoaching() {
        return Coaching.builder()
            .id(COACHING_ID)
            .traineeId(TRAINEE_ID)
            .trainerId(TRAINER_ID)
            .status(CoachingStatus.ACTIVE)
            .startedAt(Instant.now())
            .build();
    }

    private User userWithName(String name) {
        User u = new User();
        u.setFirebaseUid(TRAINEE_ID);
        u.setDisplayName(name);
        return u;
    }
}
