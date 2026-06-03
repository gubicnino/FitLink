package si.feri.fitlink.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

import si.feri.fitlink.user.Role;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class FirebaseAuthFilterTest {

    @Mock private FirebaseAuth firebaseAuth;
    @Mock private UserRepository userRepository;
    @Mock private FirebaseToken decoded;

    @InjectMocks private FirebaseAuthFilter filter;

    private MockHttpServletRequest req;
    private MockHttpServletResponse res;
    private MockFilterChain chain;

    @BeforeEach
    void setUp() {
        req = new MockHttpServletRequest();
        res = new MockHttpServletResponse();
        chain = new MockFilterChain();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("missing Authorization header leaves SecurityContext empty but still calls chain")
    void noHeader_clearContext_proceedsChain() throws Exception {
        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isSameAs(req);
        verify(firebaseAuth, never()).verifyIdToken(anyString());
    }

    @Test
    @DisplayName("non-Bearer Authorization header is ignored (no token verification)")
    void nonBearer_ignored() throws Exception {
        req.addHeader("Authorization", "Basic dXNlcjpwYXNz");

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(firebaseAuth, never()).verifyIdToken(anyString());
    }

    @Test
    @DisplayName("invalid token clears the SecurityContext and still proceeds")
    void invalidToken_clearsContext() throws Exception {
        req.addHeader("Authorization", "Bearer bad-token");
        when(firebaseAuth.verifyIdToken("bad-token"))
            .thenThrow(new FirebaseAuthException(
                com.google.firebase.ErrorCode.INVALID_ARGUMENT, "bad", null, null, null));

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isSameAs(req);
    }

    @Test
    @DisplayName("valid token with role claim binds AuthPrincipal with ROLE_TRAINER authority")
    void validToken_withRoleClaim_setsAuthority() throws Exception {
        req.addHeader("Authorization", "Bearer good-token");
        when(firebaseAuth.verifyIdToken("good-token")).thenReturn(decoded);
        when(decoded.getUid()).thenReturn("uid-1");
        when(decoded.getEmail()).thenReturn("t@x.com");
        when(decoded.getClaims()).thenReturn(Map.of("role", "TRAINER"));

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        AuthPrincipal principal = (AuthPrincipal) auth.getPrincipal();
        assertThat(principal.uid()).isEqualTo("uid-1");
        assertThat(principal.email()).isEqualTo("t@x.com");
        assertThat(principal.role()).isEqualTo("TRAINER");
        assertThat(auth.getAuthorities()).extracting(Object::toString)
            .containsExactly("ROLE_TRAINER");
        verify(userRepository, never()).findByFirebaseUid(anyString());
    }

    @Test
    @DisplayName("valid token without role claim falls back to user role from database")
    void validToken_noClaim_fallsBackToDb() throws Exception {
        req.addHeader("Authorization", "Bearer good-token");
        when(firebaseAuth.verifyIdToken("good-token")).thenReturn(decoded);
        when(decoded.getUid()).thenReturn("uid-2");
        when(decoded.getEmail()).thenReturn("u@x.com");
        when(decoded.getClaims()).thenReturn(Map.of());
        User u = User.builder().id("u1").firebaseUid("uid-2").role(Role.TRAINEE).build();
        when(userRepository.findByFirebaseUid("uid-2")).thenReturn(Optional.of(u));

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AuthPrincipal principal = (AuthPrincipal) auth.getPrincipal();
        assertThat(principal.role()).isEqualTo("TRAINEE");
        assertThat(auth.getAuthorities()).extracting(Object::toString)
            .containsExactly("ROLE_TRAINEE");
    }

    @Test
    @DisplayName("valid token + no claim + user not in db → authenticated but with no authorities")
    void validToken_noClaim_noUser_emptyAuthorities() throws Exception {
        req.addHeader("Authorization", "Bearer good-token");
        when(firebaseAuth.verifyIdToken("good-token")).thenReturn(decoded);
        when(decoded.getUid()).thenReturn("uid-3");
        when(decoded.getEmail()).thenReturn(null);
        when(decoded.getClaims()).thenReturn(Map.of());
        when(userRepository.findByFirebaseUid("uid-3")).thenReturn(Optional.empty());

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        AuthPrincipal principal = (AuthPrincipal) auth.getPrincipal();
        assertThat(principal.role()).isNull();
        assertThat(auth.getAuthorities()).isEmpty();
    }
}
