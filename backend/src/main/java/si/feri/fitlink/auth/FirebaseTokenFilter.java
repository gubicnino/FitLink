package si.feri.fitlink.auth;

// Servlet filter that authenticates every inbound request using a Firebase ID token.
// The mobile/web client must include the token in the Authorization header:
//   Authorization: Bearer <firebase-id-token>
// On success the authenticated user's MongoDB id is set as the principal, and their
// role (TRAINEE / TRAINER / ADMIN) becomes a Spring Security authority, so you can
// protect endpoints with @PreAuthorize("hasRole('TRAINER')") etc.
// Requests without a valid token pass through unauthenticated (they will be rejected
// by Spring Security if the endpoint requires authentication).

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private final UserRepository userRepo;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws IOException, ServletException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                FirebaseToken token = FirebaseAuth.getInstance()
                        .verifyIdToken(header.substring(7));

                User user = userRepo.findByFirebaseUid(token.getUid())
                        .orElseThrow();

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(user.getId(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));

                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {}
        }
        chain.doFilter(req, res);
    }
}
