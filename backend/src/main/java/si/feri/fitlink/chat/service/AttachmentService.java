package si.feri.fitlink.chat.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.chat.domain.Attachment;
import si.feri.fitlink.chat.domain.AttachmentKind;
import si.feri.fitlink.chat.domain.PendingAttachment;
import si.feri.fitlink.chat.repo.PendingAttachmentRepository;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

/**
 * local filesystem.
 * V PRIHODNJE BOMO TO ZAMENJALI Z S3 PROBABLY, trenutno je se local
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttachmentService {

    private static final long MAX_SIZE_BYTES = 25L * 1024 * 1024;
    private static final Set<String> ALLOWED_MIME = Set.of(
        "image/jpeg", "image/png", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
    );

    private final PendingAttachmentRepository repo;

    @Value("${fitlink.chat.attachments.root:./uploads/chat}")
    private String storageRoot;

    @PostConstruct
    void ensureDir() throws IOException {
        Path root = Paths.get(storageRoot);
        if (!Files.exists(root)) {
            Files.createDirectories(root);
            log.info("Created chat attachment storage at {}", root.toAbsolutePath());
        }
    }

    public PendingAttachment upload(MultipartFile file, String uploaderUserId) throws IOException {
        validate(file);

        String id = UUID.randomUUID().toString();
        String safeName = sanitizeFilename(file.getOriginalFilename());
        String storageKey = id + extensionOf(file.getContentType(), safeName);
        Path target = Paths.get(storageRoot).resolve(storageKey);

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        }

        return repo.save(PendingAttachment.builder()
            .id(id)
            .uploaderUserId(uploaderUserId)
            .kind(kindOf(file.getContentType()))
            .fileName(safeName)
            .mimeType(file.getContentType())
            .sizeBytes(file.getSize())
            .storageKey(storageKey)
            .thumbnailKey(null)
            .createdAt(Instant.now())
            .build());
    }


    public Attachment resolveOrThrow(String attachmentId, String callerUserId) {
        PendingAttachment pa = repo.findById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
        if (!pa.getUploaderUserId().equals(callerUserId)) {
            throw new AccessDeniedException("Not your upload");
        }
        if (pa.getAttachedAt() == null) {
            pa.setAttachedAt(Instant.now());
            repo.save(pa);
        }
        return Attachment.builder()
            .id(pa.getId())
            .kind(pa.getKind())
            .fileName(pa.getFileName())
            .mimeType(pa.getMimeType())
            .sizeBytes(pa.getSizeBytes())
            .storageKey(pa.getStorageKey())
            .thumbnailKey(pa.getThumbnailKey())
            .build();
    }

    public PendingAttachment loadMetadata(String attachmentId) {
        return repo.findById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    }

    public Path resolveStoragePath(PendingAttachment a) {
        return Paths.get(storageRoot).resolve(a.getStorageKey());
    }


    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File too large (max 25 MB)");
        }
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_MIME.contains(mime)) {
            throw new IllegalArgumentException("Unsupported file type: " + mime);
        }
    }

    private static AttachmentKind kindOf(String mime) {
        if (mime == null) return AttachmentKind.OTHER;
        if (mime.startsWith("image/")) return AttachmentKind.IMAGE;
        if (mime.equals("application/pdf")) return AttachmentKind.PDF;
        if (mime.contains("word") || mime.contains("excel") || mime.contains("officedocument") || mime.equals("text/plain"))
            return AttachmentKind.DOC;
        return AttachmentKind.OTHER;
    }

    private static String sanitizeFilename(String raw) {
        if (raw == null || raw.isBlank()) return "file";
        String trimmed = raw.replace('\\', '/').replaceAll(".*/", "");
        trimmed = trimmed.replaceAll("[\\x00-\\x1F]", "");
        if (trimmed.length() > 80) trimmed = trimmed.substring(0, 80);
        return trimmed.isBlank() ? "file" : trimmed;
    }

    private static String extensionOf(String mime, String filename) {
        int dot = filename == null ? -1 : filename.lastIndexOf('.');
        if (dot >= 0 && dot < filename.length() - 1) return filename.substring(dot);
        if (mime == null) return "";
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            case "text/plain" -> ".txt";
            default -> "";
        };
    }
}
