package si.feri.fitlink.user;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;


@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping("/trainers")
    public ResponseEntity<List<User>> getAllTrainers() {
        List<User> trainers = userService.getTrainers();
        return ResponseEntity.ok(trainers);
    }
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        User user = userService.getById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/firebase/{firebaseUid}")
    public ResponseEntity<User> getUserByFirebaseUid(@PathVariable String firebaseUid) {
        User user = userService.getByFirebaseUid(firebaseUid);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/fcm-token")
    public ResponseEntity<Void> updateFcmToken(
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody FcmTokenRequest body
    ) {
        userService.setFcmToken(principal.uid(), body.token());
        return ResponseEntity.noContent().build();
    }

    /** Called on logout so we stop pushing to a stale device. */
    @DeleteMapping("/me/fcm-token")
    public ResponseEntity<Void> clearFcmToken(@AuthenticationPrincipal AuthPrincipal principal) {
        userService.clearFcmToken(principal.uid());
        return ResponseEntity.noContent().build();
    }

    public record FcmTokenRequest(@NotBlank @Size(max = 4096) String token) {}
}
