package si.feri.fitlink.trainerapplication;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.trainerapplication.dto.TrainerApplicationRequestDTO;
import si.feri.fitlink.trainerapplication.dto.TrainerCertificationUploadResponse;
import si.feri.fitlink.user.Role;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@Service
@RequiredArgsConstructor
public class TrainerApplicationService {

    private static final String CERTIFICATIONS_DIR_NAME = "certifications";

    private final TrainerApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public TrainerCertificationUploadResponse uploadCertification(String firebaseUid, MultipartFile file) {
        User user = getUserByFirebaseUid(firebaseUid);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Certificate file is required");
        }

        String originalFileName = file.getOriginalFilename();
        String extension = extractExtension(originalFileName);
        String baseFileName = sanitizeForFileName(user.getDisplayName()) + "_certification";
        String backendFileName = baseFileName + extension;

        Path storageDir = resolveStorageDirectory();
        try {
            Files.createDirectories(storageDir);

            Path targetFile = storageDir.resolve(backendFileName).normalize();
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String checksum = sha256(targetFile);
            String backendPath = "backend/" + CERTIFICATIONS_DIR_NAME + "/" + backendFileName;

            return TrainerCertificationUploadResponse.builder()
                    .certificateFileUrl(backendPath)
                    .certificateFileName(backendFileName)
                    .certificateMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .certificateChecksum(checksum)
                    .build();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store certification file", e);
        }
    }

    public TrainerApplication submitApplication(String firebaseUid, TrainerApplicationRequestDTO dto) {
        User user = getUserByFirebaseUid(firebaseUid);

        applicationRepository.findByUserId(user.getId()).ifPresent(existing -> {
            if (existing.getStatus() == TrainerApplication.ApplicationStatus.PENDING) {
                throw new IllegalStateException("Trainer application is already pending");
            }
        });

        TrainerApplication application = TrainerApplication.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
            .bio(dto.bio)
            .specializations(dto.specializations)
            .certificateFileUrl(dto.certificateFileUrl)
            .certificateFileName(dto.certificateFileName)
            .certificateMimeType(dto.certificateMimeType)
            .certificateChecksum(dto.certificateChecksum)
                .status(TrainerApplication.ApplicationStatus.PENDING)
                .submittedAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        User.TrainerInfo trainerInfo = ensureTrainerInfo(user);
        trainerInfo.setVerificationStatus(TrainerApplication.ApplicationStatus.PENDING.name());
        trainerInfo.setLicenseFileUrl(dto.certificateFileUrl);
        trainerInfo.setBio(dto.bio);
        trainerInfo.setSpecializations(dto.specializations);
        trainerInfo.setRejectionReason(null);
        user.setTrainer(trainerInfo);
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
        return applicationRepository.save(application);
    }

    public TrainerApplication approveApplication(String applicationId, String adminFirebaseUid) {
        User adminUser = getAdminUserByFirebaseUid(adminFirebaseUid);
        TrainerApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer application not found"));

        if (application.getStatus() != TrainerApplication.ApplicationStatus.PENDING) {
            throw new IllegalStateException("Only pending applications can be approved");
        }

        User user = userRepository.findById(application.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        application.setStatus(TrainerApplication.ApplicationStatus.APPROVED);
        application.setReviewedByAdminId(adminUser.getId());
        application.setReviewedAt(Instant.now());
        application.setUpdatedAt(Instant.now());

        User.TrainerInfo trainerInfo = ensureTrainerInfo(user);
        trainerInfo.setVerificationStatus(TrainerApplication.ApplicationStatus.APPROVED.name());
        trainerInfo.setLicenseFileUrl(application.getCertificateFileUrl());
        trainerInfo.setBio(application.getBio());
        trainerInfo.setSpecializations(application.getSpecializations());
        trainerInfo.setVerifiedAt(Instant.now());
        trainerInfo.setRejectionReason(null);
        user.setTrainer(trainerInfo);
        user.setRole(Role.TRAINER);
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
        return applicationRepository.save(application);
    }

    public TrainerApplication rejectApplication(String applicationId, String adminFirebaseUid, String rejectionReason) {
        User adminUser = getAdminUserByFirebaseUid(adminFirebaseUid);
        TrainerApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer application not found"));

        if (application.getStatus() != TrainerApplication.ApplicationStatus.PENDING) {
            throw new IllegalStateException("Only pending applications can be rejected");
        }

        User user = userRepository.findById(application.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        application.setStatus(TrainerApplication.ApplicationStatus.REJECTED);
        application.setRejectionReason(rejectionReason);
        application.setReviewedByAdminId(adminUser.getId());
        application.setReviewedAt(Instant.now());
        application.setUpdatedAt(Instant.now());

        User.TrainerInfo trainerInfo = ensureTrainerInfo(user);
        trainerInfo.setVerificationStatus(TrainerApplication.ApplicationStatus.REJECTED.name());
        trainerInfo.setRejectionReason(rejectionReason);
        user.setTrainer(trainerInfo);
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
        return applicationRepository.save(application);
    }

    public List<TrainerApplication> getPendingApplications() {
        return applicationRepository.findByStatus(TrainerApplication.ApplicationStatus.PENDING);
    }

    private User getUserByFirebaseUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private User getAdminUserByFirebaseUid(String firebaseUid) {
        User adminUser = getUserByFirebaseUid(firebaseUid);
        if (adminUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Admin access required");
        }
        return adminUser;
    }

    private User.TrainerInfo ensureTrainerInfo(User user) {
        if (user.getTrainer() != null) {
            return user.getTrainer();
        }

        User.TrainerInfo trainerInfo = new User.TrainerInfo();
        user.setTrainer(trainerInfo);
        return trainerInfo;
    }

    private Path resolveStorageDirectory() {
        Path currentDir = Paths.get("").toAbsolutePath().normalize();
        if (currentDir.getFileName() != null && "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
            return currentDir.getParent().resolve("backend").resolve(CERTIFICATIONS_DIR_NAME);
        }

        return currentDir.resolve("backend").resolve(CERTIFICATIONS_DIR_NAME);
    }

    private String sanitizeForFileName(String value) {
        String sanitized = value == null ? "trainer" : value.toLowerCase(Locale.ROOT);
        sanitized = sanitized.replaceAll("[^a-z0-9]+", "_");
        sanitized = sanitized.replaceAll("_+", "_");
        sanitized = sanitized.replaceAll("^_|_$", "");
        return sanitized.isBlank() ? "trainer" : sanitized;
    }

    private String extractExtension(String originalFileName) {
        if (originalFileName == null || !originalFileName.contains(".")) {
            return ".pdf";
        }

        int index = originalFileName.lastIndexOf('.');
        String extension = originalFileName.substring(index).toLowerCase(Locale.ROOT);
        return extension.isBlank() ? ".pdf" : extension;
    }

    private String sha256(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream inputStream = Files.newInputStream(file)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = inputStream.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                }
            }

            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}