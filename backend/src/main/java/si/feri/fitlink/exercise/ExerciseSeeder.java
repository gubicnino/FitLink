package si.feri.fitlink.exercise;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExerciseSeeder implements CommandLineRunner {

    private final ExerciseRepository exerciseRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        long existingCount = exerciseRepository.count();

        if (existingCount > 0) {
            log.info("Exercise collection already populated ({} documents), skipping seed.", existingCount);
            return;
        }

        log.info("Exercise collection is empty, seeding from seed/exercises.json...");

        ClassPathResource resource = new ClassPathResource("seed/exercises.json");
        try (InputStream is = resource.getInputStream()) {
            List<Exercise> exercises = objectMapper.readValue(is, new TypeReference<List<Exercise>>() {});

            exercises.forEach(e -> e.setSystem(true));

            exerciseRepository.saveAll(exercises);
            log.info("Successfully seeded {} exercises.", exercises.size());
        } catch (Exception e) {
            log.error("Failed to seed exercises: {}", e.getMessage(), e);
            throw e;
        }
    }
}