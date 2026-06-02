package si.feri.fitlink.videocall;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lifecycle state machine:
 *   PENDING   → trainer created a scheduled call; trainee has not responded
 *   ACCEPTED  → trainee accepted; both can join when scheduledFor approaches
 *   DECLINED  → trainee declined
 *   CANCELLED → trainer pulled it back before trainee responded
 *   LIVE      → instant call ("Start now") — skips the accept/decline flow
 *   EXPIRED   → scheduledFor passed without trainee accepting; cron transition
 *   COMPLETED → scheduledFor + 2h has elapsed on an ACCEPTED/LIVE call; cron transition
 */
@Document(collection = "videoCallRequests")
@CompoundIndexes({
    @CompoundIndex(name = "conv_status", def = "{'conversationId': 1, 'status': 1}"),
    @CompoundIndex(name = "trainee_status_time", def = "{'traineeId': 1, 'status': 1, 'scheduledFor': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoCallRequest {

    @Id
    private String id;
    @Indexed
    private String conversationId;
    private String scheduledByUserId;
    private String trainerId;
    private String traineeId;
    private String coachingId;
    private Instant scheduledFor;
    private String meetingUrl;
    private VideoCallStatus status;
    private Instant createdAt;
    private Instant decidedAt;
    private Instant completedAt;
    private String declineReason;
}
