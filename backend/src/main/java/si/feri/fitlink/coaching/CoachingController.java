package si.feri.fitlink.coaching;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.coaching.dto.CoachingActionDTO;
import si.feri.fitlink.coaching.dto.CoachingRequestDTO;
import si.feri.fitlink.coaching.dto.TrainerCalendarDTO;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/coaching")
public class CoachingController {
    private final CoachingService coachingService;

    @GetMapping("/me")
    public ResponseEntity<List<Coaching>> getMyCoachings(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(coachingService.getForCurrentTrainee(principal.uid()));
    }

    @PostMapping("/request")
    public ResponseEntity<CoachingRequestDTO> requestCoaching(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CoachingRequestDTO dto) {
                coachingService.requestCoaching(principal.uid(), dto);
                return ResponseEntity.ok(dto);
            }
            
    @GetMapping("/requests")
    public ResponseEntity<List<Coaching>> getCoachingRequestsForTrainer(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(coachingService.getPendingForTrainer(principal.uid()));
    }
    @GetMapping("/active")
    public ResponseEntity<List<Coaching>> getActiveCoachingsForTrainer(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(coachingService.getActiveForTrainer(principal.uid()));
    }

    @GetMapping("/calendar")
    public ResponseEntity<List<TrainerCalendarDTO>> getTrainerCalendar(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(coachingService.buildTrainerCalendar(principal.uid()));
    }
    @PostMapping("/accept")
    public ResponseEntity<Coaching> acceptCoaching(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CoachingActionDTO dto) {
                Coaching accepted = coachingService.acceptCoaching(dto.getCoachingId(), principal.uid());
                System.out.println("Accepted coaching: " + accepted);
                return ResponseEntity.ok(accepted);
            }
    @PostMapping("/reject")
    public ResponseEntity<Coaching> rejectCoaching(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CoachingActionDTO dto) {
                Coaching rejected = coachingService.rejectCoaching(dto.getCoachingId(), principal.uid());
                return ResponseEntity.ok(rejected);
            }

    @PostMapping("/end")
    public ResponseEntity<Coaching> endCoaching(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CoachingActionDTO dto) {
        Coaching ended = coachingService.endCoaching(dto.getCoachingId(), principal.uid());
        return ResponseEntity.ok(ended);
    }
}
