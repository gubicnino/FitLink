package si.feri.fitlink.health;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;

/**
 *   PUT  /api/health/me/snapshot                         trainee uploads their snapshot
 *   GET  /api/health/me/snapshot                         trainee reads their own latest
 *   GET  /api/health/client/{traineeId}                  trainer reads a client's latest (gated on ACTIVE coaching)
 *   POST /api/health/client/{traineeId}/request-sync     trainer asks the trainee's device to upload fresh data
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthDataController {

    private final HealthDataService healthDataService;

    @PutMapping("/me/snapshot")
    public HealthSnapshotDoc uploadMine(
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody HealthSnapshotDoc snapshot
    ) {
        return healthDataService.upsertOwnSnapshot(principal.uid(), snapshot);
    }

    @GetMapping("/me/snapshot")
    public ResponseEntity<HealthSnapshotDoc> getMine(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(healthDataService.getMine(principal.uid()));
    }

    @GetMapping("/client/{traineeId}")
    public HealthSnapshotDoc getForClient(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String traineeId
    ) {
        return healthDataService.getForClient(principal.uid(), traineeId);
    }

    @PostMapping("/client/{traineeId}/request-sync")
    public ResponseEntity<Void> requestSync(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String traineeId
    ) {
        healthDataService.requestSyncFromTrainee(principal.uid(), traineeId);
        return ResponseEntity.accepted().build();
    }
}
