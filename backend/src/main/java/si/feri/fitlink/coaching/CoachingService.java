package si.feri.fitlink.coaching;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@Service
@RequiredArgsConstructor
public class CoachingService {

    private final CoachingRepository coachingRepo;
    private final NotificationService notificationService;
    private final UserRepository userRepo;

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

    public Coaching acceptCoaching(String coachingId, String firebaseTrainerId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));
        String trainerId = userRepo.findByFirebaseUid(firebaseTrainerId)
            .map(User::getId)
            .orElseThrow(() -> new ResourceNotFoundException("Trainer not found"));

        if (!coaching.getTrainerId().equals(trainerId))
            throw new AccessDeniedException("Not your request");

        coaching.setStatus(CoachingStatus.ACTIVE);
        coaching.setStartedAt(Instant.now());
        Coaching saved = coachingRepo.save(coaching);
        notificationService.notifyCoachingAccepted(saved);
        return saved;
    }

    public Coaching rejectCoaching(String coachingId, String firebaseTrainerId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));
        String trainerId = userRepo.findByFirebaseUid(firebaseTrainerId)
            .map(User::getId)
            .orElseThrow(() -> new ResourceNotFoundException("Trainer not found"));

        if (!coaching.getTrainerId().equals(trainerId))
            throw new AccessDeniedException("Not your request");

        coaching.setStatus(CoachingStatus.REJECTED);
        return coachingRepo.save(coaching);
    }

    public Coaching endCoaching(String coachingId, String firebaseRequestId) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));
        String requesterId = userRepo.findByFirebaseUid(firebaseRequestId)
            .map(User::getId)
            .orElseThrow(() -> new ResourceNotFoundException("Requester not found"));
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

    public List<Coaching> getPendingForTrainer(String trainerIdentifier) {
        Optional<User> trainerUser = userRepo.findByFirebaseUid(trainerIdentifier);
        String trainerId = trainerUser.map(User::getId).orElse(trainerIdentifier);
        return coachingRepo.findByTrainerIdAndStatus(trainerId, CoachingStatus.PENDING);
    }
}
