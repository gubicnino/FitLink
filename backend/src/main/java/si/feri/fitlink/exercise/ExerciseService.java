package si.feri.fitlink.exercise;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseRepository repo;
    private final MongoTemplate mongo;

    public Exercise getById(String id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found: " + id));
    }

    /**
     * Iskanje vaj z več filtri.
     *
     * Vsi filtri: opcijski in se kombinerajoo z AND. 
     * Prazni/null filtri se iignorerajo. Iskanje po imenu se izvede case-insensitive
     *
     * Paginacija + sortiranje pride z {@link Pageable}, ki ga poda kontroler.
     */

    public Page<Exercise> search(
            String category,
            String level,
            String muscle,
            String nameQuery,
            Pageable pageable
    ) {
        List<Criteria> filters = new ArrayList<>();
        if (notBlank(category)) {
            filters.add(Criteria.where("category").is(category.trim()));
        }
        if (notBlank(level)) {
            filters.add(Criteria.where("level").is(level.trim()));
        }
        if (notBlank(muscle)) {
            filters.add(Criteria.where("primaryMuscles").in(muscle.trim()));
        }
        if (notBlank(nameQuery)) {
            String escaped = Pattern.quote(nameQuery.trim());
            filters.add(Criteria.where("name").regex(escaped, "i"));
        }

        Query query = new Query();
        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }

        long total = mongo.count(query, Exercise.class);
        query.with(pageable);
        List<Exercise> content = mongo.find(query, Exercise.class);
        return new PageImpl<>(content, pageable, total);
    }

    public List<String> distinctCategories() {
        return mongo.findDistinct("category", Exercise.class, String.class);
    }

    public List<String> distinctLevels() {
        return mongo.findDistinct("level", Exercise.class, String.class);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
