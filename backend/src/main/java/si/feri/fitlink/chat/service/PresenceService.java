package si.feri.fitlink.chat.service;

import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import lombok.extern.slf4j.Slf4j;

/**
 * In-memory presence - Štej active STOMP sessione per user takka 2 open
 * taba / 2 devicea ne flipata the user offline when one disconnects.
 * Multi-node: replace this with Redis SET + TTL (same public API).
 */
@Service
@Slf4j
public class PresenceService {

    private final ConcurrentMap<String, Integer> sessionCount = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Instant> lastSeen = new ConcurrentHashMap<>();

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        String uid = userIdFrom(event);
        if (uid == null) return;
        sessionCount.merge(uid, 1, Integer::sum);
        lastSeen.put(uid, Instant.now());
        log.debug("Presence +1 uid={} total={}", uid, sessionCount.get(uid));
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        String uid = userIdFrom(event);
        if (uid == null) return;
        sessionCount.compute(uid, (k, v) -> v == null || v <= 1 ? null : v - 1);
        lastSeen.put(uid, Instant.now());
        log.debug("Presence -1 uid={} total={}", uid, sessionCount.getOrDefault(uid, 0));
    }

    public boolean isOnline(String userId) {
        return sessionCount.getOrDefault(userId, 0) > 0;
    }

    public Instant lastSeenAt(String userId) {
        return lastSeen.get(userId);
    }

    public Set<String> onlineUserIds() {
        return Set.copyOf(sessionCount.keySet());
    }

    private static String userIdFrom(org.springframework.context.ApplicationEvent event) {
        if (event instanceof SessionConnectedEvent c && c.getUser() != null) return c.getUser().getName();
        if (event instanceof SessionDisconnectEvent d && d.getUser() != null) return d.getUser().getName();
        return null;
    }
}
