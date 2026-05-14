package si.feri.fitlink.workout;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.workout.dto.WorkoutSessionCreateDTO;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutSessionRepository sessionRepo;
    private final WorkoutTemplateRepository templateRepo;
    private final NotificationService notificationService;

    public WorkoutSession finishSession(String userId, WorkoutSessionCreateDTO dto) {
        WorkoutSession session = WorkoutSession.builder()
                .ownerId(userId)
                .templateId(dto.getTemplateId())
                .name(dto.getName())
                .startedAt(Instant.now())
                .finishedAt(Instant.now())
                .exercises(mapExercises(dto.getExercises()))
                .build();
        return sessionRepo.save(session);
    }

    public List<WorkoutSession> getSessionsForUser(String userId) {
        return sessionRepo.findByOwnerIdOrderByStartedAtDesc(userId);
    }

    public WorkoutSession getSession(String sessionId, String requesterId) {
        WorkoutSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkoutSession not found"));
        if (!session.getOwnerId().equals(requesterId))
            throw new AccessDeniedException("Not your session");
        return session;
    }

    public WorkoutTemplate saveTemplate(String ownerId, String createdBy, WorkoutTemplate template) {
        template.setOwnerId(ownerId);
        template.setCreatedBy(createdBy);
        template.setLastEditedBy(createdBy);
        template.setLastEditedAt(Instant.now());
        template.setCreatedAt(Instant.now());
        WorkoutTemplate saved = templateRepo.save(template);
        if (!ownerId.equals(createdBy)) {
            notificationService.notifyWorkoutUpdated(saved);
        }
        return saved;
    }

    public List<WorkoutTemplate> getTemplatesForUser(String ownerId) {
        return templateRepo.findByOwnerId(ownerId);
    }

    public WorkoutTemplate getTemplate(String templateId) {
        return templateRepo.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkoutTemplate not found"));
    }

    private List<WorkoutSession.SessionExercise> mapExercises(List<WorkoutSessionCreateDTO.SessionExerciseDTO> dtos) {
        if (dtos == null) return List.of();
        return dtos.stream().map(d -> {
            WorkoutSession.SessionExercise ex = new WorkoutSession.SessionExercise();
            ex.setExerciseId(d.getExerciseId());
            ex.setNotes(d.getNotes());
            ex.setSets(d.getSets() == null ? List.of() : d.getSets().stream().map(s -> {
                WorkoutSession.SetResult set = new WorkoutSession.SetResult();
                set.setReps(s.getReps());
                set.setWeightKg(s.getWeightKg());
                set.setRpe(s.getRpe());
                set.setCompleted(s.isCompleted());
                return set;
            }).toList());
            return ex;
        }).toList();
    }
}
