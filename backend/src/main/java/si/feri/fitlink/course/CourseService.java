package si.feri.fitlink.course;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;
    private final UserRepository userRepository;

    public Course create(CourseRequest request, AuthPrincipal principal) {
        Course course = new Course();
        applyRequest(course, request);
        course.setAuthorId(principal.uid());
        course.setPublishedAt(Instant.now());
        Course.CourseStats stats = new Course.CourseStats();
        stats.setAvgRating(0);
        stats.setRatingsCount(0);
        stats.setCompletionsCount(0);
        course.setStats(stats);
        return courseRepo.save(course);
    }

    public Course getById(String id) {
        return courseRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    public List<Course> search(String title) {
        return courseRepo.findByTitleContainingIgnoreCase(title);
    }

    public List<Course> getByCategory(String category, String level) {
        return courseRepo.findByCategoryAndLevel(category, level);
    }

    public List<Course> getByAuthor(String authorId) {
        return courseRepo.findByAuthorId(authorId);
    }

    public CourseResponse getResponseById(String id) {
        return toResponse(getById(id));
    }

    public List<CourseResponse> getAllResponses() {
        return courseRepo.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public Course update(String id, CourseRequest request, AuthPrincipal principal) {
        Course existing = getById(id);
        ensureOwner(existing, principal);
        applyRequest(existing, request);
        return courseRepo.save(existing);
    }

    public void delete(String id, AuthPrincipal principal) {
        Course existing = getById(id);
        ensureOwner(existing, principal);
        courseRepo.deleteById(id);
    }

    public List<Course> getAll() {
        return courseRepo.findAll();
    }

    private void applyRequest(Course course, CourseRequest request) {
        String youtubeVideoId = request.getYoutubeVideoId() != null
                ? request.getYoutubeVideoId().trim()
                : "";
        String articleUrl = request.getArticleUrl() != null
                ? request.getArticleUrl().trim()
                : "";
        String pdfUrl = request.getPdfUrl() != null
                ? request.getPdfUrl().trim()
                : "";
        boolean hasVideo = !youtubeVideoId.isBlank();
        boolean hasArticle = !articleUrl.isBlank();
        boolean hasPdf = !pdfUrl.isBlank();

        if (!hasVideo && !hasArticle && !hasPdf) {
            throw new IllegalArgumentException("Course requires a YouTube video, article URL, or PDF URL");
        }

        String contentType = normalizeContentType(request.getContentType(), hasVideo, hasArticle);

        if (contentType.equals("VIDEO") && !hasVideo) {
            throw new IllegalArgumentException("YouTube video is required for VIDEO courses");
        }
        if (contentType.equals("ARTICLE") && !hasArticle) {
            throw new IllegalArgumentException("Article URL is required for ARTICLE courses");
        }
        if (contentType.equals("PDF") && !hasPdf) {
            throw new IllegalArgumentException("PDF URL is required for PDF courses");
        }

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setCategory(request.getCategory());
        course.setLevel(request.getLevel());
        course.setContentType(contentType);
        course.setYoutubeVideoId(contentType.equals("VIDEO") ? youtubeVideoId : null);
        course.setArticleUrl(contentType.equals("ARTICLE") ? articleUrl : null);
        course.setPdfUrl(contentType.equals("PDF") ? pdfUrl : null);
        course.setThumbnailUrl(request.getThumbnailUrl());
    }

    private String normalizeContentType(String requestedType, boolean hasVideo, boolean hasArticle) {
        if (requestedType == null || requestedType.isBlank()) {
            if (hasVideo) return "VIDEO";
            if (hasArticle) return "ARTICLE";
            return "PDF";
        }

        String contentType = requestedType.trim().toUpperCase();
        if (contentType.equals("ARTICLE_LINK")) {
            return "ARTICLE";
        }
        if (!contentType.equals("VIDEO") && !contentType.equals("ARTICLE") && !contentType.equals("PDF")) {
            throw new IllegalArgumentException("Course content type must be VIDEO, ARTICLE, or PDF");
        }
        return contentType;
    }

    private void ensureOwner(Course course, AuthPrincipal principal) {
        if (!principal.uid().equals(course.getAuthorId())) {
            throw new ResourceNotFoundException("Course not found");
        }
    }

    private CourseResponse toResponse(Course course) {
        User author = userRepository.findByFirebaseUid(course.getAuthorId()).orElse(null);
        User.TrainerInfo trainer = author != null ? author.getTrainer() : null;

        return CourseResponse.builder()
                .id(course.getId())
                .authorId(course.getAuthorId())
                .authorDisplayName(author != null ? author.getDisplayName() : "Coach")
                .authorBio(trainer != null ? trainer.getBio() : null)
                .authorSpecializations(trainer != null ? trainer.getSpecializations() : List.of())
                .authorVerificationStatus(trainer != null ? trainer.getVerificationStatus() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .category(course.getCategory())
                .level(course.getLevel())
                .contentType(course.getContentType() != null ? normalizeStoredContentType(course.getContentType()) : "VIDEO")
                .youtubeVideoId(course.getYoutubeVideoId())
                .articleUrl(course.getArticleUrl())
                .pdfUrl(course.getPdfUrl())
                .thumbnailUrl(course.getThumbnailUrl())
                .publishedAt(course.getPublishedAt())
                .stats(course.getStats())
                .build();
    }

    private String normalizeStoredContentType(String contentType) {
        return contentType.equals("ARTICLE_LINK") ? "ARTICLE" : contentType;
    }
}
