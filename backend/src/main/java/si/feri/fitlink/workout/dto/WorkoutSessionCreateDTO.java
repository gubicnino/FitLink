package si.feri.fitlink.workout.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class WorkoutSessionCreateDTO {
    private String templateId;
    @NotBlank private String name;
    private List<SessionExerciseDTO> exercises;

    @Data
    public static class SessionExerciseDTO {
        private String exerciseId;
        private List<SetResultDTO> sets;
        private String notes;
    }

    @Data
    public static class SetResultDTO {
        private int reps;
        private double weightKg;
        private Integer rpe;
        private boolean completed;
    }
}
