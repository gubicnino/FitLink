package si.feri.fitlink.coaching;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
    private static final List<CoachingStatus> OPEN_STATUSES =
        List.of(CoachingStatus.PENDING, CoachingStatus.ACTIVE);

    /** Index of "today" in the 15-day calendar (7 days back + today + 7 forward). */
    private static final int TODAY_INDEX = 7;

    // ---------- requestCoaching ----------

    @Test
    @DisplayName("requestCoaching creates a PENDING coaching and notifies the trainer")
    void requestCoaching_createsAndNotifies() {
        CoachingRequestDTO dto = new CoachingRequestDTO();
        dto.setTrainerId(TRAINER_ID);
        dto.setRequestMessage("Hi!");
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(TRAINEE_ID, TRAINER_ID, OPEN_STATUSES))
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
        assertThat(result.getStartedAt()).isNull();
        verify(notificationService).notifyCoachingRequest(result);
    }

    @ParameterizedTest(name = "existing {0} coaching blocks a new request")
    @EnumSource(value = CoachingStatus.class, names = {"PENDING", "ACTIVE"})
    @DisplayName("requestCoaching throws when a PENDING or ACTIVE coaching with the same trainer already exists")
    void requestCoaching_duplicate_throws(CoachingStatus existingStatus) {
        CoachingRequestDTO dto = new CoachingRequestDTO();
        dto.setTrainerId(TRAINER_ID);
        Coaching existing = activeCoaching();
        existing.setStatus(existingStatus);
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(TRAINEE_ID, TRAINER_ID, OPEN_STATUSES))
            .thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.requestCoaching(TRAINEE_ID, dto))
            .isInstanceOf(IllegalStateException.class);
        verify(coachingRepo, never()).save(any());
        verify(notificationService, never()).notifyCoachingRequest(any());
    }

    // ---------- acceptCoaching ----------

    @Test
    @DisplayName("acceptCoaching transitions PENDING → ACTIVE, notifies the trainee and creates a conversation")
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

    @ParameterizedTest(name = "accepting a {0} coaching is rejected")
    @EnumSource(value = CoachingStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("acceptCoaching only works on PENDING requests")
    void acceptCoaching_notPending_throws(CoachingStatus status) {
        Coaching coaching = pendingCoaching();
        coaching.setStatus(status);
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(coaching));

        assertThatThrownBy(() -> service.acceptCoaching(COACHING_ID, TRAINER_ID))
            .isInstanceOf(IllegalStateException.class);
        assertThat(coaching.getStatus()).isEqualTo(status);
        verify(coachingRepo, never()).save(any());
        verify(notificationService, never()).notifyCoachingAccepted(any());
    }

    @Test
    @DisplayName("acceptCoaching by wrong trainer throws AccessDenied")
    void acceptCoaching_wrongTrainer_throws() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.acceptCoaching(COACHING_ID, "other-trainer"))
            .isInstanceOf(AccessDeniedException.class);
        assertThat(pending.getStatus()).isEqualTo(CoachingStatus.PENDING);
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
    @DisplayName("acceptCoaching still accepts and notifies when conversation creation fails")
    void acceptCoaching_conversationFailure_doesNotRollback() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("chat down"))
            .when(conversationLifecycle).onCoachingActivated(any());

        Coaching result = service.acceptCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.ACTIVE);
        verify(coachingRepo).save(pending);
        verify(notificationService).notifyCoachingAccepted(result);
    }

    // ---------- rejectCoaching ----------

    @Test
    @DisplayName("rejectCoaching transitions PENDING → REJECTED without activating anything")
    void rejectCoaching_ok() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        Coaching result = service.rejectCoaching(COACHING_ID, TRAINER_ID);

        assertThat(result.getStatus()).isEqualTo(CoachingStatus.REJECTED);
        assertThat(result.getStartedAt()).isNull();
        verify(coachingRepo).save(pending);
        verify(notificationService, never()).notifyCoachingAccepted(any());
        verify(conversationLifecycle, never()).onCoachingActivated(any());
    }

    @ParameterizedTest(name = "rejecting a {0} coaching is rejected")
    @EnumSource(value = CoachingStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("rejectCoaching only works on PENDING requests")
    void rejectCoaching_notPending_throws(CoachingStatus status) {
        Coaching coaching = pendingCoaching();
        coaching.setStatus(status);
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(coaching));

        assertThatThrownBy(() -> service.rejectCoaching(COACHING_ID, TRAINER_ID))
            .isInstanceOf(IllegalStateException.class);
        assertThat(coaching.getStatus()).isEqualTo(status);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("rejectCoaching by non-trainer throws AccessDenied")
    void rejectCoaching_wrongTrainer_throws() {
        Coaching pending = pendingCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.rejectCoaching(COACHING_ID, "other"))
            .isInstanceOf(AccessDeniedException.class);
        verify(coachingRepo, never()).save(any());
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
        assertThat(active.getStatus()).isEqualTo(CoachingStatus.ACTIVE);
        verify(coachingRepo, never()).save(any());
    }

    // ---------- isTrainerOfTrainee ----------

    @Test
    @DisplayName("isTrainerOfTrainee true when an ACTIVE coaching exists")
    void isTrainerOfTrainee_activeExists_true() {
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            TRAINEE_ID, TRAINER_ID, List.of(CoachingStatus.ACTIVE)))
            .thenReturn(List.of(activeCoaching()));

        assertThat(service.isTrainerOfTrainee(TRAINER_ID, TRAINEE_ID)).isTrue();
    }

    @Test
    @DisplayName("isTrainerOfTrainee false when no ACTIVE coaching (PENDING does not grant access)")
    void isTrainerOfTrainee_none_false() {
        when(coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            TRAINEE_ID, TRAINER_ID, List.of(CoachingStatus.ACTIVE)))
            .thenReturn(List.of());

        assertThat(service.isTrainerOfTrainee(TRAINER_ID, TRAINEE_ID)).isFalse();
    }

    // ---------- buildTrainerCalendar ----------

    @Test
    @DisplayName("buildTrainerCalendar returns 15 consecutive days from today-7 to today+7")
    void buildCalendar_window() {
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of());
        LocalDate today = LocalDate.now(ZoneId.systemDefault());

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out).hasSize(15);
        for (int i = 0; i < out.size(); i++) {
            assertThat(out.get(i).getDate()).isEqualTo(today.minusDays(7).plusDays(i).toString());
            assertThat(out.get(i).getCheckInsCount()).isZero();
            assertThat(out.get(i).getWeightLogsCount()).isZero();
            assertThat(out.get(i).getOverdueClientNames()).isEmpty();
        }
    }

    @Test
    @DisplayName("buildTrainerCalendar counts today's check-in on today's row only")
    void buildCalendar_countsCheckInOnItsDay() {
        Coaching c = activeCoaching();
        c.getCheckIns().add(CheckIn.builder()
            .id("ci-1")
            .traineeId(TRAINEE_ID)
            .start(Instant.now())
            .createdAt(Instant.now())
            .build());
        stubSingleClient(c, "Bob", null);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out.get(TODAY_INDEX).getCheckInsCount()).isEqualTo(1);
        assertThat(out.get(TODAY_INDEX).getActiveClients()).isEqualTo(1);
        assertThat(out.stream().mapToInt(TrainerCalendarDTO::getCheckInsCount).sum()).isEqualTo(1);
        assertThat(out.get(TODAY_INDEX).getOverdueClientNames()).doesNotContain("Bob");
    }

    @Test
    @DisplayName("buildTrainerCalendar ignores check-ins outside the window but flags the client as overdue")
    void buildCalendar_oldCheckIn_notCountedButOverdue() {
        Coaching c = activeCoaching();
        c.getCheckIns().add(CheckIn.builder()
            .id("ci-old")
            .traineeId(TRAINEE_ID)
            .start(Instant.now().minus(30, ChronoUnit.DAYS))
            .build());
        stubSingleClient(c, "Anna", null);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out.stream().mapToInt(TrainerCalendarDTO::getCheckInsCount).sum()).isZero();
        assertThat(out.get(TODAY_INDEX).getOverdueClientNames()).containsExactly("Anna");
    }

    @Test
    @DisplayName("buildTrainerCalendar flags a client who never checked in as overdue")
    void buildCalendar_neverCheckedIn_overdue() {
        stubSingleClient(activeCoaching(), "Dan", null);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out.get(TODAY_INDEX).getOverdueClientNames()).containsExactly("Dan");
    }

    @Test
    @DisplayName("buildTrainerCalendar uses 'Client' when the trainee has no display name")
    void buildCalendar_missingName_fallback() {
        stubSingleClient(activeCoaching(), null, null);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out.get(TODAY_INDEX).getOverdueClientNames()).containsExactly("Client");
    }

    @Test
    @DisplayName("buildTrainerCalendar counts today's weight log and counts a client once per day")
    void buildCalendar_weightLogAndCheckInSameDay_singleActiveClient() {
        Coaching c = activeCoaching();
        c.getCheckIns().add(CheckIn.builder().id("ci-1").traineeId(TRAINEE_ID).start(Instant.now()).build());
        HealthSnapshotDoc snap = new HealthSnapshotDoc();
        snap.setUserId(TRAINEE_ID);
        snap.setLatestWeightAt(Instant.now());
        stubSingleClient(c, "Cara", snap);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        TrainerCalendarDTO today = out.get(TODAY_INDEX);
        assertThat(today.getCheckInsCount()).isEqualTo(1);
        assertThat(today.getWeightLogsCount()).isEqualTo(1);
        assertThat(today.getActiveClients()).isEqualTo(1);
        assertThat(out.stream().mapToInt(TrainerCalendarDTO::getWeightLogsCount).sum()).isEqualTo(1);
    }

    @Test
    @DisplayName("buildTrainerCalendar ignores a weight log older than the window")
    void buildCalendar_oldWeightLog_notCounted() {
        HealthSnapshotDoc snap = new HealthSnapshotDoc();
        snap.setUserId(TRAINEE_ID);
        snap.setLatestWeightAt(Instant.now().minus(30, ChronoUnit.DAYS));
        stubSingleClient(activeCoaching(), "Eve", snap);

        List<TrainerCalendarDTO> out = service.buildTrainerCalendar(TRAINER_ID);

        assertThat(out.stream().mapToInt(TrainerCalendarDTO::getWeightLogsCount).sum()).isZero();
    }

    // ---------- helpers ----------

    private void stubSingleClient(Coaching c, String displayName, HealthSnapshotDoc snapshot) {
        when(coachingRepo.findByTrainerIdAndStatus(TRAINER_ID, CoachingStatus.ACTIVE))
            .thenReturn(List.of(c));
        when(userRepo.findByFirebaseUid(TRAINEE_ID)).thenReturn(Optional.of(userWithName(displayName)));
        when(healthSnapshotRepo.findByUserId(TRAINEE_ID)).thenReturn(Optional.ofNullable(snapshot));
    }

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
