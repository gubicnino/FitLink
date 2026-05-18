package si.feri.fitlink.course;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CourseRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String description;

    @NotBlank
    private String category;

    @NotBlank
    private String level;

    @NotBlank
    private String youtubeVideoId;

    private String thumbnailUrl;
}
