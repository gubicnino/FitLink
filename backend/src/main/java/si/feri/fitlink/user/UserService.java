package si.feri.fitlink.user;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;

    public User findOrCreateUser(String firebaseUid, String email, String displayName) {
        return userRepo.findByFirebaseUid(firebaseUid).orElseGet(() -> {
            User user = User.builder()
                    .firebaseUid(firebaseUid)
                    .email(email)
                    .displayName(displayName)
                    .role(Role.TRAINEE)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            return userRepo.save(user);
        });
    }

    public User getById(String id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public User getByFirebaseUid(String firebaseUid) {
        return userRepo.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public User updateProfile(String userId, User.UserProfile profile) {
        User user = getById(userId);
        user.setProfile(profile);
        user.setUpdatedAt(Instant.now());
        return userRepo.save(user);
    }

    public List<User> getTrainers() {
        return userRepo.findByRole(Role.TRAINER.name());
    }
}
