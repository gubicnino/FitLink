package si.feri.fitlink.user;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        User user = userService.getById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/firebase/{firebaseUid}")
    public ResponseEntity<User> getUserByFirebaseUid(@PathVariable String firebaseUid) {
        User user = userService.getByFirebaseUid(firebaseUid);
        return ResponseEntity.ok(user);
    }
}
