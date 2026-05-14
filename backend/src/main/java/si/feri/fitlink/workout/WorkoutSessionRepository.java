package si.feri.fitlink.workout;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface WorkoutSessionRepository extends MongoRepository<WorkoutSession, String> {
    List<WorkoutSession> findByOwnerIdOrderByStartedAtDesc(String ownerId);
    List<WorkoutSession> findByOwnerIdAndStartedAtBetween(String ownerId, Instant from, Instant to);
}
