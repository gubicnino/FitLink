package si.feri.fitlink.user;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping("/trainers")
    public ResponseEntity<List<User>> getAllTrainers() {
        List<User> trainers = userService.getTrainers();
        return ResponseEntity.ok(trainers);
    }
}
