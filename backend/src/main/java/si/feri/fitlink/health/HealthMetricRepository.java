package si.feri.fitlink.health;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HealthMetricRepository extends MongoRepository<HealthMetric, String> {
    List<HealthMetric> findByUserIdAndDateBetween(String userId, LocalDate from, LocalDate to);
    Optional<HealthMetric> findByUserIdAndDate(String userId, LocalDate date);
}
