package si.feri.fitlink.common;

import java.util.Map;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;
import si.feri.fitlink.workout.WorkoutTemplate;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final FcmPushService fcm;
    private final UserRepository userRepo;

    public void notifyCoachingRequest(Coaching coaching) {
        if (coaching == null || coaching.getTrainerId() == null) return;
        String traineeName = displayNameOrFallback(coaching.getTraineeId(), "A new trainee");
        fcm.sendToUser(
            coaching.getTrainerId(),
            "New coaching request",
            traineeName + " wants to train with you",
            Map.of(
                "route", "coaching",
                "type", "coaching_request",
                "coachingId", coaching.getId() == null ? "" : coaching.getId()
            )
        );
    }

    public void notifyCoachingAccepted(Coaching coaching) {
        if (coaching == null || coaching.getTraineeId() == null) return;
        String trainerName = displayNameOrFallback(coaching.getTrainerId(), "Your trainer");
        fcm.sendToUser(
            coaching.getTraineeId(),
            "Coaching accepted",
            trainerName + " is now your coach",
            Map.of(
                "route", "coaching",
                "type", "coaching_accepted",
                "coachingId", coaching.getId() == null ? "" : coaching.getId()
            )
        );
    }

    public void notifyWorkoutUpdated(WorkoutTemplate template) {
        // TODO: send to template owner when a trainer edits it (prvo more obstajate ta funkcionalnost)
    }

    private String displayNameOrFallback(String firebaseUid, String fallback) {
        if (firebaseUid == null) return fallback;
        return userRepo.findByFirebaseUid(firebaseUid)
            .map(User::getDisplayName)
            .filter(s -> s != null && !s.isBlank())
            .orElse(fallback);
    }


    public void notifyChatMessage(String recipientUserId, String senderDisplayName, String preview, String conversationId) {
        String title = senderDisplayName == null ? "New message" : senderDisplayName;
        String body = preview == null || preview.isBlank() ? "Sent you a message" : preview;
        fcm.sendToUser(recipientUserId, title, body, Map.of(
            "route", "chat",
            "type", "chat_message",
            "conversationId", conversationId == null ? "" : conversationId
        ));
    }

    public void notifyVideoCallScheduled(
        String recipientUserId,
        String trainerDisplayName,
        String conversationId,
        String callId,
        boolean instant
    ) {
        String title = trainerDisplayName == null ? "Video call" : trainerDisplayName;
        String body = instant ? "Calling you now" : "Wants to schedule a video call";
        fcm.sendToUser(recipientUserId, title, body, Map.of(
            "route", "chat",
            "type", "video_call",
            "conversationId", conversationId == null ? "" : conversationId,
            "callId", callId == null ? "" : callId,
            "instant", instant ? "true" : "false"
        ));
    }
}
