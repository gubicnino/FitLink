package si.feri.fitlink.health;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HealthSnapshotRepository extends MongoRepository<HealthSnapshotDoc, String> {
    Optional<HealthSnapshotDoc> findByUserId(String userId);
}
