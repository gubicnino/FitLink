package si.feri.fitlink.coaching.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CoachingRequestDTO {
    @NotBlank private String trainerId;
    private String requestMessage;
}
