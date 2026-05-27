package si.feri.fitlink.course;

import java.util.List;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(value = "/thumbnail", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TRAINER')")
    public Map<String, String> uploadThumbnail(@AuthenticationPrincipal AuthPrincipal principal,
                                               @RequestParam("file") MultipartFile file) throws Exception {
        return courseService.uploadThumbnail(principal, file);
    }

    @PostMapping(value = "/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TRAINER')")
    public Map<String, String> uploadPdf(@AuthenticationPrincipal AuthPrincipal principal,
                                         @RequestParam("file") MultipartFile file) throws Exception {
        return courseService.uploadPdf(principal, file);
    }

    @PostMapping("/{id}/reviews")
    public CourseResponse addReview(@PathVariable String id,
                                    @Valid @RequestBody CourseReviewRequest request,
                                    @AuthenticationPrincipal AuthPrincipal principal) {
        return courseService.addReview(id, request, principal);
    }

    @PutMapping("/{id}/reviews/{reviewId}")
    public CourseResponse updateReview(@PathVariable String id,
                                       @PathVariable String reviewId,
                                       @Valid @RequestBody CourseReviewRequest request,
                                       @AuthenticationPrincipal AuthPrincipal principal) {
        return courseService.updateReview(id, reviewId, request, principal);
    }

    @DeleteMapping("/{id}/reviews/{reviewId}")
    public CourseResponse deleteReview(@PathVariable String id,
                                       @PathVariable String reviewId,
                                       @AuthenticationPrincipal AuthPrincipal principal) {
        return courseService.deleteReview(id, reviewId, principal);
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
