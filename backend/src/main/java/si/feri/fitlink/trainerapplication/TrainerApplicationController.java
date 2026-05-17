package si.feri.fitlink.trainerapplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.trainerapplication.dto.TrainerApplicationRejectionDTO;
import si.feri.fitlink.trainerapplication.dto.TrainerApplicationRequestDTO;
import si.feri.fitlink.trainerapplication.dto.TrainerCertificationUploadResponse;

@RestController
@RequestMapping("/api/trainer-applications")
@RequiredArgsConstructor
public class TrainerApplicationController {

    private final TrainerApplicationService trainerApplicationService;

    @PostMapping("/certification")
    public ResponseEntity<TrainerCertificationUploadResponse> uploadCertification(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(trainerApplicationService.uploadCertification(principal.uid(), file));
    }

    @PostMapping
    public ResponseEntity<TrainerApplication> submitApplication(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody TrainerApplicationRequestDTO dto) {
        return ResponseEntity.ok(trainerApplicationService.submitApplication(principal.uid(), dto));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<TrainerApplication>> getPendingApplications(
            @AuthenticationPrincipal AuthPrincipal principal) {
        if (principal == null || principal.role() == null || !"ADMIN".equals(principal.role())) {
            throw new AccessDeniedException("Admin access required");
        }

        return ResponseEntity.ok(trainerApplicationService.getPendingApplications());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<TrainerApplication> approveApplication(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String id) {
        return ResponseEntity.ok(trainerApplicationService.approveApplication(id, principal.uid()));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<TrainerApplication> rejectApplication(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody TrainerApplicationRejectionDTO dto) {
        return ResponseEntity.ok(trainerApplicationService.rejectApplication(id, principal.uid(), dto.rejectionReason));
    }

    @GetMapping("/certificate/{fileName}")
    public ResponseEntity<byte[]> downloadCertificate(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String fileName) throws IOException {
        if (principal == null || principal.role() == null || !"ADMIN".equals(principal.role())) {
            throw new AccessDeniedException("Admin access required");
        }

        Path storageDir = Paths.get("").toAbsolutePath().normalize();
        if (storageDir.getFileName() != null && "backend".equalsIgnoreCase(storageDir.getFileName().toString())) {
            storageDir = storageDir.getParent();
        }
        Path filePath = storageDir.resolve("backend").resolve("certifications").resolve(fileName).normalize();

        if (!Files.exists(filePath) || !filePath.getParent().equals(storageDir.resolve("backend").resolve("certifications").normalize())) {
            throw new IllegalArgumentException("File not found");
        }

        byte[] fileContent = Files.readAllBytes(filePath);
        String contentType = determineMimeType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .body(fileContent);
    }

    private String determineMimeType(String fileName) {
        if (fileName.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (fileName.endsWith(".png")) {
            return "image/png";
        }
        if (fileName.endsWith(".doc")) {
            return "application/msword";
        }
        if (fileName.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        return "application/octet-stream";
    }
}