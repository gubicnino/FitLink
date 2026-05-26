package si.feri.fitlink.chat.domain;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Document(collection = "chatAttachments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingAttachment {
    @Id
    private String id;

    @Indexed
    private String uploaderUserId;

    private AttachmentKind kind;
    private String fileName;
    private String mimeType;
    private long sizeBytes;
    private String storageKey;
    private String thumbnailKey;
    private Instant createdAt;
    private Instant attachedAt;
}
