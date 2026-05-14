package si.feri.fitlink.checkin.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckInDTO {
    @NotNull private Double weightKg;
    private String photoUrl;
    private String note;
}
