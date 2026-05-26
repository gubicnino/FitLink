package si.feri.fitlink.chat.ws;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

/**
 * Verifiya the Firebase ID token on STOMP CONNECT. Sets a {@link
 * java.security.Principal} whose {@code getName()} returns the Firebase
 * UID so Spring's user-destination resolver routes
 * {@code /user/{uid}/queue/...} correctly.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatStompAuthInterceptor implements ChannelInterceptor {

    private final FirebaseAuth firebaseAuth;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.debug("STOMP CONNECT without Bearer token, rejecting");
                throw new SecurityException("Missing Authorization header");
            }
            AuthPrincipal principal = verify(authHeader.substring("Bearer ".length()).trim());
            if (principal == null) {
                throw new SecurityException("Invalid Firebase token");
            }

            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.role() != null
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()))
                        : List.of()
                ) {
                    @Override public String getName() { return principal.uid(); }
                };
            accessor.setUser(authentication);
            log.info("[STOMP CONNECT] authenticated uid={} email={}", principal.uid(), principal.email());
        }
        return message;
    }

    private AuthPrincipal verify(String idToken) {
        try {
            FirebaseToken token = firebaseAuth.verifyIdToken(idToken);
            String uid = token.getUid();
            String email = token.getEmail();
            Object roleClaim = token.getClaims().get("role");
            String role = roleClaim != null ? roleClaim.toString() : null;
            if (role == null) {
                User user = userRepository.findByFirebaseUid(uid).orElse(null);
                if (user != null && user.getRole() != null) {
                    role = user.getRole().name();
                }
            }
            return new AuthPrincipal(uid, email, role);
        } catch (FirebaseAuthException e) {
            log.debug("Firebase verifyIdToken failed: {}", e.getMessage());
            return null;
        }
    }
}
