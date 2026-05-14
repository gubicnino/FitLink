package si.feri.fitlink.course;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends MongoRepository<Course, String> {
    List<Course> findByCategoryAndLevel(String category, String level);
    List<Course> findByTitleContainingIgnoreCase(String title);
    List<Course> findByAuthorId(String authorId);
}
