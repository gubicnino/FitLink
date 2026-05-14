package si.feri.fitlink.health;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HealthMetricService {

    private final HealthMetricRepository healthMetricRepo;

    public HealthMetric logMetric(String userId, HealthMetric incoming) {
        HealthMetric metric = healthMetricRepo.findByUserIdAndDate(userId, incoming.getDate())
                .orElse(HealthMetric.builder()
                        .userId(userId)
                        .date(incoming.getDate())
                        .build());
        metric.setSource(incoming.getSource());
        metric.setMetrics(incoming.getMetrics());
        metric.setSyncedAt(Instant.now());
        return healthMetricRepo.save(metric);
    }

    public List<HealthMetric> getMetrics(String userId, LocalDate from, LocalDate to) {
        return healthMetricRepo.findByUserIdAndDateBetween(userId, from, to);
    }

    public HealthMetric getMetricForDate(String userId, LocalDate date) {
        return healthMetricRepo.findByUserIdAndDate(userId, date)
                .orElseThrow(() -> new ResourceNotFoundException("HealthMetric not found for date " + date));
    }
}
