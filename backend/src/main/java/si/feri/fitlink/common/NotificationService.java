package si.feri.fitlink.common;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
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
}
