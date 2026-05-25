package si.feri.fitlink.auth;

import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;
import si.feri.fitlink.user.dto.RegisterDTO;

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

        

        User user = User.builder()
                .firebaseUid(firebaseToken.getUid())
                .email(firebaseToken.getEmail())
                .displayName(dto.getDisplayName())
                .role(dto.getRole())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @GetMapping("/me")
    public ResponseEntity<User> getMe(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }
}