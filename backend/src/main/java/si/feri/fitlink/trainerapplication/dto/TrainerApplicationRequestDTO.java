package si.feri.fitlink.trainerapplication.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TrainerApplicationRequestDTO {
    @NotBlank
    public String bio;

    @NotNull
    public List<@NotBlank String> specializations;

    @NotBlank
    public String certificateFileUrl;

    @NotBlank
    public String certificateFileName;

    @NotBlank
    public String certificateMimeType;

    @NotBlank
    public String certificateChecksum;
}