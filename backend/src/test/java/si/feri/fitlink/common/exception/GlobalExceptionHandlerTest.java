package si.feri.fitlink.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
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
            .andExpect(jsonPath("$.message").value("bad input"));
    }

    @Test
    @DisplayName("@Valid failure → 400 ValidationError with fieldErrors map")
    void validationFails_returns400WithFieldErrors() throws Exception {
        ProbeBody body = new ProbeBody();
        // weight intentionally null, name blank → 2 field violations
        body.setName("");
        body.setWeight(null);

        mvc.perform(post("/probe/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").value("Validation failed"))
            .andExpect(jsonPath("$.fieldErrors.name").exists())
            .andExpect(jsonPath("$.fieldErrors.weight").exists());
    }

    @Test
    @DisplayName("Unhandled Exception → 500 with safe generic message (no stack leak)")
    void unexpected_returns500WithSafeMessage() throws Exception {
        mvc.perform(get("/probe/boom"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500))
            .andExpect(jsonPath("$.message").value("Unexpected server error"));
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
