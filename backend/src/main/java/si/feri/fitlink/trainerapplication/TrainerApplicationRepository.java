package si.feri.fitlink.trainerapplication;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainerApplicationRepository extends MongoRepository<TrainerApplication, String> {
    Optional<TrainerApplication> findByUserId(String userId);

    List<TrainerApplication> findByStatus(TrainerApplication.ApplicationStatus status);
}