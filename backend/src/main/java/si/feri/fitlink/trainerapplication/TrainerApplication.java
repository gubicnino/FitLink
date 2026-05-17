package si.feri.fitlink.trainerapplication;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "trainer_applications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainerApplication {
    @Id
    private String id;

    private String userId;
    private String email;
    private String displayName;

    private String bio;
    private List<String> specializations;

    private String certificateFileUrl;
    private String certificateFileName;
    private String certificateMimeType;
    private String certificateChecksum;

    private ApplicationStatus status;
    private String rejectionReason;

    private String reviewedByAdminId;
    private Instant submittedAt;
    private Instant reviewedAt;
    private Instant updatedAt;

    public enum ApplicationStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}