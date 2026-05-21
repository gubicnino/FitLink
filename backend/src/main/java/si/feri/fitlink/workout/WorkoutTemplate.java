package si.feri.fitlink.workout;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "workoutTemplates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutTemplate {
    @Id
    private String id;
    private String ownerId;
    private String createdBy;
    private String name;
    private List<TemplateExercise> exercises;
    private String lastEditedBy;
    private Instant lastEditedAt;
    private Instant createdAt;

    @Data
    public static class TemplateExercise {
        private String exerciseId;
        private int order;
        private List<SetTarget> sets;
        private String notes;
    }

    @Data
    public static class SetTarget {
        private int targetReps;
        private double targetWeightKg;
        private Integer restSeconds;
        private String setType;
    }
}