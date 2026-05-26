package si.feri.fitlink.common;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.coaching.Coaching;
import si.feri.fitlink.workout.WorkoutTemplate;

// Stub — will be backed by Firebase Cloud Messaging
@Service
@RequiredArgsConstructor
public class NotificationService {

    public void notifyCoachingRequest(Coaching coaching) {
        // TODO: send FCM push to trainer
    }

    public void notifyCoachingAccepted(Coaching coaching) {
        // TODO: send FCM push to trainee
    }

    public void notifyWorkoutUpdated(WorkoutTemplate template) {
        // TODO: send FCM push to template owner
    }

    /**
     * Push za incoming chat message. Only invoked by the chat layer
     * when the recipient is NOT currently STOMP-connected (sepravi ka smo presence-aware).
     */
    public void notifyChatMessage(String recipientUserId, String senderDisplayName, String preview) {
        // TODO: send FCM push to {recipientUserId} with title=senderDisplayName, body=preview
    }
}
