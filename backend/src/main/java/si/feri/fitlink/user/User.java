package si.feri.fitlink.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    private String id;
    private String firebaseUid;
    private String email;
    private String displayName;

    private Role role; // TRAINEE, TRAINER, ADMIN

    private UserProfile profile;
    private TrainerInfo trainer;
    private String fcmToken;

    private Instant createdAt;
    private Instant updatedAt;

    @Data
    public static class UserProfile {
        private LocalDate birthDate;
        private String gender;
        private Double heightCm;
        private Double currentWeightKg;
    }

    @Data
    public static class TrainerInfo {
        private String verificationStatus;
        private String licenseFileUrl;
        private String bio;
        private List<String> specializations;
        private Instant verifiedAt;
        private String rejectionReason;
    }
}