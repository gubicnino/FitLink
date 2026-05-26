package si.feri.fitlink.chat.repo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import si.feri.fitlink.chat.domain.Message;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByConversationIdOrderBySentAtDesc(String conversationId, Pageable pageable);

    List<Message> findByConversationIdAndSentAtBeforeOrderBySentAtDesc(
        String conversationId, Instant before, Pageable pageable);

    Optional<Message> findByConversationIdAndSenderIdAndClientMessageId(
        String conversationId, String senderId, String clientMessageId);

    @Query("{'conversationId': ?0, 'sentAt': {'$gt': ?1}}")
    List<Message> findSince(String conversationId, Instant since);
}
