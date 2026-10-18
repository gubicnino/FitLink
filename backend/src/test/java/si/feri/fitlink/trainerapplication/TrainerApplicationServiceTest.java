package si.feri.fitlink.trainerapplication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.trainerapplication.TrainerApplication.ApplicationStatus;
import si.feri.fitlink.trainerapplication.dto.TrainerApplicationRequestDTO;
import si.feri.fitlink.trainerapplication.dto.TrainerCertificationUploadResponse;
import si.feri.fitlink.user.Role;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class TrainerApplicationServiceTest {

    @Mock private TrainerApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private TrainerApplicationService service;

    private static final String USER_UID = "user-uid";
    private static final String USER_ID = "user-id";
    private static final String ADMIN_UID = "admin-uid";
    private static final String ADMIN_ID = "admin-id";
    private static final String APPLICATION_ID = "app-1";

    // =====================================================================
    // submitApplication
    // =====================================================================

    @Nested
    @DisplayName("submitApplication")
    class Submit {

        @Test
        @DisplayName("first application is stored as PENDING and mirrored into the user's trainer info")
        void submitApplication_noPrevious_createsPending() {
            User user = trainee();
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.of(user));
            when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
            when(applicationRepository.save(any(TrainerApplication.class))).thenAnswer(inv -> inv.getArgument(0));

            TrainerApplication result = service.submitApplication(USER_UID, dto());

            assertThat(result.getStatus()).isEqualTo(ApplicationStatus.PENDING);
            assertThat(result.getUserId()).isEqualTo(USER_ID);
            assertThat(result.getEmail()).isEqualTo("nino@x.com");
            assertThat(result.getDisplayName()).isEqualTo("Nino");
            assertThat(result.getBio()).isEqualTo("Coach for 10 years");
            assertThat(result.getSpecializations()).containsExactly("Strength", "Mobility");
            assertThat(result.getCertificateFileUrl()).isEqualTo("backend/certifications/nino_certification.pdf");
            assertThat(result.getCertificateChecksum()).isEqualTo("abc123");
            assertThat(result.getSubmittedAt()).isNotNull();
            assertThat(result.getReviewedByAdminId()).isNull();

            User.TrainerInfo info = user.getTrainer();
            assertThat(info).isNotNull();
            assertThat(info.getVerificationStatus()).isEqualTo("PENDING");
            assertThat(info.getLicenseFileUrl()).isEqualTo("backend/certifications/nino_certification.pdf");
            assertThat(info.getBio()).isEqualTo("Coach for 10 years");
            assertThat(user.getRole()).isEqualTo(Role.TRAINEE);
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("re-applying after a rejection is allowed and clears the old rejection reason")
        void submitApplication_afterRejection_allowedAndClearsReason() {
            User user = trainee();
            User.TrainerInfo info = new User.TrainerInfo();
            info.setVerificationStatus("REJECTED");
            info.setRejectionReason("Blurry certificate");
            user.setTrainer(info);
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.of(user));
            when(applicationRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(application(ApplicationStatus.REJECTED)));
            when(applicationRepository.save(any(TrainerApplication.class))).thenAnswer(inv -> inv.getArgument(0));

            TrainerApplication result = service.submitApplication(USER_UID, dto());

            assertThat(result.getStatus()).isEqualTo(ApplicationStatus.PENDING);
            assertThat(user.getTrainer()).isSameAs(info);
            assertThat(info.getVerificationStatus()).isEqualTo("PENDING");
            assertThat(info.getRejectionReason()).isNull();
        }

        @ParameterizedTest(name = "existing {0} application blocks a new one")
        @EnumSource(value = ApplicationStatus.class, names = {"PENDING", "APPROVED"})
        @DisplayName("submitting while an application is pending or already approved throws IllegalStateException")
        void submitApplication_pendingOrApprovedExists_throws(ApplicationStatus existingStatus) {
            User user = trainee();
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.of(user));
            when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.of(application(existingStatus)));

            assertThatThrownBy(() -> service.submitApplication(USER_UID, dto()))
                .isInstanceOf(IllegalStateException.class);
            verify(applicationRepository, never()).save(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("submitting for an unknown user throws ResourceNotFound")
        void submitApplication_unknownUser_throws() {
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.submitApplication(USER_UID, dto()))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(applicationRepository, never()).save(any());
        }
    }

    // =====================================================================
    // approveApplication / rejectApplication
    // =====================================================================

    @Nested
    @DisplayName("approveApplication / rejectApplication")
    class Review {

        @Test
        @DisplayName("approving a PENDING application promotes the user to TRAINER and records the reviewer")
        void approveApplication_pending_promotesToTrainer() {
            User user = trainee();
            User.TrainerInfo info = new User.TrainerInfo();
            info.setRejectionReason("old reason");
            user.setTrainer(info);
            TrainerApplication app = application(ApplicationStatus.PENDING);
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.of(app));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(applicationRepository.save(any(TrainerApplication.class))).thenAnswer(inv -> inv.getArgument(0));

            TrainerApplication result = service.approveApplication(APPLICATION_ID, ADMIN_UID);

            assertThat(result.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
            assertThat(result.getReviewedByAdminId()).isEqualTo(ADMIN_ID);
            assertThat(result.getReviewedAt()).isNotNull();
            assertThat(user.getRole()).isEqualTo(Role.TRAINER);
            assertThat(info.getVerificationStatus()).isEqualTo("APPROVED");
            assertThat(info.getVerifiedAt()).isNotNull();
            assertThat(info.getLicenseFileUrl()).isEqualTo(app.getCertificateFileUrl());
            assertThat(info.getBio()).isEqualTo(app.getBio());
            assertThat(info.getSpecializations()).isEqualTo(app.getSpecializations());
            assertThat(info.getRejectionReason()).isNull();
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("approving creates trainer info when the user has none yet")
        void approveApplication_userWithoutTrainerInfo_createsIt() {
            User user = trainee();
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID))
                .thenReturn(Optional.of(application(ApplicationStatus.PENDING)));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

            service.approveApplication(APPLICATION_ID, ADMIN_UID);

            assertThat(user.getTrainer()).isNotNull();
            assertThat(user.getTrainer().getVerificationStatus()).isEqualTo("APPROVED");
        }

        @Test
        @DisplayName("rejecting a PENDING application stores the reason and keeps the user a TRAINEE")
        void rejectApplication_pending_storesReasonKeepsRole() {
            User user = trainee();
            TrainerApplication app = application(ApplicationStatus.PENDING);
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.of(app));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(applicationRepository.save(any(TrainerApplication.class))).thenAnswer(inv -> inv.getArgument(0));

            TrainerApplication result = service.rejectApplication(APPLICATION_ID, ADMIN_UID, "Certificate expired");

            assertThat(result.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
            assertThat(result.getRejectionReason()).isEqualTo("Certificate expired");
            assertThat(result.getReviewedByAdminId()).isEqualTo(ADMIN_ID);
            assertThat(result.getReviewedAt()).isNotNull();
            assertThat(user.getRole()).isEqualTo(Role.TRAINEE);
            assertThat(user.getTrainer().getVerificationStatus()).isEqualTo("REJECTED");
            assertThat(user.getTrainer().getRejectionReason()).isEqualTo("Certificate expired");
            assertThat(user.getTrainer().getVerifiedAt()).isNull();
            verify(userRepository).save(user);
        }

        @ParameterizedTest(name = "approving a {0} application is rejected")
        @EnumSource(value = ApplicationStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("only PENDING applications can be approved")
        void approveApplication_notPending_throws(ApplicationStatus status) {
            TrainerApplication app = application(status);
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.of(app));

            assertThatThrownBy(() -> service.approveApplication(APPLICATION_ID, ADMIN_UID))
                .isInstanceOf(IllegalStateException.class);
            assertThat(app.getStatus()).isEqualTo(status);
            verify(userRepository, never()).save(any());
            verify(applicationRepository, never()).save(any());
        }

        @ParameterizedTest(name = "rejecting a {0} application is rejected")
        @EnumSource(value = ApplicationStatus.class, names = "PENDING", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("only PENDING applications can be rejected")
        void rejectApplication_notPending_throws(ApplicationStatus status) {
            TrainerApplication app = application(status);
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.of(app));

            assertThatThrownBy(() -> service.rejectApplication(APPLICATION_ID, ADMIN_UID, "no"))
                .isInstanceOf(IllegalStateException.class);
            assertThat(app.getStatus()).isEqualTo(status);
            verify(userRepository, never()).save(any());
            verify(applicationRepository, never()).save(any());
        }

        @ParameterizedTest(name = "caller with role {0} cannot approve")
        @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("approveApplication by a non-admin throws AccessDenied and changes nothing")
        void approveApplication_nonAdmin_throws(Role role) {
            User caller = User.builder().id("caller-id").firebaseUid("caller-uid").role(role).build();
            when(userRepository.findByFirebaseUid("caller-uid")).thenReturn(Optional.of(caller));

            assertThatThrownBy(() -> service.approveApplication(APPLICATION_ID, "caller-uid"))
                .isInstanceOf(AccessDeniedException.class);
            verify(applicationRepository, never()).findById(any());
            verify(userRepository, never()).save(any());
            verify(applicationRepository, never()).save(any());
        }

        @ParameterizedTest(name = "caller with role {0} cannot reject")
        @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("rejectApplication by a non-admin throws AccessDenied and changes nothing")
        void rejectApplication_nonAdmin_throws(Role role) {
            User caller = User.builder().id("caller-id").firebaseUid("caller-uid").role(role).build();
            when(userRepository.findByFirebaseUid("caller-uid")).thenReturn(Optional.of(caller));

            assertThatThrownBy(() -> service.rejectApplication(APPLICATION_ID, "caller-uid", "no"))
                .isInstanceOf(AccessDeniedException.class);
            verify(userRepository, never()).save(any());
            verify(applicationRepository, never()).save(any());
        }

        @Test
        @DisplayName("approving an unknown application throws ResourceNotFound")
        void approveApplication_unknownApplication_throws() {
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.approveApplication(APPLICATION_ID, ADMIN_UID))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("approving when the applicant no longer exists throws ResourceNotFound")
        void approveApplication_applicantMissing_throws() {
            stubAdmin();
            when(applicationRepository.findById(APPLICATION_ID))
                .thenReturn(Optional.of(application(ApplicationStatus.PENDING)));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.approveApplication(APPLICATION_ID, ADMIN_UID))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(applicationRepository, never()).save(any());
        }
    }

    // =====================================================================
    // uploadCertification – file name sanitizing, extension, checksum
    // =====================================================================

    @Nested
    @DisplayName("uploadCertification")
    class Upload {

        private final List<String> createdFiles = new ArrayList<>();

        @AfterEach
        void deleteCreatedFiles() throws Exception {
            for (String name : createdFiles) {
                Files.deleteIfExists(Paths.get("certifications", name));
                Files.deleteIfExists(Paths.get("backend", "certifications", name));
            }
        }

        @Test
        @DisplayName("stores the file under a sanitized name and returns path, mime type and SHA-256 checksum")
        void uploadCertification_valid_storesWithSanitizedNameAndChecksum() throws Exception {
            byte[] content = "certificate-bytes".getBytes(StandardCharsets.UTF_8);
            stubUploader("  JUnit Probe Ž! ");
            createdFiles.add("junit_probe_certification.pdf");

            TrainerCertificationUploadResponse response = service.uploadCertification(USER_UID,
                new MockMultipartFile("file", "Cert.PDF", "application/pdf", content));

            assertThat(response.getCertificateFileName()).isEqualTo("junit_probe_certification.pdf");
            assertThat(response.getCertificateFileUrl()).isEqualTo("backend/certifications/junit_probe_certification.pdf");
            assertThat(response.getCertificateMimeType()).isEqualTo("application/pdf");
            assertThat(response.getCertificateChecksum()).isEqualTo(sha256(content));
            assertThat(storedFile("junit_probe_certification.pdf")).hasBinaryContent(content);
        }

        @ParameterizedTest(name = "original name ''{0}'' → ''{1}''")
        @CsvSource(value = {
            "scan.PNG,        junit_probe_certification.png",
            "my.cert.jpeg,    junit_probe_certification.jpeg",
            "noextension,     junit_probe_certification.pdf",
            "NULL,            junit_probe_certification.pdf",
            "trailingdot.,    junit_probe_certification.pdf",
        }, nullValues = "NULL")
        @DisplayName("uses the last extension in lower case and falls back to .pdf when there is none")
        void uploadCertification_extension_derivedFromOriginalName(String originalName, String expectedFileName)
                throws Exception {
            stubUploader("JUnit Probe");
            createdFiles.add(expectedFileName);
            createdFiles.add("junit_probe_certification.");
            createdFiles.add("junit_probe_certification");

            TrainerCertificationUploadResponse response = service.uploadCertification(USER_UID,
                new MockMultipartFile("file", originalName, "application/pdf", new byte[] {1, 2, 3}));

            assertThat(response.getCertificateFileName()).isEqualTo(expectedFileName);
        }

        @ParameterizedTest(name = "display name ''{0}'' → trainer_certification.pdf")
        @CsvSource(value = {"NULL", "'!!!'", "'   '"}, nullValues = "NULL")
        @DisplayName("falls back to 'trainer' when the display name has no usable characters")
        void uploadCertification_unusableDisplayName_usesTrainer(String displayName) throws Exception {
            stubUploader(displayName);
            createdFiles.add("trainer_certification.pdf");

            TrainerCertificationUploadResponse response = service.uploadCertification(USER_UID,
                new MockMultipartFile("file", "c.pdf", "application/pdf", new byte[] {1}));

            assertThat(response.getCertificateFileName()).isEqualTo("trainer_certification.pdf");
        }

        @Test
        @DisplayName("uses application/octet-stream when the upload has no content type")
        void uploadCertification_noContentType_octetStream() throws Exception {
            stubUploader("JUnit Probe");
            createdFiles.add("junit_probe_certification.pdf");

            TrainerCertificationUploadResponse response = service.uploadCertification(USER_UID,
                new MockMultipartFile("file", "c.pdf", null, new byte[] {1}));

            assertThat(response.getCertificateMimeType()).isEqualTo("application/octet-stream");
        }

        @Test
        @DisplayName("an empty file throws IllegalArgumentException")
        void uploadCertification_emptyFile_throws() {
            stubUploader("JUnit Probe");

            assertThatThrownBy(() -> service.uploadCertification(USER_UID,
                    new MockMultipartFile("file", "c.pdf", "application/pdf", new byte[0])))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("a missing file throws IllegalArgumentException")
        void uploadCertification_nullFile_throws() {
            stubUploader("JUnit Probe");

            assertThatThrownBy(() -> service.uploadCertification(USER_UID, null))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("upload by an unknown user throws ResourceNotFound")
        void uploadCertification_unknownUser_throws() {
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.uploadCertification(USER_UID,
                    new MockMultipartFile("file", "c.pdf", "application/pdf", new byte[] {1})))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        private void stubUploader(String displayName) {
            User user = trainee();
            user.setDisplayName(displayName);
            when(userRepository.findByFirebaseUid(USER_UID)).thenReturn(Optional.of(user));
        }

        private Path storedFile(String name) {
            Path whenRunFromBackend = Paths.get("certifications", name);
            return Files.exists(whenRunFromBackend) ? whenRunFromBackend : Paths.get("backend", "certifications", name);
        }
    }

    // ---------- helpers ----------

    private void stubAdmin() {
        User admin = User.builder().id(ADMIN_ID).firebaseUid(ADMIN_UID).role(Role.ADMIN).build();
        when(userRepository.findByFirebaseUid(ADMIN_UID)).thenReturn(Optional.of(admin));
    }

    private static User trainee() {
        return User.builder()
            .id(USER_ID)
            .firebaseUid(USER_UID)
            .email("nino@x.com")
            .displayName("Nino")
            .role(Role.TRAINEE)
            .build();
    }

    private static TrainerApplicationRequestDTO dto() {
        TrainerApplicationRequestDTO dto = new TrainerApplicationRequestDTO();
        dto.bio = "Coach for 10 years";
        dto.specializations = List.of("Strength", "Mobility");
        dto.certificateFileUrl = "backend/certifications/nino_certification.pdf";
        dto.certificateFileName = "nino_certification.pdf";
        dto.certificateMimeType = "application/pdf";
        dto.certificateChecksum = "abc123";
        return dto;
    }

    private static TrainerApplication application(ApplicationStatus status) {
        return TrainerApplication.builder()
            .id(APPLICATION_ID)
            .userId(USER_ID)
            .bio("Coach for 10 years")
            .specializations(List.of("Strength"))
            .certificateFileUrl("backend/certifications/nino_certification.pdf")
            .status(status)
            .build();
    }

    private static String sha256(byte[] content) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }

}
