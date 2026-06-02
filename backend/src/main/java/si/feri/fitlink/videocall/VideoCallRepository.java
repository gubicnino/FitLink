package si.feri.fitlink.videocall;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VideoCallRepository extends MongoRepository<VideoCallRequest, String> {

    Optional<VideoCallRequest> findByIdAndConversationId(String id, String conversationId);

    List<VideoCallRequest> findByConversationIdOrderByScheduledForDesc(String conversationId);

    List<VideoCallRequest> findByStatusInAndScheduledForBefore(Collection<VideoCallStatus> statuses, Instant before);

    List<VideoCallRequest> findByTraineeIdAndStatusInOrderByScheduledForAsc(
        String traineeId, Collection<VideoCallStatus> statuses);

    List<VideoCallRequest> findByTrainerIdAndStatusInOrderByScheduledForAsc(
        String trainerId, Collection<VideoCallStatus> statuses);

    List<VideoCallRequest> findByTraineeIdAndScheduledForBetweenOrderByScheduledForAsc(
        String traineeId, Instant from, Instant to);

    List<VideoCallRequest> findByTrainerIdAndScheduledForBetweenOrderByScheduledForAsc(
        String trainerId, Instant from, Instant to);
}
