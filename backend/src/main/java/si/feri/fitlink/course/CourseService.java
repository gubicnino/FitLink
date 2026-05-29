package si.feri.fitlink.course;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
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
import java.util.Optional;
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
        course.setCompletedUserIds(new ArrayList<>());
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
        return toResponse(getById(id), null);
    }

    public CourseResponse getResponseById(String id, AuthPrincipal principal) {
        return toResponse(getById(id), principal);
    }

    public List<CourseResponse> getAllResponses() {
        return getAllResponses(null);
    }

    public List<CourseResponse> getAllResponses(AuthPrincipal principal) {
        return courseRepo.findAll().stream()
                .map(course -> toResponse(course, principal))
                .toList();
    }

    public List<CourseResponse> getSavedResponses(AuthPrincipal principal) {
        User user = getUser(principal);
        List<String> savedCourseIds = user.getSavedCourseIds() != null
                ? user.getSavedCourseIds()
                : List.of();

        return savedCourseIds.stream()
                .map(courseRepo::findById)
                .flatMap(Optional::stream)
                .map(course -> toResponse(course, principal))
                .toList();
    }

    public CourseResponse saveCourse(String id, AuthPrincipal principal) {
        Course course = getById(id);
        User user = getUser(principal);
        List<String> savedCourseIds = user.getSavedCourseIds() != null
                ? new ArrayList<>(user.getSavedCourseIds())
                : new ArrayList<>();

        if (!savedCourseIds.contains(id)) {
            savedCourseIds.add(id);
            user.setSavedCourseIds(savedCourseIds);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        }

        return toResponse(course, principal);
    }

    public CourseResponse unsaveCourse(String id, AuthPrincipal principal) {
        Course course = getById(id);
        User user = getUser(principal);
        List<String> savedCourseIds = user.getSavedCourseIds() != null
                ? new ArrayList<>(user.getSavedCourseIds())
                : new ArrayList<>();

        if (savedCourseIds.remove(id)) {
            user.setSavedCourseIds(savedCourseIds);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        }

        return toResponse(course, principal);
    }

    public CourseResponse completeCourse(String id, AuthPrincipal principal) {
        Course course = getById(id);
        List<String> completedUserIds = course.getCompletedUserIds() != null
                ? new ArrayList<>(course.getCompletedUserIds())
                : new ArrayList<>();

        if (!completedUserIds.contains(principal.uid())) {
            completedUserIds.add(principal.uid());
            course.setCompletedUserIds(completedUserIds);
            updateCompletionStats(course);
            return toResponse(courseRepo.save(course), principal);
        }

        updateCompletionStats(course);
        return toResponse(courseRepo.save(course), principal);
    }

    public CourseResponse uncompleteCourse(String id, AuthPrincipal principal) {
        Course course = getById(id);
        List<String> completedUserIds = course.getCompletedUserIds() != null
                ? new ArrayList<>(course.getCompletedUserIds())
                : new ArrayList<>();

        if (completedUserIds.remove(principal.uid())) {
            course.setCompletedUserIds(completedUserIds);
            updateCompletionStats(course);
            return toResponse(courseRepo.save(course), principal);
        }

        updateCompletionStats(course);
        return toResponse(courseRepo.save(course), principal);
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

    public Map<String, String> uploadPdf(AuthPrincipal principal, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required");
        }

        String contentType = file.getContentType();
        String originalName = file.getOriginalFilename();
        boolean isPdfContentType = "application/pdf".equalsIgnoreCase(contentType);
        boolean isPdfFileName = originalName != null && originalName.toLowerCase(Locale.ROOT).endsWith(".pdf");
        if (!isPdfContentType && !isPdfFileName) {
            throw new IllegalArgumentException("Course document must be a PDF");
        }

        Path uploadDir = Paths.get("uploads", "course-pdfs").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);

        String fileName = principal.uid() + "-" + System.currentTimeMillis() + ".pdf";
        Path target = uploadDir.resolve(fileName).normalize();

        if (!target.getParent().equals(uploadDir)) {
            throw new IllegalArgumentException("Invalid file name");
        }

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return Map.of("pdfUrl", "/uploads/course-pdfs/" + fileName);
    }

    public CourseResponse addReview(String id, CourseReviewRequest request, AuthPrincipal principal) {
        Course course = getById(id);
        if (Boolean.FALSE.equals(course.getReviewsEnabled())) {
            throw new IllegalArgumentException("Reviews are disabled for this course");
        }
        if (principal.uid().equals(course.getAuthorId())) {
            throw new IllegalArgumentException("You cannot review your own course");
        }

        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Course.CourseReview> reviews = course.getReviews() != null
                ? new ArrayList<>(course.getReviews())
                : new ArrayList<>();

        boolean[] createdReview = {false};
        Course.CourseReview review = reviews.stream()
                .filter(existing -> principal.uid().equals(existing.getUserId()))
                .findFirst()
                .orElseGet(() -> {
                    Course.CourseReview nextReview = new Course.CourseReview();
                    nextReview.setId(UUID.randomUUID().toString());
                    nextReview.setUserId(principal.uid());
                    nextReview.setCreatedAt(Instant.now());
                    createdReview[0] = true;
                    reviews.add(nextReview);
                    return nextReview;
                });

        review.setUserDisplayName(user.getDisplayName());
        review.setUserAvatarUrl(user.getAvatarUrl());
        if (!createdReview[0] && review.getOriginalComment() == null && review.getOriginalRating() == null) {
            review.setOriginalRating(review.getRating());
            review.setOriginalComment(review.getComment());
        }
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        if (!createdReview[0]) {
            review.setEditedAt(Instant.now());
        }

        course.setReviews(reviews);
        updateReviewStats(course);
        return toResponse(courseRepo.save(course), principal);
    }

    public CourseResponse updateReview(String id, String reviewId, CourseReviewRequest request, AuthPrincipal principal) {
        Course course = getById(id);
        if (Boolean.FALSE.equals(course.getReviewsEnabled())) {
            throw new IllegalArgumentException("Reviews are disabled for this course");
        }
        Course.CourseReview review = findReview(course, reviewId);

        if (!principal.uid().equals(review.getUserId())) {
            throw new AccessDeniedException("You can only edit your own review");
        }

        if (review.getOriginalComment() == null && review.getOriginalRating() == null) {
            review.setOriginalRating(review.getRating());
            review.setOriginalComment(review.getComment());
        }
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        review.setEditedAt(Instant.now());

        updateReviewStats(course);
        return toResponse(courseRepo.save(course), principal);
    }

    public CourseResponse deleteReview(String id, String reviewId, AuthPrincipal principal) {
        Course course = getById(id);
        Course.CourseReview review = findReview(course, reviewId);

        boolean isReviewOwner = principal.uid().equals(review.getUserId());
        boolean isCourseOwner = principal.uid().equals(course.getAuthorId());
        if (!isReviewOwner && !isCourseOwner) {
            throw new AccessDeniedException("You can only delete your own review");
        }

        List<Course.CourseReview> reviews = course.getReviews() != null
                ? new ArrayList<>(course.getReviews())
                : new ArrayList<>();
        reviews.removeIf(existing -> reviewId.equals(existing.getId()));
        course.setReviews(reviews);

        updateReviewStats(course);
        return toResponse(courseRepo.save(course), principal);
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
        String articleContent = request.getArticleContent() != null
                ? request.getArticleContent().trim()
                : "";
        String pdfUrl = request.getPdfUrl() != null
                ? request.getPdfUrl().trim()
                : "";
        boolean hasVideo = !youtubeVideoId.isBlank();
        boolean hasArticle = !articleUrl.isBlank() || !articleContent.isBlank();
        boolean hasPdf = !pdfUrl.isBlank();

        if (!hasVideo && !hasArticle && !hasPdf) {
            throw new IllegalArgumentException("Course requires a YouTube video, article URL, written article, or PDF");
        }

        String contentType = normalizeContentType(request.getContentType(), hasVideo, hasArticle);

        if (contentType.equals("VIDEO") && !hasVideo) {
            throw new IllegalArgumentException("YouTube video is required for VIDEO courses");
        }
        if (contentType.equals("ARTICLE") && !hasArticle) {
            throw new IllegalArgumentException("Article URL or written article is required for ARTICLE courses");
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
        course.setArticleContent(contentType.equals("ARTICLE") ? articleContent : null);
        course.setPdfUrl(contentType.equals("PDF") ? pdfUrl : null);
        String thumbnailUrl = request.getThumbnailUrl() != null
                ? request.getThumbnailUrl().trim()
                : "";
        course.setThumbnailUrl(thumbnailUrl.isBlank() ? null : thumbnailUrl);
        course.setReviewsEnabled(request.getReviewsEnabled() == null || request.getReviewsEnabled());
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
        stats.setCompletionsCount(course.getCompletedUserIds() != null ? course.getCompletedUserIds().size() : 0);
        course.setStats(stats);
    }

    private void updateCompletionStats(Course course) {
        Course.CourseStats stats = course.getStats() != null ? course.getStats() : new Course.CourseStats();
        stats.setCompletionsCount(course.getCompletedUserIds() != null ? course.getCompletedUserIds().size() : 0);
        course.setStats(stats);
    }

    private Course.CourseReview findReview(Course course, String reviewId) {
        if (course.getReviews() == null) {
            throw new ResourceNotFoundException("Review not found");
        }

        return course.getReviews().stream()
                .filter(review -> reviewId.equals(review.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
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

    private CourseResponse toResponse(Course course, AuthPrincipal principal) {
        User author = userRepository.findByFirebaseUid(course.getAuthorId()).orElse(null);
        User.TrainerInfo trainer = author != null ? author.getTrainer() : null;
        boolean completedByCurrentUser = principal != null &&
                course.getCompletedUserIds() != null &&
                course.getCompletedUserIds().contains(principal.uid());

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
                .articleContent(course.getArticleContent())
                .pdfUrl(course.getPdfUrl())
                .thumbnailUrl(course.getThumbnailUrl())
                .reviewsEnabled(course.getReviewsEnabled() == null || course.getReviewsEnabled())
                .completedByCurrentUser(completedByCurrentUser)
                .publishedAt(course.getPublishedAt())
                .stats(course.getStats())
                .reviews(course.getReviews() != null ? course.getReviews() : List.of())
                .build();
    }

    private String normalizeStoredContentType(String contentType) {
        return contentType.equals("ARTICLE_LINK") ? "ARTICLE" : contentType;
    }

    private User getUser(AuthPrincipal principal) {
        return userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
