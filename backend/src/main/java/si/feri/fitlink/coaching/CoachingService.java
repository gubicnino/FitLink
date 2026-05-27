package si.feri.fitlink.coaching;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.chat.service.ConversationLifecycleService;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class CoachingService {

    private final CoachingRepository coachingRepo;
    private final NotificationService notificationService;
    private final ConversationLifecycleService conversationLifecycle;

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
}
