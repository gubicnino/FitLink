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
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setCategory(request.getCategory());
        course.setLevel(request.getLevel());
        course.setYoutubeVideoId(request.getYoutubeVideoId());
        course.setThumbnailUrl(request.getThumbnailUrl());
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
                .youtubeVideoId(course.getYoutubeVideoId())
                .thumbnailUrl(course.getThumbnailUrl())
                .publishedAt(course.getPublishedAt())
                .stats(course.getStats())
                .build();
    }
}
