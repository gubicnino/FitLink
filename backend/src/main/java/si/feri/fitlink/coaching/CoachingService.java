package si.feri.fitlink.coaching;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CoachingService {

    private final CoachingRepository coachingRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public Coaching requestCoaching(String traineeId, CoachingRequestDTO dto) {
        coachingRepo.findByTraineeIdAndStatus(traineeId, "ACTIVE")
                .ifPresent(c -> { throw new IllegalStateException("Already has active coaching"); });

        Coaching coaching = Coaching.builder()
                .traineeId(traineeId)
                .trainerId(dto.getTrainerId())
                .status("PENDING")
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

        coaching.setStatus("ACTIVE");
        coaching.setStartedAt(Instant.now());
        Coaching saved = coachingRepo.save(coaching);
        notificationService.notifyCoachingAccepted(saved);
        return saved;
    }

    public Coaching rejectCoaching(String coachingId, String trainerId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));

        if (!coaching.getTrainerId().equals(trainerId))
            throw new AccessDeniedException("Not your request");

        coaching.setStatus("REJECTED");
        return coachingRepo.save(coaching);
    }

    public Coaching endCoaching(String coachingId, String requesterId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));

        coaching.setStatus("ENDED");
        coaching.setEndedAt(Instant.now());
        coaching.setEndedBy(requesterId);
        return coachingRepo.save(coaching);
    }

    public List<Coaching> getForTrainee(String traineeId) {
        return coachingRepo.findByTraineeId(traineeId);
    }

    public List<Coaching> getForTrainer(String trainerId) {
        return coachingRepo.findByTrainerId(trainerId);
    }

    public List<Coaching> getPendingForTrainer(String trainerId) {
        return coachingRepo.findByTrainerIdAndStatus(trainerId, "PENDING");
    }
}
