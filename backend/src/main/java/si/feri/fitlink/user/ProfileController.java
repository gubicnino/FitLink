package si.feri.fitlink.user;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.user.dto.ProfileDTO;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;

    @PostMapping("/update")
    public ResponseEntity<User.UserProfile> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProfileDTO dto) {
        
        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (dto != null) {
            User.UserProfile profile = new User.UserProfile();
            profile.setBirthDate(dto.getBirthDate());
            profile.setGender(dto.getGender());
            profile.setHeightCm(dto.getHeightCm());
            profile.setCurrentWeightKg(dto.getCurrentWeightKg());
            
            user.setProfile(profile);
            userRepository.save(user);
            
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.ok(null);
    }

}
