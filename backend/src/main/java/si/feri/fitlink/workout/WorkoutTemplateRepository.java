package si.feri.fitlink.workout;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkoutTemplateRepository extends MongoRepository<WorkoutTemplate, String> {
    List<WorkoutTemplate> findByOwnerId(String ownerId);
}
