package si.feri.fitlink.chat.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {
    private String id;
    private AttachmentKind kind;
    private String fileName;
    private String mimeType;
    private long sizeBytes;
    private String storageKey;
    private String thumbnailKey;
}
