package si.feri.fitlink.course;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock private CourseRepository courseRepo;
    @Mock private UserRepository userRepository;

    @InjectMocks private CourseService service;

    private static final String COURSE_ID = "course-1";
    private static final String AUTHOR_UID = "author-uid";
    private static final String STUDENT_UID = "student-uid";
    private static final String OTHER_UID = "other-uid";

    private static final AuthPrincipal AUTHOR = new AuthPrincipal(AUTHOR_UID, "author@x.com", "TRAINER");
    private static final AuthPrincipal STUDENT = new AuthPrincipal(STUDENT_UID, "student@x.com", "TRAINEE");
    private static final AuthPrincipal OTHER = new AuthPrincipal(OTHER_UID, "other@x.com", "TRAINEE");

    // =====================================================================
    // create / update – content validation
    // =====================================================================

    @Nested
    @DisplayName("create / update – content validation")
    class ContentValidation {

        @Test
        @DisplayName("create with VIDEO keeps only the video, sets author, publish date and empty stats")
        void create_videoCourse_savesVideoOnlyWithDefaults() {
            stubSaveReturnsArgument();
            CourseRequest request = request("VIDEO", "abc123", "https://a.com", "text", "/x.pdf");

            Course saved = service.create(request, AUTHOR);

            assertThat(saved.getContentType()).isEqualTo("VIDEO");
            assertThat(saved.getYoutubeVideoId()).isEqualTo("abc123");
            assertThat(saved.getArticleUrl()).isNull();
            assertThat(saved.getArticleContent()).isNull();
            assertThat(saved.getPdfUrl()).isNull();
            assertThat(saved.getAuthorId()).isEqualTo(AUTHOR_UID);
            assertThat(saved.getPublishedAt()).isNotNull();
            assertThat(saved.getStats().getRatingsCount()).isZero();
            assertThat(saved.getStats().getAvgRating()).isZero();
            assertThat(saved.getStats().getCompletionsCount()).isZero();
            assertThat(saved.getReviews()).isEmpty();
            assertThat(saved.getCompletedUserIds()).isEmpty();
            assertThat(saved.getReviewsEnabled()).isTrue();
        }

        @ParameterizedTest(name = "video={0}, articleUrl={1}, articleText={2}, pdf={3} → {4}")
        @CsvSource({
            "abc,         ,              ,       , VIDEO",
            ",            https://a.com, ,       , ARTICLE",
            ",            ,              text,   , ARTICLE",
            ",            ,              ,       /x.pdf, PDF",
            "abc,         https://a.com, ,       /x.pdf, VIDEO",
            ",            https://a.com, ,       /x.pdf, ARTICLE",
        })
        @DisplayName("create without contentType picks VIDEO, then ARTICLE, then PDF")
        void create_missingContentType_defaultsByPriority(
                String video, String articleUrl, String articleText, String pdf, String expected) {
            stubSaveReturnsArgument();

            Course saved = service.create(request(null, video, articleUrl, articleText, pdf), AUTHOR);

            assertThat(saved.getContentType()).isEqualTo(expected);
        }

        @Test
        @DisplayName("create treats a blank contentType like a missing one")
        void create_blankContentType_defaults() {
            stubSaveReturnsArgument();

            Course saved = service.create(request("   ", null, null, null, "/x.pdf"), AUTHOR);

            assertThat(saved.getContentType()).isEqualTo("PDF");
        }

        @Test
        @DisplayName("create accepts contentType case-insensitively and trims it")
        void create_contentTypeCaseInsensitive_normalized() {
            stubSaveReturnsArgument();

            Course saved = service.create(request("  video ", "abc", null, null, null), AUTHOR);

            assertThat(saved.getContentType()).isEqualTo("VIDEO");
        }

        @Test
        @DisplayName("create maps the legacy ARTICLE_LINK type to ARTICLE")
        void create_articleLinkAlias_mappedToArticle() {
            stubSaveReturnsArgument();

            Course saved = service.create(request("ARTICLE_LINK", null, "https://a.com", null, null), AUTHOR);

            assertThat(saved.getContentType()).isEqualTo("ARTICLE");
            assertThat(saved.getArticleUrl()).isEqualTo("https://a.com");
        }

        @Test
        @DisplayName("create trims content fields and stores a blank thumbnail as null")
        void create_whitespaceFields_trimmed() {
            stubSaveReturnsArgument();
            CourseRequest request = request("VIDEO", "  abc  ", null, null, null);
            request.setThumbnailUrl("   ");

            Course saved = service.create(request, AUTHOR);

            assertThat(saved.getYoutubeVideoId()).isEqualTo("abc");
            assertThat(saved.getThumbnailUrl()).isNull();
        }

        @Test
        @DisplayName("create keeps reviews disabled when the author disables them")
        void create_reviewsDisabled_kept() {
            stubSaveReturnsArgument();
            CourseRequest request = request("VIDEO", "abc", null, null, null);
            request.setReviewsEnabled(false);

            assertThat(service.create(request, AUTHOR).getReviewsEnabled()).isFalse();
        }

        @ParameterizedTest(name = "video=''{0}'', articleUrl=''{1}'', articleText=''{2}'', pdf=''{3}''")
        @CsvSource(value = {
            "NULL, NULL, NULL, NULL",
            "'', '', '', ''",
            "'   ', '  ', '   ', ' '",
        }, nullValues = "NULL")
        @DisplayName("create without any content throws IllegalArgumentException and saves nothing")
        void create_noContent_throws(String video, String articleUrl, String articleText, String pdf) {
            CourseRequest request = request(null, video, articleUrl, articleText, pdf);

            assertThatThrownBy(() -> service.create(request, AUTHOR))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("create with an unknown contentType throws IllegalArgumentException")
        void create_unknownContentType_throws() {
            CourseRequest request = request("PODCAST", "abc", null, null, null);

            assertThatThrownBy(() -> service.create(request, AUTHOR))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @ParameterizedTest(name = "{0} with video={1}, articleUrl={2}, pdf={3}")
        @CsvSource({
            "VIDEO,   ,    https://a.com, /x.pdf",
            "ARTICLE, abc, ,              /x.pdf",
            "PDF,     abc, https://a.com, ",
        })
        @DisplayName("create throws when the chosen contentType has no matching content")
        void create_typeWithoutMatchingContent_throws(String type, String video, String articleUrl, String pdf) {
            CourseRequest request = request(type, video, articleUrl, null, pdf);

            assertThatThrownBy(() -> service.create(request, AUTHOR))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("update by the owner switches type and clears content of the previous type")
        void update_switchToPdf_clearsPreviousContent() {
            Course existing = course();
            existing.setContentType("VIDEO");
            existing.setYoutubeVideoId("old-video");
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(existing));
            stubSaveReturnsArgument();

            Course saved = service.update(COURSE_ID, request("PDF", "old-video", null, null, "/new.pdf"), AUTHOR);

            assertThat(saved.getContentType()).isEqualTo("PDF");
            assertThat(saved.getPdfUrl()).isEqualTo("/new.pdf");
            assertThat(saved.getYoutubeVideoId()).isNull();
            assertThat(saved.getAuthorId()).isEqualTo(AUTHOR_UID);
        }

        @Test
        @DisplayName("update by a non-owner throws ResourceNotFound (course is hidden) and saves nothing")
        void update_nonOwner_throwsNotFound() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course()));

            assertThatThrownBy(() -> service.update(COURSE_ID, request("VIDEO", "abc", null, null, null), OTHER))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("update of a missing course throws ResourceNotFound")
        void update_missingCourse_throwsNotFound() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(COURSE_ID, request("VIDEO", "abc", null, null, null), AUTHOR))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =====================================================================
    // reviews
    // =====================================================================

    @Nested
    @DisplayName("reviews")
    class Reviews {

        @Test
        @DisplayName("addReview stores a new unpinned review with trimmed comment and author data")
        void addReview_valid_storesReview() {
            Course course = course();
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            stubUsers();
            stubSaveReturnsArgument();

            CourseResponse response = service.addReview(COURSE_ID, reviewRequest(5, "  Great course  "), STUDENT);

            assertThat(response.getReviews()).hasSize(1);
            Course.CourseReview review = response.getReviews().get(0);
            assertThat(review.getId()).isNotBlank();
            assertThat(review.getUserId()).isEqualTo(STUDENT_UID);
            assertThat(review.getUserDisplayName()).isEqualTo("Student");
            assertThat(review.getRating()).isEqualTo(5);
            assertThat(review.getComment()).isEqualTo("Great course");
            assertThat(review.getPinned()).isFalse();
            assertThat(review.getReplies()).isEmpty();
            assertThat(review.getCreatedAt()).isNotNull();
            assertThat(response.getStats().getRatingsCount()).isEqualTo(1);
            assertThat(response.getStats().getAvgRating()).isEqualTo(5.0);
            verify(courseRepo).save(course);
        }

        @Test
        @DisplayName("addReview recalculates the average as the arithmetic mean of all ratings")
        void addReview_secondReview_averageIsMean() {
            Course course = course();
            course.getReviews().add(review("r1", OTHER_UID, 4, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            stubUsers();
            stubSaveReturnsArgument();

            CourseResponse response = service.addReview(COURSE_ID, reviewRequest(5, "ok"), STUDENT);

            assertThat(response.getStats().getRatingsCount()).isEqualTo(2);
            assertThat(response.getStats().getAvgRating()).isCloseTo(4.5, within(1e-9));
        }

        @Test
        @DisplayName("addReview is allowed when reviewsEnabled is not set (default = enabled)")
        void addReview_reviewsEnabledNull_allowed() {
            Course course = course();
            course.setReviewsEnabled(null);
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            stubUsers();
            stubSaveReturnsArgument();

            assertThat(service.addReview(COURSE_ID, reviewRequest(3, "fine"), STUDENT).getReviews()).hasSize(1);
        }

        @Test
        @DisplayName("addReview on a course with reviews disabled throws IllegalArgumentException")
        void addReview_reviewsDisabled_throws() {
            Course course = course();
            course.setReviewsEnabled(false);
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> service.addReview(COURSE_ID, reviewRequest(5, "x"), STUDENT))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("addReview by the course author throws IllegalArgumentException")
        void addReview_ownCourse_throws() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course()));

            assertThatThrownBy(() -> service.addReview(COURSE_ID, reviewRequest(5, "mine"), AUTHOR))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("addReview by an unknown user throws ResourceNotFound")
        void addReview_unknownUser_throws() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course()));
            when(userRepository.findByFirebaseUid(STUDENT_UID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.addReview(COURSE_ID, reviewRequest(5, "x"), STUDENT))
                .isInstanceOf(ResourceNotFoundException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("addReview on a missing course throws ResourceNotFound")
        void addReview_missingCourse_throws() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.addReview(COURSE_ID, reviewRequest(5, "x"), STUDENT))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("updateReview keeps the very first original and recalculates the average")
        void updateReview_twice_keepsFirstOriginal() {
            Course course = course();
            course.getReviews().add(review("r1", STUDENT_UID, 2, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            when(userRepository.findByFirebaseUid(AUTHOR_UID)).thenReturn(Optional.empty());
            stubSaveReturnsArgument();

            service.updateReview(COURSE_ID, "r1", reviewRequest(4, " better "), STUDENT);
            CourseResponse response = service.updateReview(COURSE_ID, "r1", reviewRequest(5, "best"), STUDENT);

            Course.CourseReview review = response.getReviews().get(0);
            assertThat(review.getRating()).isEqualTo(5);
            assertThat(review.getComment()).isEqualTo("best");
            assertThat(review.getOriginalRating()).isEqualTo(2);
            assertThat(review.getOriginalComment()).isEqualTo("comment-r1");
            assertThat(review.getEditedAt()).isNotNull();
            assertThat(response.getStats().getAvgRating()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("updateReview of someone else's review throws AccessDenied and changes nothing")
        void updateReview_notOwner_throws() {
            Course course = course();
            Course.CourseReview review = review("r1", STUDENT_UID, 2, Instant.now(), false);
            course.getReviews().add(review);
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> service.updateReview(COURSE_ID, "r1", reviewRequest(5, "hack"), OTHER))
                .isInstanceOf(AccessDeniedException.class);
            assertThat(review.getRating()).isEqualTo(2);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("updateReview on a course with reviews disabled throws IllegalArgumentException")
        void updateReview_reviewsDisabled_throws() {
            Course course = course();
            course.setReviewsEnabled(false);
            course.getReviews().add(review("r1", STUDENT_UID, 2, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> service.updateReview(COURSE_ID, "r1", reviewRequest(5, "x"), STUDENT))
                .isInstanceOf(IllegalArgumentException.class);
            verify(courseRepo, never()).save(any());
        }

        @Test
        @DisplayName("updateReview of an unknown review throws ResourceNotFound")
        void updateReview_unknownReview_throws() {
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course()));

            assertThatThrownBy(() -> service.updateReview(COURSE_ID, "nope", reviewRequest(5, "x"), STUDENT))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @ParameterizedTest(name = "deleted by {0}")
        @CsvSource({"review-owner", "course-owner"})
        @DisplayName("deleteReview is allowed for the review owner and for the course owner, stats are recalculated")
        void deleteReview_allowedCaller_removesAndRecalculates(String caller) {
            Course course = course();
            course.getReviews().add(review("r1", STUDENT_UID, 1, Instant.now(), false));
            course.getReviews().add(review("r2", OTHER_UID, 5, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            when(userRepository.findByFirebaseUid(AUTHOR_UID)).thenReturn(Optional.empty());
            stubSaveReturnsArgument();
            AuthPrincipal principal = caller.equals("review-owner") ? STUDENT : AUTHOR;

            CourseResponse response = service.deleteReview(COURSE_ID, "r1", principal);

            assertThat(response.getReviews()).extracting(Course.CourseReview::getId).containsExactly("r2");
            assertThat(response.getStats().getRatingsCount()).isEqualTo(1);
            assertThat(response.getStats().getAvgRating()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("deleteReview of the last review resets the average to 0")
        void deleteReview_lastReview_averageZero() {
            Course course = course();
            course.getReviews().add(review("r1", STUDENT_UID, 4, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));
            when(userRepository.findByFirebaseUid(AUTHOR_UID)).thenReturn(Optional.empty());
            stubSaveReturnsArgument();

            CourseResponse response = service.deleteReview(COURSE_ID, "r1", STUDENT);

            assertThat(response.getStats().getRatingsCount()).isZero();
            assertThat(response.getStats().getAvgRating()).isZero();
        }

        @Test
        @DisplayName("deleteReview by a third party throws AccessDenied and keeps the review")
        void deleteReview_stranger_throws() {
            Course course = course();
            course.getReviews().add(review("r1", STUDENT_UID, 4, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> service.deleteReview(COURSE_ID, "r1", OTHER))
                .isInstanceOf(AccessDeniedException.class);
            assertThat(course.getReviews()).hasSize(1);
            verify(courseRepo, never()).save(any());
        }
    }

    // =====================================================================
    // response mapping – review order and stored content type
    // =====================================================================

    @Nested
    @DisplayName("getResponseById – review order and mapping")
    class ResponseMapping {

        @Test
        @DisplayName("reviews are ordered: pinned first, then newest first, reviews without date last")
        void getResponse_reviews_pinnedThenNewestThenUndated() {
            Instant now = Instant.now();
            Course course = course();
            course.getReviews().addAll(List.of(
                review("old", OTHER_UID, 3, now.minus(5, ChronoUnit.DAYS), false),
                review("undated", OTHER_UID, 3, null, false),
                review("pinned-old", OTHER_UID, 3, now.minus(10, ChronoUnit.DAYS), true),
                review("new", OTHER_UID, 3, now, false),
                review("pinned-new", OTHER_UID, 3, now.minus(1, ChronoUnit.DAYS), true)));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            CourseResponse response = service.getResponseById(COURSE_ID, STUDENT);

            assertThat(response.getReviews()).extracting(Course.CourseReview::getId)
                .containsExactly("pinned-new", "pinned-old", "new", "old", "undated");
        }

        @Test
        @DisplayName("reviews are hidden in the response when reviews are disabled")
        void getResponse_reviewsDisabled_hidesReviews() {
            Course course = course();
            course.setReviewsEnabled(false);
            course.getReviews().add(review("r1", OTHER_UID, 3, Instant.now(), false));
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            CourseResponse response = service.getResponseById(COURSE_ID, STUDENT);

            assertThat(response.getReviewsEnabled()).isFalse();
            assertThat(response.getReviews()).isEmpty();
        }

        @ParameterizedTest(name = "stored {0} → {1}")
        @CsvSource(value = {"ARTICLE_LINK, ARTICLE", "NULL, VIDEO", "PDF, PDF"}, nullValues = "NULL")
        @DisplayName("stored legacy/missing content types are normalized in the response")
        void getResponse_storedContentType_normalized(String stored, String expected) {
            Course course = course();
            course.setContentType(stored);
            when(courseRepo.findById(COURSE_ID)).thenReturn(Optional.of(course));

            assertThat(service.getResponseById(COURSE_ID, STUDENT).getContentType()).isEqualTo(expected);
        }
    }

    // ---------- helpers ----------

    private void stubSaveReturnsArgument() {
        when(courseRepo.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubUsers() {
        User student = User.builder().firebaseUid(STUDENT_UID).displayName("Student").build();
        when(userRepository.findByFirebaseUid(STUDENT_UID)).thenReturn(Optional.of(student));
        when(userRepository.findByFirebaseUid(AUTHOR_UID)).thenReturn(Optional.empty());
    }

    private static CourseRequest request(String type, String video, String articleUrl, String articleText, String pdf) {
        CourseRequest r = new CourseRequest();
        r.setTitle("Squat 101");
        r.setDescription("How to squat");
        r.setCategory("Strength");
        r.setLevel("BEGINNER");
        r.setContentType(type);
        r.setYoutubeVideoId(video);
        r.setArticleUrl(articleUrl);
        r.setArticleContent(articleText);
        r.setPdfUrl(pdf);
        return r;
    }

    private static CourseReviewRequest reviewRequest(int rating, String comment) {
        CourseReviewRequest r = new CourseReviewRequest();
        r.setRating(rating);
        r.setComment(comment);
        return r;
    }

    private static Course course() {
        return Course.builder()
            .id(COURSE_ID)
            .authorId(AUTHOR_UID)
            .title("Squat 101")
            .contentType("VIDEO")
            .youtubeVideoId("abc")
            .reviewsEnabled(true)
            .reviews(new ArrayList<>())
            .completedUserIds(new ArrayList<>())
            .build();
    }

    private static Course.CourseReview review(String id, String userId, int rating, Instant createdAt, boolean pinned) {
        return Course.CourseReview.builder()
            .id(id)
            .userId(userId)
            .rating(rating)
            .comment("comment-" + id)
            .createdAt(createdAt)
            .pinned(pinned)
            .replies(new ArrayList<>())
            .build();
    }
}
