package si.feri.fitlink.user.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class ProfileDTO {
    private String displayName;
    private LocalDate birthDate;
    private String gender;
    private Double heightCm;
    private Double currentWeightKg;
}
