package si.feri.fitlink.coaching;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.chat.service.ConversationLifecycleService;
import si.feri.fitlink.checkin.CheckIn;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.coaching.dto.TrainerCalendarDTO;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.health.HealthSnapshotDoc;
import si.feri.fitlink.health.HealthSnapshotRepository;
import si.feri.fitlink.user.UserRepository;

@Service
@RequiredArgsConstructor
public class CoachingService {

    private final CoachingRepository coachingRepo;
    private final NotificationService notificationService;
    private final ConversationLifecycleService conversationLifecycle;
    private final HealthSnapshotRepository healthSnapshotRepo;
    private final UserRepository userRepo;

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter DATE_KEY = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final int CALENDAR_BACK_DAYS = 7;
    private static final int CALENDAR_FORWARD_DAYS = 7;
    private static final int CHECK_IN_CADENCE_DAYS = 7;

    public Coaching requestCoaching(String traineeId, CoachingRequestDTO dto) {
        boolean alreadyRequested = !coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            traineeId,
            dto.getTrainerId(),
            Arrays.asList(CoachingStatus.PENDING, CoachingStatus.ACTIVE)
        ).isEmpty();

        if (alreadyRequested) {
            throw new IllegalStateException("Request already exists");
        }

        Coaching coaching = Coaching.builder()
                .traineeId(traineeId)
                .trainerId(dto.getTrainerId())
            .status(CoachingStatus.PENDING)
                .requestMessage(dto.getRequestMessage())
                .build();

