package si.feri.fitlink.testing;

import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final MongoTemplate mongoTemplate;

    @GetMapping("/health")
    public String health() {
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            return "MongoDB connected OK";
        } catch (Exception e) {
            return "MongoDB FAILED: " + e.getMessage();
        }
    }
}