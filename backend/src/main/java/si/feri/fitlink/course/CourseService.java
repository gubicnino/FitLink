package si.feri.fitlink.course;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

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
        course.setReviews(new ArrayList<>());
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

    public Map<String, String> uploadThumbnail(AuthPrincipal principal, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Thumbnail image is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Thumbnail must be an image");
        }

        Path uploadDir = Paths.get("uploads", "course-thumbnails").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);

        String extension = extensionFor(contentType, file.getOriginalFilename());
        String fileName = principal.uid() + "-" + System.currentTimeMillis() + extension;
        Path target = uploadDir.resolve(fileName).normalize();

        if (!target.getParent().equals(uploadDir)) {
            throw new IllegalArgumentException("Invalid file name");
        }

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return Map.of("thumbnailUrl", "/uploads/course-thumbnails/" + fileName);
    }

    public CourseResponse addReview(String id, CourseReviewRequest request, AuthPrincipal principal) {
        Course course = getById(id);
        if (principal.uid().equals(course.getAuthorId())) {
            throw new IllegalArgumentException("You cannot review your own course");
        }

        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Course.CourseReview> reviews = course.getReviews() != null
                ? new ArrayList<>(course.getReviews())
                : new ArrayList<>();

        Course.CourseReview review = reviews.stream()
                .filter(existing -> principal.uid().equals(existing.getUserId()))
                .findFirst()
                .orElseGet(() -> {
                    Course.CourseReview nextReview = new Course.CourseReview();
                    nextReview.setId(UUID.randomUUID().toString());
                    nextReview.setUserId(principal.uid());
                    reviews.add(nextReview);
                    return nextReview;
                });

        review.setUserDisplayName(user.getDisplayName());
        review.setUserAvatarUrl(user.getAvatarUrl());
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        review.setCreatedAt(Instant.now());

        course.setReviews(reviews);
        updateReviewStats(course);
        return toResponse(courseRepo.save(course));
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

    private void updateReviewStats(Course course) {
        List<Course.CourseReview> reviews = course.getReviews() != null ? course.getReviews() : List.of();
        Course.CourseStats stats = course.getStats() != null ? course.getStats() : new Course.CourseStats();
        stats.setRatingsCount(reviews.size());
        stats.setAvgRating(reviews.stream()
                .mapToInt(Course.CourseReview::getRating)
                .average()
                .orElse(0));
        course.setStats(stats);
    }

    private String extensionFor(String contentType, String originalName) {
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        if (originalName != null && originalName.contains(".")) {
            String extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase(Locale.ROOT);
            if (extension.matches("\\.(jpg|jpeg|png|webp)")) {
                return extension;
            }
        }
        return ".jpg";
    }

    private CourseResponse toResponse(Course course) {
        User author = userRepository.findByFirebaseUid(course.getAuthorId()).orElse(null);
        User.TrainerInfo trainer = author != null ? author.getTrainer() : null;

        return CourseResponse.builder()
                .id(course.getId())
                .authorId(course.getAuthorId())
                .authorDisplayName(author != null ? author.getDisplayName() : "Coach")
                .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
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
                .reviews(course.getReviews() != null ? course.getReviews() : List.of())
                .build();
    }

    private String normalizeStoredContentType(String contentType) {
        return contentType.equals("ARTICLE_LINK") ? "ARTICLE" : contentType;
    }
}
