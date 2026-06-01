package si.feri.fitlink.checkin;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.checkin.dto.CheckInDTO;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.coaching.CoachingRepository;
import si.feri.fitlink.coaching.CoachingStatus;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class CheckInService {

    private static final int MAX_CHECKIN_PHOTOS = 5;

    private final CoachingRepository coachingRepo;

    private Coaching getActiveCoaching(String traineeId) {
        return coachingRepo.findByTraineeIdAndStatus(traineeId, CoachingStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Active coaching not found"));
    }

    private List<CheckIn> getCheckIns(Coaching coaching) {
        List<CheckIn> checkIns = coaching.getCheckIns();
        if (checkIns == null) {
            checkIns = new ArrayList<>();
            coaching.setCheckIns(checkIns);
        }
        return checkIns;
    }

    private CheckIn createCheckIn(String traineeId, Instant start) {
        return CheckIn.builder()
                .id(UUID.randomUUID().toString())
                .traineeId(traineeId)
                .start(start)
                .createdAt(Instant.now())
                .deletedByUser(false)
                .build();
    }

    private void ensureCheckInId(CheckIn checkIn) {
        if (checkIn.getId() == null || checkIn.getId().isBlank()) {
            checkIn.setId(UUID.randomUUID().toString());
        }
    }

    private String storeCheckInPhoto(String checkInId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Check-in photo must be an image");
        }

        Path uploadDir = Paths.get("uploads", "checkins", checkInId).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadDir);

            String extension = extensionFor(contentType, file.getOriginalFilename());
            String fileName = "photo-" + System.currentTimeMillis() + extension;
            Path target = uploadDir.resolve(fileName).normalize();

            if (!target.getParent().equals(uploadDir)) {
                throw new IllegalArgumentException("Invalid file name");
            }

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/checkins/" + checkInId + "/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store check-in photo", e);
        }
    }

    private String extensionFor(String contentType, String originalName) {
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        if (originalName != null && originalName.contains(".")) {
            String extension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (extension.matches("\\.(jpg|jpeg|png|webp)")) {
                return extension;
            }
        }
        return ".jpg";
    }

    public CheckIn submitCheckIn(String traineeId, CheckInDTO dto) {
        return submitCheckIn(traineeId, dto, (List<MultipartFile>) null);
    }

    public CheckIn submitCheckIn(String traineeId, CheckInDTO dto, MultipartFile photo) {
        List<MultipartFile> photos = photo == null || photo.isEmpty() ? List.of() : List.of(photo);
        return submitCheckIn(traineeId, dto, photos);
    }

    public CheckIn submitCheckIn(String traineeId, CheckInDTO dto, List<MultipartFile> photos) {
        Coaching coaching = getActiveCoaching(traineeId);
        Instant start = LocalDate.now(ZoneOffset.UTC)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();

        List<CheckIn> checkIns = getCheckIns(coaching);

        CheckIn checkIn = checkIns.stream()
                .filter(item -> start.equals(item.getStart()))
                .findFirst()
                .orElseGet(() -> createCheckIn(traineeId, start));

        ensureCheckInId(checkIn);
        checkIn.setStart(start);
        checkIn.setWeightKg(dto.getWeightKg());
        if (photos != null && !photos.isEmpty()) {
            List<MultipartFile> nonEmptyPhotos = photos.stream()
                    .filter(file -> file != null && !file.isEmpty())
                    .toList();

            if (nonEmptyPhotos.size() > MAX_CHECKIN_PHOTOS) {
                throw new IllegalArgumentException("You can upload up to " + MAX_CHECKIN_PHOTOS + " photos per check-in");
            }

            List<String> storedPhotoUrls = nonEmptyPhotos.stream()
                    .map(file -> storeCheckInPhoto(checkIn.getId(), file))
                    .toList();

            checkIn.setPhotoUrls(storedPhotoUrls);
            checkIn.setPhotoUrl(storedPhotoUrls.isEmpty() ? null : storedPhotoUrls.get(0));
        } else if (dto.getPhotoUrls() != null && !dto.getPhotoUrls().isEmpty()) {
            List<String> limitedPhotoUrls = dto.getPhotoUrls().stream().limit(MAX_CHECKIN_PHOTOS).toList();
            checkIn.setPhotoUrls(limitedPhotoUrls);
            checkIn.setPhotoUrl(limitedPhotoUrls.get(0));
        } else if (dto.getPhotoUrl() != null && !dto.getPhotoUrl().isBlank()) {
            checkIn.setPhotoUrl(dto.getPhotoUrl());
            checkIn.setPhotoUrls(List.of(dto.getPhotoUrl()));
        }
        checkIn.setNote(dto.getNote());
        checkIn.setOverallEnergyLevel(dto.getOverallEnergyLevel());
        checkIn.setDeletedByUser(false);

        if (checkIns.stream().noneMatch(item -> checkIn.getId().equals(item.getId()))) {
            checkIns.add(checkIn);
        }

        coachingRepo.save(coaching);
        return checkIn;
    }

    public List<CheckIn> getMyCheckIns(String traineeId) {
        return coachingRepo.findByTraineeId(traineeId).stream()
                .flatMap(coaching -> {
                    List<CheckIn> checkIns = coaching.getCheckIns();
                    return checkIns == null ? Stream.empty() : checkIns.stream();
                })
                .filter(checkIn -> !checkIn.isDeletedByUser())
                .sorted(Comparator.comparing(CheckIn::getStart, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    public CheckIn deleteCheckIn(String checkInId, String requesterId) {
        Coaching coaching = coachingRepo.findByTraineeId(requesterId).stream()
                .filter(item -> {
                    List<CheckIn> checkIns = item.getCheckIns();
                    return checkIns != null && checkIns.stream().anyMatch(checkIn -> checkInId.equals(checkIn.getId()));
                })
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("CheckIn not found"));

        List<CheckIn> checkIns = getCheckIns(coaching);
        CheckIn checkIn = checkIns.stream()
                .filter(item -> checkInId.equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("CheckIn not found"));

        if (!requesterId.equals(checkIn.getTraineeId()))
            throw new AccessDeniedException("Not your check-in");
        checkIn.setDeletedByUser(true);
        coachingRepo.save(coaching);
        return checkIn;
    }

    public CheckIn getCurrentWeekCheckInForCurrentUser(String traineeId) {
        Instant start = LocalDate.now(ZoneOffset.UTC)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();
        Coaching coaching = getActiveCoaching(traineeId);
        List<CheckIn> checkIns = getCheckIns(coaching);
        return checkIns.stream()
                .filter(checkIn -> !checkIn.isDeletedByUser())
                .filter(checkIn -> start.equals(checkIn.getStart()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No check-in for current week"));
    }

    public CheckIn addTrainerComment(String trainerId, String coachingId, String checkInId, String comment) {
        Coaching coaching = coachingRepo.findById(coachingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching not found"));

        CheckIn checkIn = getCheckIns(coaching).stream()
                .filter(item -> checkInId.equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Check-in not found"));

        if (!coaching.getTrainerId().equals(trainerId)) {
            throw new AccessDeniedException("Only the assigned trainer can comment on this check-in");
        }

        CheckIn.TrainerComment trainerComment = new CheckIn.TrainerComment();
        trainerComment.setText(comment);
        trainerComment.setCreatedAt(Instant.now());
        checkIn.setTrainerComment(trainerComment);
        coachingRepo.save(coaching);
        return checkIn;
    }
}
