package si.feri.fitlink.common;

import java.util.Map;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmPushService {

    private final FirebaseMessaging firebaseMessaging;
    private final UserRepository userRepo;

    @Async
    public void sendToUser(String firebaseUid, String title, String body, Map<String, String> data) {
        User user = userRepo.findByFirebaseUid(firebaseUid).orElse(null);
        if (user == null || user.getFcmToken() == null || user.getFcmToken().isBlank()) {
            log.debug("[fcm] no token for uid {} — skipping push", firebaseUid);
            return;
        }
        String token = user.getFcmToken();

        AndroidNotification.Builder androidNotif = AndroidNotification.builder()
            .setChannelId("fitlink_default");
        if (data != null && data.get("conversationId") != null && !data.get("conversationId").isBlank()) {
            androidNotif.setTag("chat-" + data.get("conversationId"));
        }

        Message.Builder builder = Message.builder()
            .setToken(token)
            .setNotification(Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build())
            .setAndroidConfig(AndroidConfig.builder()
                .setPriority(AndroidConfig.Priority.HIGH)
                .setNotification(androidNotif.build())
                .build());

        if (data != null) {
            for (Map.Entry<String, String> e : data.entrySet()) {
                if (e.getKey() != null && e.getValue() != null) {
                    builder.putData(e.getKey(), e.getValue());
                }
            }
        }

        try {
            String id = firebaseMessaging.send(builder.build());
            log.debug("[fcm] sent to uid={} id={}", firebaseUid, id);
        } catch (FirebaseMessagingException ex) {
            String code = ex.getMessagingErrorCode() == null ? null : ex.getMessagingErrorCode().name();
            if ("UNREGISTERED".equals(code) || "INVALID_ARGUMENT".equals(code)) {
                user.setFcmToken(null);
                userRepo.save(user);
                log.info("[fcm] cleared stale token for uid={} ({})", firebaseUid, code);
            } else {
                log.warn("[fcm] send failed for uid={}: {}", firebaseUid, ex.getMessage());
            }
        }
    }
}
