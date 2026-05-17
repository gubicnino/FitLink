package si.feri.fitlink.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import si.feri.fitlink.user.Role;

@Data
public class RegisterDTO {

    @NotBlank
    private String displayName;

    @NotNull
    private Role role;

}
