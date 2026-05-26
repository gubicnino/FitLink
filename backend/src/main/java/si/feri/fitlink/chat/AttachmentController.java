package si.feri.fitlink.chat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.chat.domain.PendingAttachment;
import si.feri.fitlink.chat.dto.ChatDtos;
import si.feri.fitlink.chat.service.AttachmentService;


@RestController
@RequestMapping("/api/chat/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping
    public ChatDtos.AttachmentDto upload(
        @AuthenticationPrincipal AuthPrincipal principal,
        @RequestParam("file") MultipartFile file
    ) throws IOException {
        PendingAttachment a = attachmentService.upload(file, principal.uid());
        return new ChatDtos.AttachmentDto(
            a.getId(),
            a.getKind() == null ? null : a.getKind().name(),
            a.getFileName(),
            a.getMimeType(),
            a.getSizeBytes(),
            "/api/chat/attachments/" + a.getId(),
            null
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<UrlResource> download(
        @PathVariable String id
    ) throws IOException {
        PendingAttachment a = attachmentService.loadMetadata(id);
        Path path = attachmentService.resolveStoragePath(a);
        UrlResource resource = new UrlResource(path.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String mime = a.getMimeType() != null ? a.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(mime))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + a.getFileName() + "\"")
            .contentLength(Files.size(path))
            .body(resource);
    }
}
