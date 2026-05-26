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


@Document(collection = "conversations")
@CompoundIndexes({
    @CompoundIndex(name = "participants_updatedAt", def = "{'participantIds': 1, 'updatedAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {
    @Id
    private String id;
    private ConversationType type;
    private String coachingId;

    private List<String> participantIds;

    private Instant createdAt;
    private Instant updatedAt;

    private LastMessagePreview lastMessage;

    private boolean archived;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LastMessagePreview {
        private String id;
        private String text;
        private String senderId;
        private Instant sentAt;
        private boolean hasAttachments;
    }
}
