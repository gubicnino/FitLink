package si.feri.fitlink.chat.domain;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Document(collection = "messageReceipts")
@CompoundIndexes({
    @CompoundIndex(name = "msg_user", def = "{'messageId': 1, 'userId': 1}", unique = true),
    @CompoundIndex(name = "user_readAt", def = "{'userId': 1, 'readAt': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageReceipt {
    @Id
    private String id;

    private String messageId;
    private String conversationId;
    private String userId;

    private Instant deliveredAt;
    private Instant readAt;
}
