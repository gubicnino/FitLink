package si.feri.fitlink.trainerapplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainerCertificationUploadResponse {
    private String certificateFileUrl;
    private String certificateFileName;
    private String certificateMimeType;
    private String certificateChecksum;
}