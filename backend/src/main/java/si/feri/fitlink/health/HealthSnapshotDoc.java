package si.feri.fitlink.health;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Document(collection = "healthSnapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthSnapshotDoc {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;
    private Instant uploadedAt;
    private int stepsToday;
    private double activeCaloriesToday;
    private double totalCaloriesToday;
    private double distanceMetersToday;
    private int floorsToday;
    private List<DailyValue> steps7d;
    private Double latestWeightKg;
    private Instant latestWeightAt;
    private List<WeightPoint> weightTrend;
    private Double bodyFatPercent;
    private Double heightCm;
    private Double bmrKcal;
    private Integer latestHeartRateBpm;
    private Instant latestHeartRateAt;
    private Integer restingHeartRate;
    private Integer lastSleepMinutes;
    private Instant lastSleepEndedAt;
    private Integer avgSleepMinutes7d;
    private Double vo2Max;
    private Double oxygenSaturation;
    private Double respiratoryRate;
    private Double bodyTemperatureC;
    private Double bloodPressureSystolic;
    private Double bloodPressureDiastolic;
    private double hydrationMlToday;
    private List<ExerciseSummary> recentExercises;
    private Map<String, Object> extra;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyValue {
        private String date;
        private double value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeightPoint {
        private Instant at;
        private double kg;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExerciseSummary {
        private Instant startAt;
        private Instant endAt;
        private int durationMinutes;
        private String title;
        private Integer exerciseType;
    }
}
