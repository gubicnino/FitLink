package si.feri.fitlink.course;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CourseReviewReplyRequest {
    @NotBlank
    private String comment;
}
