package si.feri.fitlink.coaching;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoachingRepository extends MongoRepository<Coaching, String> {
    List<Coaching> findByTraineeId(String traineeId);
    List<Coaching> findByTrainerId(String trainerId);
    Optional<Coaching> findByTraineeIdAndStatus(String traineeId, String status);
    List<Coaching> findByTrainerIdAndStatus(String trainerId, String status);
}
