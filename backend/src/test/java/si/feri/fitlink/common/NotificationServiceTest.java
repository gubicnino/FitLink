package si.feri.fitlink.common;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.user.Role;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private FcmPushService fcm;
    @Mock private UserRepository userRepo;

    @InjectMocks private NotificationService service;

    // ---------- notifyCoachingRequest ----------

    @Test
    @DisplayName("notifyCoachingRequest sends FCM to the trainer with trainee display name")
    void notifyCoachingRequest_usesTraineeName() {
        Coaching coaching = Coaching.builder()
            .id("c1")
            .trainerId("trainer-uid")
            .traineeId("trainee-uid")
            .build();
        User trainee = User.builder()
            .firebaseUid("trainee-uid")
            .displayName("Alice")
            .role(Role.TRAINEE)
            .build();
        when(userRepo.findByFirebaseUid("trainee-uid")).thenReturn(Optional.of(trainee));

        service.notifyCoachingRequest(coaching);

        verify(fcm).sendToUser(
            eq("trainer-uid"),
            eq("New coaching request"),
            contains("Alice"),
            anyMap());
    }

    @Test
    @DisplayName("notifyCoachingRequest falls back to default name when trainee has no display name")
    void notifyCoachingRequest_fallbackName() {
        Coaching coaching = Coaching.builder()
            .id("c1")
            .trainerId("trainer-uid")
            .traineeId("trainee-uid")
            .build();
        when(userRepo.findByFirebaseUid("trainee-uid")).thenReturn(Optional.empty());

        service.notifyCoachingRequest(coaching);

        verify(fcm).sendToUser(
            eq("trainer-uid"),
            eq("New coaching request"),
            contains("A new trainee"),
            anyMap());
    }

    @Test
    @DisplayName("notifyCoachingRequest no-ops when coaching is null")
    void notifyCoachingRequest_null_noop() {
        service.notifyCoachingRequest(null);
        verify(fcm, never()).sendToUser(any(), any(), any(), any());
    }

    @Test
    @DisplayName("notifyCoachingRequest no-ops when trainer id is null")
    void notifyCoachingRequest_nullTrainer_noop() {
        Coaching coaching = Coaching.builder().id("c1").build();
        service.notifyCoachingRequest(coaching);
        verify(fcm, never()).sendToUser(any(), any(), any(), any());
    }

    // ---------- notifyCoachingAccepted ----------

    @Test
    @DisplayName("notifyCoachingAccepted sends FCM to the trainee with trainer name")
    void notifyCoachingAccepted_usesTrainerName() {
        Coaching coaching = Coaching.builder()
            .id("c1")
            .trainerId("trainer-uid")
            .traineeId("trainee-uid")
            .build();
        User trainer = User.builder()
            .firebaseUid("trainer-uid")
            .displayName("Coach Carter")
            .role(Role.TRAINER)
            .build();
        when(userRepo.findByFirebaseUid("trainer-uid")).thenReturn(Optional.of(trainer));

        service.notifyCoachingAccepted(coaching);

        verify(fcm).sendToUser(
            eq("trainee-uid"),
            eq("Coaching accepted"),
            contains("Coach Carter"),
            anyMap());
    }

    @Test
    @DisplayName("notifyCoachingAccepted no-ops when trainee id is null")
    void notifyCoachingAccepted_nullTrainee_noop() {
        Coaching coaching = Coaching.builder().id("c1").trainerId("t").build();
        service.notifyCoachingAccepted(coaching);
        verify(fcm, never()).sendToUser(any(), any(), any(), any());
    }

    // ---------- notifyChatMessage ----------

    @Test
    @DisplayName("notifyChatMessage uses sender name as title and preview as body")
    void notifyChatMessage_normalCase() {
        service.notifyChatMessage("recipient", "Bob", "Hey there", "conv-1");

        ArgumentCaptor<Map<String, String>> dataCaptor = dataCaptor();
        verify(fcm).sendToUser(
            eq("recipient"),
            eq("Bob"),
            eq("Hey there"),
            dataCaptor.capture());
        Map<String, String> data = dataCaptor.getValue();
        assertions(data, "chat", "chat_message", "conv-1", null);
    }

    @Test
    @DisplayName("notifyChatMessage falls back to defaults when sender/preview missing")
    void notifyChatMessage_nullsFallback() {
        service.notifyChatMessage("recipient", null, null, "conv-1");

        verify(fcm).sendToUser(
            eq("recipient"),
            eq("New message"),
            eq("Sent you a message"),
            anyMap());
    }

    // ---------- notifyVideoCallScheduled ----------

    @Test
    @DisplayName("notifyVideoCallScheduled instant=true uses 'Calling you now' body")
    void notifyVideoCallScheduled_instant() {
        service.notifyVideoCallScheduled("trainee", "Coach", "conv-1", "call-1", true);

        ArgumentCaptor<Map<String, String>> dataCaptor = dataCaptor();
        verify(fcm).sendToUser(
            eq("trainee"),
            eq("Coach"),
            eq("Calling you now"),
            dataCaptor.capture());
        Map<String, String> data = dataCaptor.getValue();
        assertions(data, "chat", "video_call", "conv-1", "call-1");
        org.assertj.core.api.Assertions.assertThat(data.get("instant")).isEqualTo("true");
    }

    @Test
    @DisplayName("notifyVideoCallScheduled instant=false uses 'Wants to schedule a video call' body")
    void notifyVideoCallScheduled_scheduled() {
        service.notifyVideoCallScheduled("trainee", "Coach", "conv-1", "call-1", false);

        verify(fcm).sendToUser(
            eq("trainee"),
            eq("Coach"),
            eq("Wants to schedule a video call"),
            anyMap());
    }

    @Test
    @DisplayName("notifyVideoCallScheduled defaults title when trainer name is null")
    void notifyVideoCallScheduled_nullName() {
        service.notifyVideoCallScheduled("trainee", null, "conv-1", "call-1", true);

        verify(fcm).sendToUser(
            eq("trainee"),
            eq("Video call"),
            anyString(),
            anyMap());
    }

    // ---------- helpers ----------

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, String>> dataCaptor() {
        return ArgumentCaptor.forClass(Map.class);
    }

    private void assertions(Map<String, String> data, String route, String type,
                            String conversationId, String callId) {
        org.assertj.core.api.Assertions.assertThat(data.get("route")).isEqualTo(route);
        org.assertj.core.api.Assertions.assertThat(data.get("type")).isEqualTo(type);
        if (conversationId != null) {
            org.assertj.core.api.Assertions.assertThat(data.get("conversationId")).isEqualTo(conversationId);
        }
        if (callId != null) {
            org.assertj.core.api.Assertions.assertThat(data.get("callId")).isEqualTo(callId);
        }
    }
}
