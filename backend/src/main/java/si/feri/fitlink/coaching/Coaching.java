package si.feri.fitlink.coaching;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "coachings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coaching {
    @Id
    private String id;
    private String traineeId;
    private String trainerId;
    private CoachingStatus status;
    private String requestMessage;
    private Instant startedAt;
    private Instant endedAt;
    private String endedBy;
    @Builder.Default
    private List<si.feri.fitlink.checkin.CheckIn> checkIns = new ArrayList<>();
}
