package si.feri.fitlink.checkin;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import si.feri.fitlink.checkin.dto.CheckInDTO;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CheckInService {

    private final CheckInRepository checkInRepo;

    public CheckIn submitCheckIn(String traineeId, CheckInDTO dto) {
        Instant weekStart = LocalDate.now()
                .with(DayOfWeek.MONDAY)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();

        CheckIn checkIn = checkInRepo.findByTraineeIdAndWeekStart(traineeId, weekStart)
                .orElse(CheckIn.builder()
                        .traineeId(traineeId)
                        .weekStart(weekStart)
                        .createdAt(Instant.now())
                        .build());

        checkIn.setWeightKg(dto.getWeightKg());
        checkIn.setPhotoUrl(dto.getPhotoUrl());
        checkIn.setNote(dto.getNote());
        return checkInRepo.save(checkIn);
    }

    public List<CheckIn> getMyCheckIns(String traineeId) {
        return checkInRepo.findByTraineeIdAndDeletedByUserFalseOrderByWeekStartDesc(traineeId);
    }

    public CheckIn deleteCheckIn(String checkInId, String requesterId) {
        CheckIn checkIn = checkInRepo.findById(checkInId)
                .orElseThrow(() -> new ResourceNotFoundException("CheckIn not found"));
        if (!checkIn.getTraineeId().equals(requesterId))
            throw new AccessDeniedException("Not your check-in");
        checkIn.setDeletedByUser(true);
        return checkInRepo.save(checkIn);
    }
}
