package si.feri.fitlink.trainerapplication.dto;

import jakarta.validation.constraints.NotBlank;

public class TrainerApplicationRejectionDTO {
    @NotBlank
    public String rejectionReason;
}