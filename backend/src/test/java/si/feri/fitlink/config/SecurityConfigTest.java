package si.feri.fitlink.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.OncePerRequestFilter;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.messaging.FirebaseMessaging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import si.feri.fitlink.auth.FirebaseAuthFilter;
import si.feri.fitlink.user.UserRepository;

/**
 * Smoke test: verify that {@link SecurityConfig} correctly classifies endpoints as
 * public vs. authenticated. We replace the real Firebase beans + auth filter with
 * test doubles so the application context can boot without firebase-adminsdk.json.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private FirebaseApp firebaseApp;
    @MockitoBean private FirebaseAuth firebaseAuth;
    @MockitoBean private FirebaseMessaging firebaseMessaging;

    @TestConfiguration
    static class TestProbes {
        /**
         * Pass-through stub for FirebaseAuthFilter that delegates to the chain
         * without setting any authentication. This is what Spring Security sees
         * for unauthenticated requests in production, so anyRequest().authenticated()
         * correctly rejects them with 401.
         */
        @Bean
        @Primary
        FirebaseAuthFilter passthroughAuthFilter(FirebaseAuth fa, UserRepository repo) {
            return new FirebaseAuthFilter(fa, repo) {
                @Override
                protected void doFilterInternal(HttpServletRequest req,
                                                HttpServletResponse res,
                                                FilterChain chain) throws ServletException, IOException {
                    chain.doFilter(req, res);
                }
            };
        }

        @Bean
        @Primary
        ProbeController probeController() {
            return new ProbeController();
        }
    }

    @RestController
    static class ProbeController {
        @GetMapping("/api/probe/protected")
        public String secret() { return "secret"; }
    }

    @Test
    @DisplayName("POST /api/auth/login is public (security does not block — endpoint may 4xx for body)")
    void authLogin_public() throws Exception {
        // The route is permitAll() per SecurityConfig — we assert that the request is
        // NOT blocked at the security layer (no 401/403). Downstream may legitimately
        // return 400/404 because we send no body; that is fine.
        mvc.perform(post("/api/auth/login"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s == 401 || s == 403) {
                    throw new AssertionError("Auth login should be public, got " + s);
                }
            });
    }

    @Test
    @DisplayName("POST /api/auth/register is public")
    void authRegister_public() throws Exception {
        mvc.perform(post("/api/auth/register"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s == 401 || s == 403) {
                    throw new AssertionError("Auth register should be public, got " + s);
                }
            });
    }

    @Test
    @DisplayName("Protected endpoint without auth → 401/403 (security blocks)")
    void protectedEndpoint_noAuth_blocked() throws Exception {
        mvc.perform(get("/api/probe/protected"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s != 401 && s != 403) {
                    throw new AssertionError(
                        "Protected endpoint should be blocked by security, got " + s);
                }
            });
    }

    @Test
    @DisplayName("Unknown protected URL still goes through security → 401/403")
    void unknownProtected_blocked() throws Exception {
        mvc.perform(get("/api/some/random/path"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s != 401 && s != 403) {
                    throw new AssertionError(
                        "Unknown URL should still require auth, got " + s);
                }
            });
    }

    @Test
    @DisplayName("WebSocket handshake endpoint /ws/** is public (auth done in STOMP CONNECT)")
    void wsHandshake_public() throws Exception {
        mvc.perform(get("/ws/info"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s == 401 || s == 403) {
                    throw new AssertionError("WS handshake should be public, got " + s);
                }
            });
    }

    @Test
    @DisplayName("Swagger UI path is public")
    void swaggerUi_public() throws Exception {
        mvc.perform(get("/swagger-ui/index.html"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s == 401 || s == 403) {
                    throw new AssertionError("Swagger UI should be public, got " + s);
                }
            });
    }
}
