package si.feri.fitlink.vao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

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
    private String status; // PENDING, ACTIVE, ENDED, REJECTED
    private String requestMessage;
    private Instant startedAt;
    private Instant endedAt;
    private String endedBy;
}
