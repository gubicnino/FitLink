package si.feri.fitlink.coaching;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CoachingRepository extends MongoRepository<Coaching, String> {
    List<Coaching> findByTraineeId(String traineeId);
    List<Coaching> findByTrainerId(String trainerId);
    Optional<Coaching> findByTraineeIdAndStatus(String traineeId, CoachingStatus status);
    List<Coaching> findByTrainerIdAndStatus(String trainerId, CoachingStatus status);
    List<Coaching> findByTraineeIdAndTrainerIdAndStatusIn(String traineeId, String trainerId, Collection<CoachingStatus> status);
}
