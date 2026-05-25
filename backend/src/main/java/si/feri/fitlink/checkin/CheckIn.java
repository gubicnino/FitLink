package si.feri.fitlink.checkin;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckIn {
    private String id;
    private String traineeId;
    private Instant start;
    private double weightKg;
    private String photoUrl;
    private List<String> photoUrls;
    private String note;
    private TrainerComment trainerComment;
    private int overallEnergyLevel;
    private Instant createdAt;
    private boolean deletedByUser;

    @Data
    public static class TrainerComment {
        private String text;
        private String authorId;
        private Instant createdAt;
    }
}