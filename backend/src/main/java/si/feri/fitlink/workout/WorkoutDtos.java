package si.feri.fitlink.workout;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;


public final class WorkoutDtos {

        private WorkoutDtos() {}


    /** Request body for POST /api/workouts/templates and PUT /api/workouts/templates/{id}. */
        public record TemplateUpsertRequest(
                @NotBlank @Size(max = 80) String name,
                @NotNull @Valid List<TemplateExerciseInput> exercises
        ) {}

        public record TemplateExerciseInput(
                @NotBlank String exerciseId,
                @PositiveOrZero int order,
                @NotNull @Valid List<SetTargetInput> sets,
                String notes
        ) {}

        public record SetTargetInput(
                @PositiveOrZero int targetReps,
                @PositiveOrZero double targetWeightKg,
                @PositiveOrZero int restSeconds
        ) {}

        /** dejanski shape keroga dobi te client nazaj */
        public record TemplateResponse(
                String id,
                String ownerId,
                String createdBy,
                String name,
                List<TemplateExerciseDto> exercises,
                String lastEditedBy,
                Instant lastEditedAt,
                Instant createdAt
        ) {
                public static TemplateResponse from(WorkoutTemplate t) {
                return new TemplateResponse(
                        t.getId(),
                        t.getOwnerId(),
                        t.getCreatedBy(),
                        t.getName(),
                        t.getExercises() == null ? List.of()
                                : t.getExercises().stream().map(TemplateExerciseDto::from).toList(),
                        t.getLastEditedBy(),
                        t.getLastEditedAt(),
                        t.getCreatedAt()
                );
                }
        }

        public record TemplateExerciseDto(
                String exerciseId,
                int order,
                List<SetTargetDto> sets,
                String notes
        ) {
                public static TemplateExerciseDto from(WorkoutTemplate.TemplateExercise e) {
                return new TemplateExerciseDto(
                        e.getExerciseId(),
                        e.getOrder(),
                        e.getSets() == null ? List.of()
                                : e.getSets().stream().map(SetTargetDto::from).toList(),
                        e.getNotes()
                );
                }
        }

        public record SetTargetDto(int targetReps, double targetWeightKg, int restSeconds) {
                public static SetTargetDto from(WorkoutTemplate.SetTarget s) {
                return new SetTargetDto(s.getTargetReps(), s.getTargetWeightKg(), s.getRestSeconds());
                }
        }

        public record SessionUpsertRequest(
                String templateId,
                @NotBlank @Size(max = 120) String name,
                @NotNull @Valid List<SessionExerciseInput> exercises
        ) {}

        public record SessionExerciseInput(
                @NotBlank String exerciseId,
                @NotNull @Valid List<SetResultInput> sets,
                String notes
        ) {}

        public record SetResultInput(
                @PositiveOrZero int reps,
                @PositiveOrZero double weightKg,
                Integer rpe,
                boolean completed
        ) {}

        public record SessionResponse(
                String id,
                String ownerId,
                String templateId,
                String name,
                Instant startedAt,
                Instant finishedAt,
                int durationMinutes,
                List<SessionExerciseDto> exercises,
                TrainerCommentDto trainerComment
        ) {
                public static SessionResponse from(WorkoutSession s) {
                return new SessionResponse(
                        s.getId(),
                        s.getOwnerId(),
                        s.getTemplateId(),
                        s.getName(),
                        s.getStartedAt(),
                        s.getFinishedAt(),
                        s.getDurationMinutes(),
                        s.getExercises() == null ? List.of()
                                : s.getExercises().stream().map(SessionExerciseDto::from).toList(),
                        Optional.ofNullable(s.getTrainerComment()).map(TrainerCommentDto::from).orElse(null)
                );
                }
        }

        public record SessionExerciseDto(
                String exerciseId,
                List<SetResultDto> sets,
                String notes
        ) {
                public static SessionExerciseDto from(WorkoutSession.SessionExercise e) {
                return new SessionExerciseDto(
                        e.getExerciseId(),
                        e.getSets() == null ? List.of()
                                : e.getSets().stream().map(SetResultDto::from).toList(),
                        e.getNotes()
                );
                }
        }

        public record SetResultDto(int reps, double weightKg, Integer rpe, boolean completed) {
                public static SetResultDto from(WorkoutSession.SetResult s) {
                return new SetResultDto(s.getReps(), s.getWeightKg(), s.getRpe(), s.isCompleted());
                }
        }

        public record TrainerCommentDto(String text, String authorId, Instant createdAt) {
                public static TrainerCommentDto from(WorkoutSession.TrainerComment c) {
                return new TrainerCommentDto(c.getText(), c.getAuthorId(), c.getCreatedAt());
                }
        }
        }
