package si.feri.fitlink.chat.domain;

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


@Document(collection = "conversationParticipants")
@CompoundIndexes({
    @CompoundIndex(name = "user_conv", def = "{'userId': 1, 'conversationId': 1}", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationParticipant {
    @Id
    private String id;

    @Indexed
    private String conversationId;
    private String userId;

    private Instant joinedAt;

    private String lastReadMessageId;
    private Instant lastReadAt;

    private boolean muted;


    private String role;
}
