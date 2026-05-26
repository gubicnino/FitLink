package si.feri.fitlink.chat.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import si.feri.fitlink.chat.domain.Conversation;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    List<Conversation> findByParticipantIdsContainingOrderByUpdatedAtDesc(String userId);

    Optional<Conversation> findFirstByCoachingId(String coachingId);
}
