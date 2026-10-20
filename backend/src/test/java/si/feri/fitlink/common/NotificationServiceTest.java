package si.feri.fitlink.common;

import static org.assertj.core.api.Assertions.assertThat;
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
    @DisplayName("notifyCoachingRequest sends FCM to the trainer with trainee name and coaching deep-link data")
    void notifyCoachingRequest_usesTraineeName() {
        when(userRepo.findByFirebaseUid("trainee-uid"))
            .thenReturn(Optional.of(user("trainee-uid", "Alice", Role.TRAINEE)));

        service.notifyCoachingRequest(coaching());

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(
            eq("trainer-uid"),
            eq("New coaching request"),
            contains("Alice"),
            data.capture());
        assertThat(data.getValue()).containsExactlyInAnyOrderEntriesOf(Map.of(
            "route", "coaching",
            "type", "coaching_request",
            "coachingId", "c1"));
    }

    @Test
    @DisplayName("notifyCoachingRequest falls back to default name when trainee is not in the database")
    void notifyCoachingRequest_unknownTrainee_fallbackName() {
        when(userRepo.findByFirebaseUid("trainee-uid")).thenReturn(Optional.empty());

        service.notifyCoachingRequest(coaching());

        verify(fcm).sendToUser(
            eq("trainer-uid"),
            eq("New coaching request"),
            contains("A new trainee"),
            anyMap());
    }

    @Test
    @DisplayName("notifyCoachingRequest falls back to default name when trainee display name is blank")
    void notifyCoachingRequest_blankName_fallbackName() {
        when(userRepo.findByFirebaseUid("trainee-uid"))
            .thenReturn(Optional.of(user("trainee-uid", "   ", Role.TRAINEE)));

        service.notifyCoachingRequest(coaching());

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
        Coaching coaching = Coaching.builder().id("c1").traineeId("trainee-uid").build();
        service.notifyCoachingRequest(coaching);
        verify(fcm, never()).sendToUser(any(), any(), any(), any());
    }

    // ---------- notifyCoachingAccepted ----------

    @Test
    @DisplayName("notifyCoachingAccepted sends FCM to the trainee with trainer name and deep-link data")
    void notifyCoachingAccepted_usesTrainerName() {
        when(userRepo.findByFirebaseUid("trainer-uid"))
            .thenReturn(Optional.of(user("trainer-uid", "Coach Carter", Role.TRAINER)));

        service.notifyCoachingAccepted(coaching());

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(
            eq("trainee-uid"),
            eq("Coaching accepted"),
            contains("Coach Carter"),
            data.capture());
        assertThat(data.getValue()).containsExactlyInAnyOrderEntriesOf(Map.of(
            "route", "coaching",
            "type", "coaching_accepted",
            "coachingId", "c1"));
    }

    @Test
    @DisplayName("notifyCoachingAccepted falls back to 'Your trainer' when trainer is unknown")
    void notifyCoachingAccepted_unknownTrainer_fallbackName() {
        when(userRepo.findByFirebaseUid("trainer-uid")).thenReturn(Optional.empty());

        service.notifyCoachingAccepted(coaching());

        verify(fcm).sendToUser(
            eq("trainee-uid"),
            eq("Coaching accepted"),
            contains("Your trainer"),
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
    @DisplayName("notifyChatMessage uses sender name as title, preview as body and chat deep-link data")
    void notifyChatMessage_normalCase() {
        service.notifyChatMessage("recipient", "Bob", "Hey there", "conv-1");

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(eq("recipient"), eq("Bob"), eq("Hey there"), data.capture());
        assertThat(data.getValue()).containsExactlyInAnyOrderEntriesOf(Map.of(
            "route", "chat",
            "type", "chat_message",
            "conversationId", "conv-1"));
    }

    @Test
    @DisplayName("notifyChatMessage falls back to defaults when sender/preview are null")
    void notifyChatMessage_nullsFallback() {
        service.notifyChatMessage("recipient", null, null, "conv-1");

        verify(fcm).sendToUser(eq("recipient"), eq("New message"), eq("Sent you a message"), anyMap());
    }

    @Test
    @DisplayName("notifyChatMessage falls back to defaults when sender/preview are blank")
    void notifyChatMessage_blankFallback() {
        service.notifyChatMessage("recipient", "  ", "   ", "conv-1");

        verify(fcm).sendToUser(eq("recipient"), eq("New message"), eq("Sent you a message"), anyMap());
    }

    @Test
    @DisplayName("notifyChatMessage sends an empty conversationId instead of failing when it is null")
    void notifyChatMessage_nullConversation_emptyId() {
        service.notifyChatMessage("recipient", "Bob", "Hi", null);

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(eq("recipient"), eq("Bob"), eq("Hi"), data.capture());
        assertThat(data.getValue()).containsEntry("conversationId", "");
    }

    // ---------- notifyVideoCallScheduled ----------

    @Test
    @DisplayName("notifyVideoCallScheduled instant=true uses 'Calling you now' body and full call data")
    void notifyVideoCallScheduled_instant() {
        service.notifyVideoCallScheduled("trainee", "Coach", "conv-1", "call-1", true);

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(eq("trainee"), eq("Coach"), eq("Calling you now"), data.capture());
        assertThat(data.getValue()).containsExactlyInAnyOrderEntriesOf(Map.of(
            "route", "chat",
            "type", "video_call",
            "conversationId", "conv-1",
            "callId", "call-1",
            "instant", "true"));
    }

    @Test
    @DisplayName("notifyVideoCallScheduled instant=false uses 'Wants to schedule a video call' body")
    void notifyVideoCallScheduled_scheduled() {
        service.notifyVideoCallScheduled("trainee", "Coach", "conv-1", "call-1", false);

        ArgumentCaptor<Map<String, String>> data = dataCaptor();
        verify(fcm).sendToUser(eq("trainee"), eq("Coach"), eq("Wants to schedule a video call"), data.capture());
        assertThat(data.getValue()).containsEntry("instant", "false");
    }

    @Test
    @DisplayName("notifyVideoCallScheduled defaults title when trainer name is null")
    void notifyVideoCallScheduled_nullName() {
        service.notifyVideoCallScheduled("trainee", null, "conv-1", "call-1", true);

        verify(fcm).sendToUser(eq("trainee"), eq("Video call"), anyString(), anyMap());
    }

    // ---------- helpers ----------

    private Coaching coaching() {
        return Coaching.builder()
            .id("c1")
            .trainerId("trainer-uid")
            .traineeId("trainee-uid")
            .build();
    }

    private User user(String uid, String name, Role role) {
        return User.builder().firebaseUid(uid).displayName(name).role(role).build();
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, String>> dataCaptor() {
        return ArgumentCaptor.forClass(Map.class);
    }
}
