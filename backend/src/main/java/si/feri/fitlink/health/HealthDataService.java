package si.feri.fitlink.health;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.coaching.CoachingRepository;
import si.feri.fitlink.coaching.CoachingStatus;
import si.feri.fitlink.common.FcmPushService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;


@Service
@RequiredArgsConstructor
public class HealthDataService {

    private final HealthSnapshotRepository repo;
    private final CoachingRepository coachingRepo;
    private final UserRepository userRepo;
    private final FcmPushService fcm;

    public HealthSnapshotDoc upsertOwnSnapshot(String ownerUserId, HealthSnapshotDoc incoming) {
        HealthSnapshotDoc existing = repo.findByUserId(ownerUserId).orElse(null);
        if (existing != null) {
            incoming.setId(existing.getId());
        }
        incoming.setUserId(ownerUserId);
        incoming.setUploadedAt(Instant.now());
        HealthSnapshotDoc saved = repo.save(incoming);

        if (incoming.getLatestWeightKg() != null && incoming.getLatestWeightKg() > 0) {
            syncWeightToProfile(ownerUserId, incoming.getLatestWeightKg());
        }
        return saved;
    }

    private void syncWeightToProfile(String firebaseUid, double weightKg) {
        userRepo.findByFirebaseUid(firebaseUid).ifPresent(user -> {
            User.UserProfile profile = user.getProfile();
            if (profile == null) {
                profile = new User.UserProfile();
                user.setProfile(profile);
            }
            profile.setCurrentWeightKg(weightKg);
            user.setUpdatedAt(Instant.now());
            userRepo.save(user);
        });
    }

    public HealthSnapshotDoc getMine(String ownerUserId) {
        return repo.findByUserId(ownerUserId)
            .orElseThrow(() -> new ResourceNotFoundException("No snapshot yet"));
    }

    public HealthSnapshotDoc getForClient(String trainerId, String traineeId) {
        requireActiveCoaching(trainerId, traineeId);
        return repo.findByUserId(traineeId)
            .orElseThrow(() -> new ResourceNotFoundException("Trainee has not shared any health data yet"));
    }

    public void requestSyncFromTrainee(String trainerId, String traineeId) {
        requireActiveCoaching(trainerId, traineeId);
        fcm.sendToUser(
            traineeId,
            "FitLink",
            "",
            Map.of(
                "type", "health_sync_request",
                "route", "background"
            )
        );
    }

    private void requireActiveCoaching(String trainerId, String traineeId) {
        List<Coaching> coachings = coachingRepo.findByTrainerId(trainerId);
        boolean ok = coachings.stream()
            .anyMatch(c -> traineeId.equals(c.getTraineeId()) && c.getStatus() == CoachingStatus.ACTIVE);
        if (!ok) {
            throw new AccessDeniedException("No active coaching with this trainee");
        }
    }
}
