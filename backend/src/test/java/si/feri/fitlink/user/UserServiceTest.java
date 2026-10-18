package si.feri.fitlink.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import si.feri.fitlink.common.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepo;

    @InjectMocks private UserService service;

    private static final String UID = "firebase-uid-1";

    @Test
    @DisplayName("findOrCreateUser returns existing user without saving when one exists")
    void findOrCreateUser_existing_returnsIt() {
        User existing = User.builder()
            .id("user-1")
            .firebaseUid(UID)
            .email("a@b.c")
            .role(Role.TRAINER)
            .build();
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.of(existing));

        User result = service.findOrCreateUser(UID, "new@b.c", "Alice");

        assertThat(result).isSameAs(existing);
        // existing data (incl. elevated role) must not be overwritten by token data
        assertThat(result.getRole()).isEqualTo(Role.TRAINER);
        assertThat(result.getEmail()).isEqualTo("a@b.c");
        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("findOrCreateUser creates and saves a TRAINEE when none exists")
    void findOrCreateUser_missing_creates() {
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = service.findOrCreateUser(UID, "a@b.c", "Alice");

        assertThat(result.getFirebaseUid()).isEqualTo(UID);
        assertThat(result.getEmail()).isEqualTo("a@b.c");
        assertThat(result.getDisplayName()).isEqualTo("Alice");
        assertThat(result.getRole()).isEqualTo(Role.TRAINEE);
        assertThat(result.getCreatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
        verify(userRepo).save(result);
    }

    @Test
    @DisplayName("getById throws ResourceNotFound when missing")
    void getById_missing_throws() {
        when(userRepo.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById("missing"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getByFirebaseUid throws ResourceNotFound when missing")
    void getByFirebaseUid_missing_throws() {
        when(userRepo.findByFirebaseUid("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByFirebaseUid("nope"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateProfile replaces the profile, bumps updatedAt and persists the user")
    void updateProfile_setsProfile() {
        User user = User.builder().id("user-1").firebaseUid(UID).role(Role.TRAINEE).build();
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        User.UserProfile newProfile = new User.UserProfile();
        newProfile.setHeightCm(180.0);

        User result = service.updateProfile("user-1", newProfile);

        assertThat(result.getProfile()).isSameAs(newProfile);
        assertThat(result.getUpdatedAt()).isNotNull();
        assertThat(result.getRole()).isEqualTo(Role.TRAINEE);
        verify(userRepo).save(user);
    }

    @Test
    @DisplayName("updateProfile for unknown user throws and saves nothing")
    void updateProfile_missing_throws() {
        when(userRepo.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateProfile("missing", new User.UserProfile()))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("getTrainers queries users with the TRAINER role")
    void getTrainers_queriesTrainerRole() {
        User trainer = User.builder().id("t1").firebaseUid("t").role(Role.TRAINER).build();
        when(userRepo.findByRole(Role.TRAINER.name())).thenReturn(List.of(trainer));

        assertThat(service.getTrainers()).containsExactly(trainer);
    }

    @Test
    @DisplayName("setFcmToken stores the token on the user and persists it")
    void setFcmToken_stores() {
        User user = User.builder().id("user-1").firebaseUid(UID).role(Role.TRAINEE).build();
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.of(user));

        service.setFcmToken(UID, "fcm-token-abc");

        assertThat(user.getFcmToken()).isEqualTo("fcm-token-abc");
        assertThat(user.getUpdatedAt()).isNotNull();
        verify(userRepo).save(user);
    }

    @Test
    @DisplayName("setExpoPushToken stores the Expo token on the user and persists it")
    void setExpoPushToken_stores() {
        User user = User.builder().id("user-1").firebaseUid(UID).role(Role.TRAINEE).build();
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.of(user));

        service.setExpoPushToken(UID, "ExponentPushToken[xyz]");

        assertThat(user.getExpoPushToken()).isEqualTo("ExponentPushToken[xyz]");
        assertThat(user.getFcmToken()).isNull();
        verify(userRepo).save(user);
    }

    @Test
    @DisplayName("setFcmToken for unknown user throws and saves nothing")
    void setFcmToken_missingUser_throws() {
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setFcmToken(UID, "tok"))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("clearFcmToken removes both FCM and Expo push tokens (logout) and persists")
    void clearFcmToken_clearsAllPushTokens() {
        User user = User.builder()
            .id("user-1")
            .firebaseUid(UID)
            .role(Role.TRAINEE)
            .fcmToken("some-token")
            .expoPushToken("ExponentPushToken[xyz]")
            .build();
        when(userRepo.findByFirebaseUid(UID)).thenReturn(Optional.of(user));

        service.clearFcmToken(UID);

        assertThat(user.getFcmToken()).isNull();
        assertThat(user.getExpoPushToken()).isNull();
        verify(userRepo).save(user);
    }
}
