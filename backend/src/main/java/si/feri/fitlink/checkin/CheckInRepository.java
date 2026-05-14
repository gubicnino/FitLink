package si.feri.fitlink.checkin;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface CheckInRepository extends MongoRepository<CheckIn, String> {
    Optional<CheckIn> findByTraineeIdAndWeekStart(String traineeId, Instant weekStart);
    List<CheckIn> findByTraineeIdAndDeletedByUserFalseOrderByWeekStartDesc(String traineeId);
}
