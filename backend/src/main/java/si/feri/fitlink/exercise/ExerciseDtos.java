package si.feri.fitlink.exercise;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;


public final class ExerciseDtos {

    private ExerciseDtos() {}

    /**
     * Osnovni URL za slike. Seed dataset (yuhonas/free-exercise-db, javna domena)
     * shrani vsak Exercise.images vnos kak relativno pot, npr. "3_4_Sit-Up/1.jpg".
     * Datoteke slik so hostanee na GitHub CDN-ju tega projekta.
     *
     * Ko/če bomo migrirali na svoj storage (gučali smo si o S3 maybe), sprememba
     * te konstante prepiše vse URL-je, ki jih API vrača.
     */

    private static final String IMAGE_BASE =
            "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

    private static String toFullUrl(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) return null;
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
            return pathOrUrl;
        }
        return IMAGE_BASE + pathOrUrl;
    }

    private static List<String> toFullUrls(List<String> paths) {
        if (paths == null) return List.of();
        return paths.stream().map(ExerciseDtos::toFullUrl).filter(java.util.Objects::nonNull).toList();
    }

    /** FULL DETAIL (GET /api/exercises/{id}). */
    public record ExerciseResponse(
            String id,
            String name,
            String force,
            String level,
            String mechanic,
            String equipment,
            List<String> primaryMuscles,
            List<String> secondaryMuscles,
            List<String> instructions,
            String category,
            List<String> images
    ) {
        public static ExerciseResponse from(Exercise e) {
            return new ExerciseResponse(
                    e.getId(),
                    e.getName(),
                    e.getForce(),
                    e.getLevel(),
                    e.getMechanic(),
                    e.getEquipment(),
                    e.getPrimaryMuscles(),
                    e.getSecondaryMuscles(),
                    e.getInstructions(),
                    e.getCategory(),
                    toFullUrls(e.getImages())
            );
        }
    }

    public record ExerciseSummary(
            String id,
            String name,
            String category,
            String level,
            String equipment,
            List<String> primaryMuscles,
            String thumbnailUrl
    ) {
        public static ExerciseSummary from(Exercise e) {
            // za thumbnail mamo drugo sliko, seppravi sliko končne pozicije ker je bole descriptive.
            List<String> imgs = e.getImages();
            String rawThumb = null;
            if (imgs != null && !imgs.isEmpty()) {
                rawThumb = imgs.size() > 1 ? imgs.get(1) : imgs.get(0);
            }
            return new ExerciseSummary(
                    e.getId(),
                    e.getName(),
                    e.getCategory(),
                    e.getLevel(),
                    e.getEquipment(),
                    e.getPrimaryMuscles(),
                    toFullUrl(rawThumb)
            );
        }
    }

    public record PageResponse<T>(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean last
    ) {
        public static <S, T> PageResponse<T> of(Page<S> source, Function<S, T> mapper) {
            return new PageResponse<>(
                    source.getContent().stream().map(mapper).toList(),
                    source.getNumber(),
                    source.getSize(),
                    source.getTotalElements(),
                    source.getTotalPages(),
                    source.isLast()
            );
        }
    }
}
