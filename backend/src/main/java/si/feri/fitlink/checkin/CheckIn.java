package si.feri.fitlink.checkin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "checkIns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckIn {
    @Id
    private String id;
    private String traineeId;
    private Instant weekStart;
    private double weightKg;
    private String photoUrl;
    private String note;
    private TrainerComment trainerComment;
    private Instant createdAt;
    private boolean deletedByUser;

    @Data
    public static class TrainerComment {
        private String text;
        private String authorId;
        private Instant createdAt;
    }
}