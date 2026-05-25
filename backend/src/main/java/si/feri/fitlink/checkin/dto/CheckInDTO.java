package si.feri.fitlink.checkin.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckInDTO {
    @NotNull private Double weightKg;
    private String photoUrl;
    private List<String> photoUrls;
    private String note;
    private int overallEnergyLevel;
    private Instant start;
}
