package si.feri.fitlink.chat.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import si.feri.fitlink.chat.domain.MessageReceipt;

public interface MessageReceiptRepository extends MongoRepository<MessageReceipt, String> {

    Optional<MessageReceipt> findByMessageIdAndUserId(String messageId, String userId);

    List<MessageReceipt> findByMessageId(String messageId);

    List<MessageReceipt> findByMessageIdIn(List<String> messageIds);

    @Query(value = "{'userId': ?0, 'conversationId': ?1, 'readAt': null}", count = true)
    long countUnreadInConversation(String userId, String conversationId);
}
