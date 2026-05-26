package si.feri.fitlink.course;

import java.time.Instant;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CourseResponse {
    private String id;
    private String authorId;
    private String authorDisplayName;
    private String authorAvatarUrl;
    private String authorBio;
    private List<String> authorSpecializations;
    private String authorVerificationStatus;
    private String title;
    private String description;
    private String category;
    private String level;
    private String contentType;
    private String youtubeVideoId;
    private String articleUrl;
    private String pdfUrl;
    private String thumbnailUrl;
    private Instant publishedAt;
    private Course.CourseStats stats;
    private List<Course.CourseReview> reviews;
}
