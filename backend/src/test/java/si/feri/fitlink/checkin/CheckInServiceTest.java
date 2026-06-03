package si.feri.fitlink.checkin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.checkin.dto.CheckInDTO;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.coaching.CoachingRepository;
import si.feri.fitlink.coaching.CoachingStatus;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class CheckInServiceTest {

    @Mock private CoachingRepository coachingRepo;

    @InjectMocks private CheckInService service;

    private static final String TRAINER_ID = "trainer-uid";
    private static final String TRAINEE_ID = "trainee-uid";
    private static final String COACHING_ID = "coaching-1";

    // ---------- submitCheckIn ----------

    @Test
    @DisplayName("submitCheckIn creates a new check-in for today when none exists")
    void submitCheckIn_createsNew() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInDTO dto = dto(75.0, 7);
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getWeightKg()).isEqualTo(75.0);
        assertThat(result.getOverallEnergyLevel()).isEqualTo(7);
        assertThat(result.getTraineeId()).isEqualTo(TRAINEE_ID);
        assertThat(active.getCheckIns()).hasSize(1);
    }

    @Test
    @DisplayName("submitCheckIn updates the existing check-in for the same UTC day (upsert)")
    void submitCheckIn_upsertsSameDay() {
        Coaching active = activeCoaching();
        Instant todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        CheckIn existing = CheckIn.builder()
            .id("ci-existing")
            .traineeId(TRAINEE_ID)
            .start(todayStart)
            .weightKg(70.0)
            .overallEnergyLevel(5)
            .build();
        active.getCheckIns().add(existing);
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInDTO dto = dto(72.5, 8);
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(active.getCheckIns()).hasSize(1);
        assertThat(result.getId()).isEqualTo("ci-existing");
        assertThat(result.getWeightKg()).isEqualTo(72.5);
        assertThat(result.getOverallEnergyLevel()).isEqualTo(8);
    }

    @Test
    @DisplayName("submitCheckIn throws when no active coaching exists")
    void submitCheckIn_noCoaching_throws() {
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitCheckIn(TRAINEE_ID, dto(70.0, 5)))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("submitCheckIn stores photoUrls list when present in DTO")
    void submitCheckIn_storesPhotoUrls() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInDTO dto = dto(70.0, 6);
        dto.setPhotoUrls(List.of("/a.jpg", "/b.jpg"));
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getPhotoUrls()).containsExactly("/a.jpg", "/b.jpg");
        assertThat(result.getPhotoUrl()).isEqualTo("/a.jpg");
    }

    @Test
    @DisplayName("submitCheckIn limits stored photoUrls to MAX_CHECKIN_PHOTOS=5")
    void submitCheckIn_limitsPhotoUrls() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInDTO dto = dto(70.0, 6);
        dto.setPhotoUrls(List.of("/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg"));
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getPhotoUrls()).hasSize(5);
    }

    // ---------- deleteCheckIn ----------

    @Test
    @DisplayName("deleteCheckIn marks deletedByUser=true for the owner")
    void deleteCheckIn_ok() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder()
            .id("ci-1")
            .traineeId(TRAINEE_ID)
            .deletedByUser(false)
            .build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findByTraineeId(TRAINEE_ID)).thenReturn(List.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckIn result = service.deleteCheckIn("ci-1", TRAINEE_ID);

        assertThat(result.isDeletedByUser()).isTrue();
    }

    @Test
    @DisplayName("deleteCheckIn throws when the check-in does not belong to the requester")
    void deleteCheckIn_notFound_throws() {
        when(coachingRepo.findByTraineeId("stranger")).thenReturn(List.of());

        assertThatThrownBy(() -> service.deleteCheckIn("ci-1", "stranger"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- getCurrentWeekCheckInForCurrentUser ----------

    @Test
    @DisplayName("getCurrentWeekCheckInForCurrentUser returns today's check-in if present")
    void getCurrent_present_returns() {
        Coaching active = activeCoaching();
        Instant todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        CheckIn ci = CheckIn.builder()
            .id("ci-today")
            .traineeId(TRAINEE_ID)
            .start(todayStart)
            .deletedByUser(false)
            .build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckIn result = service.getCurrentWeekCheckInForCurrentUser(TRAINEE_ID);

        assertThat(result.getId()).isEqualTo("ci-today");
    }

    @Test
    @DisplayName("getCurrentWeekCheckInForCurrentUser throws when no today's check-in exists")
    void getCurrent_missing_throws() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.getCurrentWeekCheckInForCurrentUser(TRAINEE_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- addTrainerComment ----------

    @Test
    @DisplayName("addTrainerComment stores the comment when called by the assigned trainer")
    void addTrainerComment_ok() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder().id("ci-1").traineeId(TRAINEE_ID).build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));
        when(coachingRepo.save(any(Coaching.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckIn result = service.addTrainerComment(TRAINER_ID, COACHING_ID, "ci-1", "Good progress");

        assertThat(result.getTrainerComment()).isNotNull();
        assertThat(result.getTrainerComment().getText()).isEqualTo("Good progress");
        assertThat(result.getTrainerComment().getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("addTrainerComment by wrong trainer throws AccessDenied")
    void addTrainerComment_wrongTrainer_throws() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder().id("ci-1").traineeId(TRAINEE_ID).build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));

        assertThatThrownBy(() ->
            service.addTrainerComment("other-trainer", COACHING_ID, "ci-1", "Bad"))
            .isInstanceOf(AccessDeniedException.class);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("addTrainerComment throws when the check-in does not exist")
    void addTrainerComment_missingCheckIn_throws() {
        Coaching active = activeCoaching();
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));

        assertThatThrownBy(() ->
            service.addTrainerComment(TRAINER_ID, COACHING_ID, "missing", "Hey"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- helpers ----------

    private Coaching activeCoaching() {
        Coaching c = Coaching.builder()
            .id(COACHING_ID)
            .traineeId(TRAINEE_ID)
            .trainerId(TRAINER_ID)
            .status(CoachingStatus.ACTIVE)
            .build();
        c.setCheckIns(new ArrayList<>());
        return c;
    }

    private CheckInDTO dto(double weight, int energy) {
        CheckInDTO d = new CheckInDTO();
        d.setWeightKg(weight);
        d.setOverallEnergyLevel(energy);
        return d;
    }
}
