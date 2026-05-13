package si.feri.fitlink.exercise;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ExerciseRepository extends MongoRepository<Exercise, String> {

    List<Exercise> findByCategory(String category);

    List<Exercise> findByLevel(String level);

    List<Exercise> findByPrimaryMusclesContaining(String muscle);

    List<Exercise> findByNameContainingIgnoreCase(String namePart);
}