package si.feri.fitlink.course;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
@Document(collection = "courses")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Course {
    @Id private String id;
    private String authorId;
    private String title;
    private String description;
    private String category;   // Hypertrophy, Strength, Mobility...
    private String level;      // BEGINNER, INTERMEDIATE, ADVANCED
    private String youtubeVideoId;
    private String contentType; // VIDEO, ARTICLE, PDF
    private String articleUrl;
    private String pdfUrl;
    private String thumbnailUrl;
    private Instant publishedAt;
    private CourseStats stats;

    @Data
    public static class CourseStats {
        private double avgRating;
        private int ratingsCount;
        private int completionsCount;
    }
}
