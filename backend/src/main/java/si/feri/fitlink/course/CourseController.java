package si.feri.fitlink.course;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Validated
public class CourseController {

    private final CourseService courseService;

    @PostMapping
    @PreAuthorize("hasRole('TRAINER')")
    public CourseResponse createCourse(@Valid @RequestBody CourseRequest request,
                                       @AuthenticationPrincipal AuthPrincipal principal) {
        return courseService.getResponseById(courseService.create(request, principal).getId());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TRAINER')")
    public CourseResponse updateCourse(@PathVariable String id,
                                       @Valid @RequestBody CourseRequest request,
                                       @AuthenticationPrincipal AuthPrincipal principal) {
        return courseService.getResponseById(courseService.update(id, request, principal).getId());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TRAINER')")
    public void deleteCourse(@PathVariable String id,
                             @AuthenticationPrincipal AuthPrincipal principal) {
        courseService.delete(id, principal);
    }

    @GetMapping
    public List<CourseResponse> getAllCourses() {
        return courseService.getAllResponses();
    }

    @GetMapping("/{id}")
    public CourseResponse getCourse(@PathVariable String id) {
        return courseService.getResponseById(id);
    }
}
