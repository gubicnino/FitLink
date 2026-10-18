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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartFile;

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
    @DisplayName("submitCheckIn creates a new check-in for today when none exists and persists it")
    void submitCheckIn_createsNew() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto(75.0, 7));

        assertThat(result.getId()).isNotBlank();
        assertThat(result.getTraineeId()).isEqualTo(TRAINEE_ID);
        assertThat(result.getStart()).isEqualTo(todayStartUtc());
        assertThat(result.getWeightKg()).isEqualTo(75.0);
        assertThat(result.getOverallEnergyLevel()).isEqualTo(7);
        assertThat(result.isDeletedByUser()).isFalse();
        assertThat(active.getCheckIns()).containsExactly(result);
        verify(coachingRepo).save(active);
    }

    @Test
    @DisplayName("submitCheckIn updates the existing check-in for the same UTC day (upsert)")
    void submitCheckIn_upsertsSameDay() {
        Coaching active = activeCoaching();
        CheckIn existing = CheckIn.builder()
            .id("ci-existing")
            .traineeId(TRAINEE_ID)
            .start(todayStartUtc())
            .weightKg(70.0)
            .overallEnergyLevel(5)
            .build();
        active.getCheckIns().add(existing);
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto(72.5, 8));

        assertThat(active.getCheckIns()).hasSize(1);
        assertThat(result.getId()).isEqualTo("ci-existing");
        assertThat(result.getWeightKg()).isEqualTo(72.5);
        assertThat(result.getOverallEnergyLevel()).isEqualTo(8);
        verify(coachingRepo).save(active);
    }

    @Test
    @DisplayName("submitCheckIn does not overwrite a check-in from a previous day")
    void submitCheckIn_previousDayIsKept() {
        Coaching active = activeCoaching();
        CheckIn yesterday = CheckIn.builder()
            .id("ci-yesterday")
            .traineeId(TRAINEE_ID)
            .start(todayStartUtc().minus(1, ChronoUnit.DAYS))
            .weightKg(70.0)
            .build();
        active.getCheckIns().add(yesterday);
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto(71.0, 6));

        assertThat(result.getId()).isNotEqualTo("ci-yesterday");
        assertThat(active.getCheckIns()).hasSize(2);
        assertThat(yesterday.getWeightKg()).isEqualTo(70.0);
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
    @DisplayName("submitCheckIn stores photoUrls list and uses the first one as the cover photo")
    void submitCheckIn_storesPhotoUrls() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckInDTO dto = dto(70.0, 6);
        dto.setPhotoUrls(List.of("/a.jpg", "/b.jpg"));
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getPhotoUrls()).containsExactly("/a.jpg", "/b.jpg");
        assertThat(result.getPhotoUrl()).isEqualTo("/a.jpg");
    }

    @Test
    @DisplayName("submitCheckIn keeps only the first 5 photoUrls, in order")
    void submitCheckIn_limitsPhotoUrls() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckInDTO dto = dto(70.0, 6);
        dto.setPhotoUrls(List.of("/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg"));
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getPhotoUrls()).containsExactly("/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg");
        assertThat(result.getPhotoUrl()).isEqualTo("/1.jpg");
    }

    @Test
    @DisplayName("submitCheckIn with only the legacy single photoUrl also fills photoUrls")
    void submitCheckIn_singlePhotoUrl_fillsList() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        CheckInDTO dto = dto(70.0, 6);
        dto.setPhotoUrl("/single.jpg");
        CheckIn result = service.submitCheckIn(TRAINEE_ID, dto);

        assertThat(result.getPhotoUrl()).isEqualTo("/single.jpg");
        assertThat(result.getPhotoUrls()).containsExactly("/single.jpg");
    }

    @Test
    @DisplayName("submitCheckIn rejects more than 5 uploaded photos and saves nothing")
    void submitCheckIn_tooManyUploadedPhotos_throws() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        List<MultipartFile> photos = IntStream.range(0, 6)
            .mapToObj(i -> (MultipartFile) new MockMultipartFile("photos", "p" + i + ".png", "image/png", new byte[] {1}))
            .toList();

        assertThatThrownBy(() -> service.submitCheckIn(TRAINEE_ID, dto(70.0, 6), photos))
            .isInstanceOf(IllegalArgumentException.class);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("submitCheckIn rejects an uploaded file that is not an image")
    void submitCheckIn_nonImageUpload_throws() {
        Coaching active = activeCoaching();
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));
        MultipartFile pdf = new MockMultipartFile("photo", "doc.pdf", "application/pdf", new byte[] {1});

        assertThatThrownBy(() -> service.submitCheckIn(TRAINEE_ID, dto(70.0, 6), pdf))
            .isInstanceOf(IllegalArgumentException.class);
        verify(coachingRepo, never()).save(any());
    }

    // ---------- getMyCheckIns ----------

    @Test
    @DisplayName("getMyCheckIns merges all coachings, hides deleted ones and sorts newest first (null start last)")
    void getMyCheckIns_filtersAndSorts() {
        Instant today = todayStartUtc();
        CheckIn old = CheckIn.builder().id("old").start(today.minus(10, ChronoUnit.DAYS)).build();
        CheckIn recent = CheckIn.builder().id("recent").start(today).build();
        CheckIn deleted = CheckIn.builder().id("deleted").start(today.minus(1, ChronoUnit.DAYS)).deletedByUser(true).build();
        CheckIn noStart = CheckIn.builder().id("no-start").build();
        Coaching endedCoaching = activeCoaching();
        endedCoaching.setStatus(CoachingStatus.ENDED);
        endedCoaching.getCheckIns().addAll(List.of(old, noStart));
        Coaching current = activeCoaching();
        current.getCheckIns().addAll(List.of(deleted, recent));
        when(coachingRepo.findByTraineeId(TRAINEE_ID)).thenReturn(List.of(endedCoaching, current));

        List<CheckIn> result = service.getMyCheckIns(TRAINEE_ID);

        assertThat(result).extracting(CheckIn::getId).containsExactly("recent", "old", "no-start");
    }

    // ---------- deleteCheckIn ----------

    @Test
    @DisplayName("deleteCheckIn soft-deletes (deletedByUser=true) the owner's check-in and persists it")
    void deleteCheckIn_ok() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder()
            .id("ci-1")
            .traineeId(TRAINEE_ID)
            .deletedByUser(false)
            .build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findByTraineeId(TRAINEE_ID)).thenReturn(List.of(active));

        CheckIn result = service.deleteCheckIn("ci-1", TRAINEE_ID);

        assertThat(result.isDeletedByUser()).isTrue();
        assertThat(active.getCheckIns()).containsExactly(ci);
        verify(coachingRepo).save(active);
    }

    @Test
    @DisplayName("deleteCheckIn throws when the check-in does not belong to the requester")
    void deleteCheckIn_notFound_throws() {
        when(coachingRepo.findByTraineeId("stranger")).thenReturn(List.of());

        assertThatThrownBy(() -> service.deleteCheckIn("ci-1", "stranger"))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(coachingRepo, never()).save(any());
    }

    // ---------- getCurrentWeekCheckInForCurrentUser ----------

    @Test
    @DisplayName("getCurrentWeekCheckInForCurrentUser returns today's check-in if present")
    void getCurrent_present_returns() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder()
            .id("ci-today")
            .traineeId(TRAINEE_ID)
            .start(todayStartUtc())
            .build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        assertThat(service.getCurrentWeekCheckInForCurrentUser(TRAINEE_ID)).isSameAs(ci);
    }

    @Test
    @DisplayName("getCurrentWeekCheckInForCurrentUser ignores today's check-in that the user deleted")
    void getCurrent_deleted_throws() {
        Coaching active = activeCoaching();
        active.getCheckIns().add(CheckIn.builder()
            .id("ci-today")
            .traineeId(TRAINEE_ID)
            .start(todayStartUtc())
            .deletedByUser(true)
            .build());
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.getCurrentWeekCheckInForCurrentUser(TRAINEE_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getCurrentWeekCheckInForCurrentUser throws when no check-in exists")
    void getCurrent_missing_throws() {
        when(coachingRepo.findByTraineeIdAndStatus(TRAINEE_ID, CoachingStatus.ACTIVE))
            .thenReturn(Optional.of(activeCoaching()));

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

        CheckIn result = service.addTrainerComment(TRAINER_ID, COACHING_ID, "ci-1", "Good progress");

        assertThat(result.getTrainerComment()).isNotNull();
        assertThat(result.getTrainerComment().getText()).isEqualTo("Good progress");
        assertThat(result.getTrainerComment().getCreatedAt()).isNotNull();
        verify(coachingRepo).save(active);
    }

    @Test
    @DisplayName("addTrainerComment by wrong trainer throws AccessDenied and leaves the check-in untouched")
    void addTrainerComment_wrongTrainer_throws() {
        Coaching active = activeCoaching();
        CheckIn ci = CheckIn.builder().id("ci-1").traineeId(TRAINEE_ID).build();
        active.getCheckIns().add(ci);
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(active));

        assertThatThrownBy(() ->
            service.addTrainerComment("other-trainer", COACHING_ID, "ci-1", "Bad"))
            .isInstanceOf(AccessDeniedException.class);
        assertThat(ci.getTrainerComment()).isNull();
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("addTrainerComment throws when the check-in does not exist")
    void addTrainerComment_missingCheckIn_throws() {
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.of(activeCoaching()));

        assertThatThrownBy(() ->
            service.addTrainerComment(TRAINER_ID, COACHING_ID, "missing", "Hey"))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(coachingRepo, never()).save(any());
    }

    @Test
    @DisplayName("addTrainerComment throws when the coaching does not exist")
    void addTrainerComment_missingCoaching_throws() {
        when(coachingRepo.findById(COACHING_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            service.addTrainerComment(TRAINER_ID, COACHING_ID, "ci-1", "Hey"))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(coachingRepo, never()).save(any());
    }

    // ---------- helpers ----------

    private static Instant todayStartUtc() {
        return LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

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
