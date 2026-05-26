package si.feri.fitlink.chat.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "messages")
@CompoundIndexes({
    @CompoundIndex(name = "conv_sentAt", def = "{'conversationId': 1, 'sentAt': -1}"),
    @CompoundIndex(
        name = "dedup",
        def = "{'conversationId': 1, 'senderId': 1, 'clientMessageId': 1}",
        unique = true
    )
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    private String id;

    private String conversationId;
    private String senderId;

    private String clientMessageId;


    private MessageType type;

    private String text;

    private List<Attachment> attachments;

    private Instant sentAt;
    private Instant editedAt;
    private Instant deletedAt;

    private String systemEvent;
}
