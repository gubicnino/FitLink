package si.feri.fitlink.checkin;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import si.feri.fitlink.auth.AuthPrincipal;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.checkin.dto.CheckInDTO;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckInController {
    private final CheckInService checkInService;

    @GetMapping("/my")
    public ResponseEntity<List<CheckIn>> getMyCheckIns(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(checkInService.getMyCheckIns(principal.uid()));
    }
    @GetMapping("/current")
    public ResponseEntity<CheckIn> getCurrentWeekCheckInForCurrentUser(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(checkInService.getCurrentWeekCheckInForCurrentUser(principal.uid()));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CheckIn> createCheckIn(@AuthenticationPrincipal AuthPrincipal principal, @RequestBody CheckInDTO checkInDTO) {
        return ResponseEntity.ok(checkInService.submitCheckIn(principal.uid(), checkInDTO));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CheckIn> createCheckInMultipart(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("weightKg") Double weightKg,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("overallEnergyLevel") int overallEnergyLevel,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "photo", required = false) MultipartFile photo) throws IOException {
        CheckInDTO checkInDTO = new CheckInDTO();
        checkInDTO.setWeightKg(weightKg);
        checkInDTO.setNote(note);
        checkInDTO.setOverallEnergyLevel(overallEnergyLevel);
        checkInDTO.setStart(null);

        List<MultipartFile> uploadPhotos = photos != null ? new ArrayList<>(photos) : new ArrayList<>();
        if (photo != null && !photo.isEmpty()) {
            uploadPhotos.add(photo);
        }

        return ResponseEntity.ok(checkInService.submitCheckIn(principal.uid(), checkInDTO, uploadPhotos));
    }
}
