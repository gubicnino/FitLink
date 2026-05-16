package si.feri.fitlink.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import si.feri.fitlink.user.Role;

import java.time.LocalDate;

@Data
public class RegisterDTO {

    @NotBlank
    private String displayName;

    @NotNull
    private Role role;

    private ProfileDTO profile;

    @Data
    public static class ProfileDTO {
        private LocalDate birthDate;
        private String gender;
        private Double heightCm;
        private Double currentWeightKg;
    }
}
