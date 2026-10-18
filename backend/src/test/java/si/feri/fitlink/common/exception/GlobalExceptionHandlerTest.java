package si.feri.fitlink.common.exception;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

class GlobalExceptionHandlerTest {

    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ProbeController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("ResourceNotFoundException → 404 with structured error body")
    void notFound_returns404() throws Exception {
        mvc.perform(get("/probe/not-found"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.error").value("Not Found"))
            .andExpect(jsonPath("$.message").value("missing thing"))
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("IllegalArgumentException → 400 with structured error body")
    void illegalArg_returns400() throws Exception {
        mvc.perform(get("/probe/bad-arg"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").value("bad input"))
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("@Valid failure → 400 ValidationError with a message for every invalid field")
    void validationFails_returns400WithFieldErrors() throws Exception {
        ProbeBody body = new ProbeBody();
        body.setName("");
        body.setWeight(null);

        mvc.perform(post("/probe/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").value("Validation failed"))
            .andExpect(jsonPath("$.fieldErrors.name").isNotEmpty())
            .andExpect(jsonPath("$.fieldErrors.weight").isNotEmpty())
            .andExpect(jsonPath("$.fieldErrors.length()").value(2));
    }

    @Test
    @DisplayName("valid body passes through the handler untouched")
    void validBody_returns200() throws Exception {
        ProbeBody body = new ProbeBody();
        body.setName("ok");
        body.setWeight(70.0);

        mvc.perform(post("/probe/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("AccessDeniedException from a service → 403, not 500")
    void accessDenied_returns403() throws Exception {
        mvc.perform(get("/probe/forbidden"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("IllegalStateException (business conflict, e.g. duplicate request) → 409, not 500")
    void illegalState_returns409() throws Exception {
        mvc.perform(get("/probe/conflict"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.message").value("Request already exists"));
    }

    @Test
    @DisplayName("malformed JSON body → 400 (client error), not 500")
    void malformedJson_returns400() throws Exception {
        mvc.perform(post("/probe/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ not json"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Unhandled Exception → 500 with generic message and no internal details leaked")
    void unexpected_returns500WithSafeMessage() throws Exception {
        mvc.perform(get("/probe/boom"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500))
            .andExpect(jsonPath("$.error").value("Internal Server Error"))
            .andExpect(jsonPath("$.message").value("Unexpected server error"))
            .andExpect(content().string(not(containsString("internal secret detail"))))
            .andExpect(content().string(not(containsString("RuntimeException"))));
    }

    // ---------- Probe controller (test-only fixture) ----------

    @RestController
    static class ProbeController {
        @GetMapping("/probe/not-found")
        public String notFound() {
            throw new ResourceNotFoundException("missing thing");
        }

        @GetMapping("/probe/bad-arg")
        public String badArg() {
            throw new IllegalArgumentException("bad input");
        }

        @GetMapping("/probe/forbidden")
        public String forbidden() {
            throw new AccessDeniedException("Not your session");
        }

        @GetMapping("/probe/conflict")
        public String conflict() {
            throw new IllegalStateException("Request already exists");
        }

        @PostMapping("/probe/validate")
        public String validate(@Valid @RequestBody ProbeBody body) {
            return "ok";
        }

        @GetMapping("/probe/boom")
        public String boom() {
            throw new RuntimeException("internal secret detail");
        }
    }

    @Data
    static class ProbeBody {
        @NotBlank private String name;
        @NotNull private Double weight;
    }
}
