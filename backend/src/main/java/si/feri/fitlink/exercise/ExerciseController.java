package si.feri.fitlink.exercise;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.exercise.ExerciseDtos.ExerciseResponse;
import si.feri.fitlink.exercise.ExerciseDtos.ExerciseSummary;
import si.feri.fitlink.exercise.ExerciseDtos.PageResponse;

/**
 * Exercise library REST API.
 *
 * Auth: all endpoints require a valid Firebase ID token (LOGIČNO)
 *
 *  GET  /api/exercises          paginated list (filters: category, level, muscle, q)
 *  GET  /api/exercises/{id}          single exercise (full detail)
 *  GET  /api/exercises/facets     distinct categories + levels for picker UI
 */

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public PageResponse<ExerciseSummary> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String muscle,
            @RequestParam(name = "q", required = false) String nameQuery,
            @PageableDefault(size = 50, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<Exercise> page = exerciseService.search(category, level, muscle, nameQuery, pageable);
        return PageResponse.of(page, ExerciseSummary::from);
    }

    @GetMapping("/{id}")
    public ExerciseResponse getById(@PathVariable String id) {
        return ExerciseResponse.from(exerciseService.getById(id));
    }

    @GetMapping("/facets")
    public Map<String, List<String>> facets() {
        return Map.of(
                "categories", exerciseService.distinctCategories(),
                "levels", exerciseService.distinctLevels(),
                "muscles", exerciseService.distinctMuscles()
        );
    }
}
