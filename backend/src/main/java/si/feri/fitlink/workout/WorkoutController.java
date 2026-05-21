package si.feri.fitlink.workout;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.workout.WorkoutDtos.SessionExerciseInput;
import si.feri.fitlink.workout.WorkoutDtos.SessionResponse;
import si.feri.fitlink.workout.WorkoutDtos.SessionUpsertRequest;
import si.feri.fitlink.workout.WorkoutDtos.SetResultInput;
import si.feri.fitlink.workout.WorkoutDtos.SetTargetInput;
import si.feri.fitlink.workout.WorkoutDtos.TemplateExerciseInput;
import si.feri.fitlink.workout.WorkoutDtos.TemplateResponse;
import si.feri.fitlink.workout.WorkoutDtos.TemplateUpsertRequest;

/**
 * Workout REST API - templates (reusable plans) and sessions (executed workouts).
 *
 * Auth: vsi endpointi zahtevajo Firebase ID token.
 *
 *  Templates
 *    GET    /api/workouts/templates     lastnikovi templati
 *    GET    /api/workouts/templates/{id}     poljuben template po ID (samo lastnik)
 *    POST   /api/workouts/templates           nov template
 *    PUT    /api/workouts/templates/{id}     posodobi (samo lastnik)
 *    DELETE /api/workouts/templates/{id}    izbriši (samo lastnik)
 *
 *  Sessions
 *    GET    /api/workouts/sessions          lastnikov history (najnovejši najprej)
 *    GET    /api/workouts/sessions/{id}     posamezna session (samo lastnik)
 *    POST   /api/workouts/sessions          začni session
 *    PATCH  /api/workouts/sessions/{id}     zaključi session z rezultati setov
 *    DELETE /api/workouts/sessions/{id}     izbriši zgodovinsko sejo (samo lastnik)
 */
@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    // DEJANSKI TEMPLATEI

    @GetMapping("/templates")
    public List<TemplateResponse> listMyTemplates(@AuthenticationPrincipal AuthPrincipal principal) {
        return workoutService.getTemplatesForUser(principal.uid()).stream()
                .map(TemplateResponse::from)
                .toList();
    }

    @GetMapping("/templates/{id}")
    public TemplateResponse getTemplate(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        WorkoutTemplate t = workoutService.getTemplate(id);
        ensureOwner(t.getOwnerId(), principal);
        return TemplateResponse.from(t);
    }

    @PostMapping("/templates")
    public ResponseEntity<TemplateResponse> createTemplate(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody TemplateUpsertRequest body
    ) {
        WorkoutTemplate t = new WorkoutTemplate();
        t.setName(body.name());
        t.setExercises(mapTemplateExercises(body.exercises()));
        WorkoutTemplate saved = workoutService.saveTemplate(principal.uid(), principal.uid(), t);
        return ResponseEntity.status(HttpStatus.CREATED).body(TemplateResponse.from(saved));
    }

    @PutMapping("/templates/{id}")
    public TemplateResponse updateTemplate(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody TemplateUpsertRequest body
    ) {
        WorkoutTemplate updated = workoutService.updateTemplate(
                id,
                principal.uid(),
                body.name(),
                mapTemplateExercises(body.exercises())
        );
        return TemplateResponse.from(updated);
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        workoutService.deleteTemplate(id, principal.uid());
        return ResponseEntity.noContent().build();
    }

    // sessions

    @GetMapping("/sessions")
    public List<SessionResponse> listMySessions(@AuthenticationPrincipal AuthPrincipal principal) {
        return workoutService.getSessionsForUser(principal.uid()).stream()
                .map(SessionResponse::from)
                .toList();
    }

    @GetMapping("/sessions/{id}")
    public SessionResponse getSession(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return SessionResponse.from(workoutService.getSession(id, principal.uid()));
    }

    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> startSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody SessionUpsertRequest body
    ) {
        WorkoutSession started = workoutService.startSession(
                principal.uid(),
                body.templateId(),
                body.name(),
                mapSessionExercises(body.exercises())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(SessionResponse.from(started));
    }

    @PatchMapping("/sessions/{id}")
    public SessionResponse finishSession(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody SessionUpsertRequest body
    ) {
        WorkoutSession finished = workoutService.finishSessionInPlace(
                id,
                principal.uid(),
                mapSessionExercises(body.exercises())
        );
        return SessionResponse.from(finished);
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable String id,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        workoutService.deleteSession(id, principal.uid());
        return ResponseEntity.noContent().build();
    }

    // helpers

    private static void ensureOwner(String ownerId, AuthPrincipal principal) {
        if (ownerId == null || !ownerId.equals(principal.uid())) {
            throw new org.springframework.security.access.AccessDeniedException("Not your resource");
        }
    }

    private static List<WorkoutTemplate.TemplateExercise> mapTemplateExercises(List<TemplateExerciseInput> inputs) {
        if (inputs == null) return List.of();
        return inputs.stream().map(i -> {
            WorkoutTemplate.TemplateExercise ex = new WorkoutTemplate.TemplateExercise();
            ex.setExerciseId(i.exerciseId());
            ex.setOrder(i.order());
            ex.setNotes(i.notes());
            ex.setSets(i.sets() == null ? List.of() : i.sets().stream().map(WorkoutController::mapSetTarget).toList());
            return ex;
        }).toList();
    }

    private static WorkoutTemplate.SetTarget mapSetTarget(SetTargetInput s) {
        WorkoutTemplate.SetTarget out = new WorkoutTemplate.SetTarget();
        out.setTargetReps(s.targetReps());
        out.setTargetWeightKg(s.targetWeightKg());
        out.setRestSeconds(s.restSeconds());
        out.setSetType(s.setType());
        return out;
    }

    private static List<WorkoutSession.SessionExercise> mapSessionExercises(List<SessionExerciseInput> inputs) {
        if (inputs == null) return List.of();
        return inputs.stream().map(i -> {
            WorkoutSession.SessionExercise ex = new WorkoutSession.SessionExercise();
            ex.setExerciseId(i.exerciseId());
            ex.setNotes(i.notes());
            ex.setSets(i.sets() == null ? List.of() : i.sets().stream().map(WorkoutController::mapSetResult).toList());
            return ex;
        }).toList();
    }

    private static WorkoutSession.SetResult mapSetResult(SetResultInput s) {
        WorkoutSession.SetResult out = new WorkoutSession.SetResult();
        out.setReps(s.reps());
        out.setWeightKg(s.weightKg());
        out.setRpe(s.rpe());
        out.setCompleted(s.completed());
        out.setSetType(s.setType());
        return out;
    }
}
