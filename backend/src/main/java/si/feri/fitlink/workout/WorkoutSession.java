package si.feri.fitlink.workout;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "workoutSessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutSession {
    @Id
    private String id;
    private String ownerId;
    private String templateId;
    private String name;
    private Instant startedAt;
    private Instant finishedAt;
    private int durationMinutes;
    private List<SessionExercise> exercises;
    private List<String> videoUrls;
    private TrainerComment trainerComment;

    @Data
    public static class SessionExercise {
        private String exerciseId;
        private List<SetResult> sets;
        private String notes;
    }

    @Data
    public static class SetResult {
        private int reps;
        private double weightKg;
        private Integer rpe;
        private boolean completed;
    }

    @Data
    public static class TrainerComment {
        private String text;
        private String authorId;
        private Instant createdAt;
    }
}
