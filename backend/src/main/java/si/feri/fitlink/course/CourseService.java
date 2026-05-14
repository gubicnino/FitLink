package si.feri.fitlink.course;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;

    public Course create(Course course) {
        course.setPublishedAt(Instant.now());
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
}
