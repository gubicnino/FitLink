package si.feri.fitlink.coaching.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CoachingActionDTO {
    @NotBlank
    private String coachingId;
}