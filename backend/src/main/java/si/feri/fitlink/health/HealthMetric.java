package si.feri.fitlink.health;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "healthMetrics")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HealthMetric {
    @Id private String id;
    private String userId;
    private LocalDate date;
    private String source; // GARMIN, HEALTH_CONNECT, MANUAL
    private Metrics metrics;
    private Instant syncedAt;

    @Data
    public static class Metrics {
        private Integer steps;
        private Integer caloriesBurned;
        private Integer heartRateAvg;
        private Integer heartRateMax;
        private Double sleepHours;
        private Double weightKg;
        private Double vo2max;
    }
}