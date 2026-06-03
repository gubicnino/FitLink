package si.feri.fitlink.user.dto;

import java.util.List;

import lombok.Data;

@Data
public class TrainerProfileDTO {
    private String bio;
    private String location;
    private List<String> specializations;
}