        Coaching saved = coachingRepo.save(coaching);
        notificationService.notifyCoachingRequest(saved);
        return saved;
    }

    public Coaching acceptCoaching(String coachingId, String trainerId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));
        if (!coaching.getTrainerId().equals(trainerId))
            throw new AccessDeniedException("Not your request");

        coaching.setStatus(CoachingStatus.ACTIVE);
        coaching.setStartedAt(Instant.now());
        Coaching saved = coachingRepo.save(coaching);
        notificationService.notifyCoachingAccepted(saved);
        // Auto-create chat conversation. Idempotent. Wrapped so a chat-side
        // failure cannot block coaching acceptance.
        try {
            conversationLifecycle.onCoachingActivated(saved);
        } catch (Exception ex) {
            // logged by ConversationLifecycleService; zanalasc ignorerane tu
        }
        return saved;
    }

    public Coaching rejectCoaching(String coachingId, String trainerId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));

        if (!coaching.getTrainerId().equals(trainerId))
            throw new AccessDeniedException("Not your request");

        coaching.setStatus(CoachingStatus.REJECTED);
        return coachingRepo.save(coaching);
    }

    public Coaching endCoaching(String coachingId, String requesterId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));
        if (!coaching.getTrainerId().equals(requesterId) && !coaching.getTraineeId().equals(requesterId))
            throw new AccessDeniedException("Not your coaching");
        coaching.setStatus(CoachingStatus.ENDED);
        coaching.setEndedAt(Instant.now());
        coaching.setEndedBy(requesterId);
        return coachingRepo.save(coaching);
    }

    public List<Coaching> getForTrainee(String traineeId) {
        return coachingRepo.findByTraineeId(traineeId);
    }

    public List<Coaching> getForCurrentTrainee(String traineeId) {
        return coachingRepo.findByTraineeId(traineeId);
    }

    public List<Coaching> getAllForTrainer(String trainerId) {
        return coachingRepo.findByTrainerId(trainerId);
    }
    public List<Coaching> getActiveForTrainer(String trainerId) {
        return coachingRepo.findByTrainerIdAndStatus(trainerId, CoachingStatus.ACTIVE);
    }
    public List<Coaching> getPendingForTrainer(String trainerId) {
        return coachingRepo.findByTrainerIdAndStatus(trainerId, CoachingStatus.PENDING);
    }
    public boolean isTrainerOfTrainee(String trainerId, String traineeId) {
        return coachingRepo.findByTraineeIdAndTrainerIdAndStatusIn(
            traineeId,
            trainerId,
            Arrays.asList(CoachingStatus.ACTIVE)
        ).stream().findAny().isPresent();
    }

    public List<TrainerCalendarDTO> buildTrainerCalendar(String trainerId) {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate windowStart = today.minusDays(CALENDAR_BACK_DAYS);
        LocalDate windowEnd = today.plusDays(CALENDAR_FORWARD_DAYS);
        Instant windowStartInstant = windowStart.atStartOfDay(ZONE).toInstant();
        Instant windowEndInstant = windowEnd.plusDays(1).atStartOfDay(ZONE).toInstant();
        List<Coaching> coachings = coachingRepo.findByTrainerIdAndStatus(trainerId, CoachingStatus.ACTIVE);
        Map<String, int[]> counts = new HashMap<>();
        Map<String, Set<String>> activeClientsByDay = new HashMap<>();
        Map<String, Instant> lastCheckInByClient = new HashMap<>();
        Map<String, String> clientNames = new HashMap<>();

        for (Coaching c : coachings) {
            String traineeId = c.getTraineeId();
            if (traineeId == null) continue;
            String name = userRepo.findByFirebaseUid(traineeId)
                .map(u -> u.getDisplayName() == null ? "Client" : u.getDisplayName())
                .orElse("Client");
            clientNames.put(traineeId, name);

            if (c.getCheckIns() != null) {
                for (CheckIn ci : c.getCheckIns()) {
                    Instant when = ci.getStart() != null ? ci.getStart() : ci.getCreatedAt();
                    if (when == null) continue;
                    Instant prev = lastCheckInByClient.get(traineeId);
                    if (prev == null || when.isAfter(prev)) lastCheckInByClient.put(traineeId, when);
                    if (when.isBefore(windowStartInstant) || !when.isBefore(windowEndInstant)) continue;
                    String key = LocalDate.ofInstant(when, ZONE).format(DATE_KEY);
                    counts.computeIfAbsent(key, k -> new int[2])[0]++;
                    activeClientsByDay.computeIfAbsent(key, k -> new HashSet<>()).add(traineeId);
                }
            }

            HealthSnapshotDoc snap = healthSnapshotRepo.findByUserId(traineeId).orElse(null);
            if (snap != null && snap.getLatestWeightAt() != null) {
                Instant at = snap.getLatestWeightAt();
                if (!at.isBefore(windowStartInstant) && at.isBefore(windowEndInstant)) {
                    String key = LocalDate.ofInstant(at, ZONE).format(DATE_KEY);
                    counts.computeIfAbsent(key, k -> new int[2])[1]++;
                    activeClientsByDay.computeIfAbsent(key, k -> new HashSet<>()).add(traineeId);
                }
            }
        }

        List<TrainerCalendarDTO> out = new ArrayList<>();
        for (long d = 0; d < CALENDAR_BACK_DAYS + CALENDAR_FORWARD_DAYS + 1; d++) {
            LocalDate date = windowStart.plusDays(d);
            String key = date.format(DATE_KEY);
            int[] c = counts.getOrDefault(key, new int[2]);

            Instant cutoff = date.atStartOfDay(ZONE).toInstant()
                .minusSeconds(CHECK_IN_CADENCE_DAYS * 86400L);
            List<String> overdue = new ArrayList<>();
            for (Coaching coaching : coachings) {
                String tid = coaching.getTraineeId();
                if (tid == null) continue;
                Instant last = lastCheckInByClient.get(tid);
                if (last == null || last.isBefore(cutoff)) {
                    overdue.add(clientNames.getOrDefault(tid, "Client"));
                }
            }

            out.add(TrainerCalendarDTO.builder()
                .date(key)
                .checkInsCount(c[0])
                .weightLogsCount(c[1])
                .activeClients(activeClientsByDay.getOrDefault(key, Set.of()).size())
                .overdueClientNames(overdue)
                .build());
        }
        return out;
    }
}
