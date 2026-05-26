package si.feri.fitlink.user;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
            if (dto.getDisplayName() != null && !dto.getDisplayName().trim().isEmpty()) {
                user.setDisplayName(dto.getDisplayName().trim());
            }

            User.UserProfile profile = user.getProfile();
            if (profile == null) {
                profile = new User.UserProfile();
            }

            if (dto.getBirthDate() != null) {
                profile.setBirthDate(dto.getBirthDate());
            }
            if (dto.getGender() != null) {
                profile.setGender(dto.getGender());
            }
            if (dto.getHeightCm() != null) {
                profile.setHeightCm(dto.getHeightCm());
            }
            if (dto.getCurrentWeightKg() != null) {
                profile.setCurrentWeightKg(dto.getCurrentWeightKg());
            }

            user.setProfile(profile);
            userRepository.save(user);

            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.ok(null);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Avatar image is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Avatar must be an image");
        }

        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Path uploadDir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);

        String extension = extensionFor(contentType, file.getOriginalFilename());
        String fileName = user.getId() + "-" + System.currentTimeMillis() + extension;
        Path target = uploadDir.resolve(fileName).normalize();

        if (!target.getParent().equals(uploadDir)) {
            throw new IllegalArgumentException("Invalid file name");
        }

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String avatarUrl = "/uploads/avatars/" + fileName;
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal AuthPrincipal principal) {
        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setAvatarUrl(null);
        userRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    private String extensionFor(String contentType, String originalName) {
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        if (originalName != null && originalName.contains(".")) {
            String extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase(Locale.ROOT);
            if (extension.matches("\\.(jpg|jpeg|png|webp)")) {
                return extension;
            }
        }
        return ".jpg";
    }

}
