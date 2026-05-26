package si.feri.fitlink.chat.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import si.feri.fitlink.chat.domain.ConversationParticipant;

public interface ConversationParticipantRepository extends MongoRepository<ConversationParticipant, String> {

    Optional<ConversationParticipant> findByConversationIdAndUserId(String conversationId, String userId);

    List<ConversationParticipant> findByConversationId(String conversationId);

    List<ConversationParticipant> findByUserId(String userId);
}
