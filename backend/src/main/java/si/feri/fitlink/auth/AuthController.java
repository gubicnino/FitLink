package si.feri.fitlink.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;
import si.feri.fitlink.user.dto.RegisterDTO;

import java.time.Instant;

// auth/AuthController.java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    // pokliče React Native po Firebase registraciji
    @PostMapping("/register")
    public ResponseEntity<User> register(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody RegisterDTO dto) throws FirebaseAuthException {

        // preveri token in dobi firebaseUid
        FirebaseToken firebaseToken = FirebaseAuth.getInstance().verifyIdToken(authHeader.substring(7));

        // ustvari userja v MongoDB
        User.UserProfile profile = null;
        if (dto.getProfile() != null) {
            profile = new User.UserProfile();
            profile.setBirthDate(dto.getProfile().getBirthDate());
            profile.setGender(dto.getProfile().getGender());
            profile.setHeightCm(dto.getProfile().getHeightCm());
            profile.setCurrentWeightKg(dto.getProfile().getCurrentWeightKg());
        }

        User user = User.builder()
                .firebaseUid(firebaseToken.getUid())
                .email(firebaseToken.getEmail())
                .displayName(dto.getDisplayName())
                .role(dto.getRole())
                .profile(profile)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(userRepository.findByFirebaseUid(principal.uid()).orElseThrow());
    }

    @GetMapping("/me")
    public ResponseEntity<User> getMe(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(userRepository.findByFirebaseUid(principal.uid()).orElseThrow());
    }
    @GetMapping("/logout")
    public ResponseEntity<String> logout(@AuthenticationPrincipal String userId) {
        userRepository.deleteById(userId);
        return ResponseEntity.ok().build();
    }
}