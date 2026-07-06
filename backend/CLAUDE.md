# backend/CLAUDE.md

Spring Boot 4 (Java 21) REST API + STOMP WebSocket server, MongoDB via Spring Data. See root `CLAUDE.md` for the cross-app auth flow.

## Commands

```bash
docker compose up mongodb        # from repo root — must run before the backend
./mvnw spring-boot:run           # API on :8080
./mvnw test                      # all tests (JaCoCo report generated in target/site/jacoco/)
./mvnw test -Dtest=UserServiceTest                    # single test class
./mvnw test -Dtest=UserServiceTest#findOrCreateUser_existing_returnsIt  # single method
```

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Mongo URI override: `MONGODB_URI` env var (defaults to `mongodb://localhost:27017/fitlink`)
- **Required secret (gitignored):** `src/main/resources/firebase-adminsdk.json` — app fails to start without it

## Architecture

Package-per-domain under `si.feri.fitlink.<domain>`, strict layering inside each:

```
Controller → Service → Repository (Spring Data MongoDB)
```

Rules that keep the codebase consistent:

- **DTOs are separate from `@Document` entities.** DTOs live in a `dto/` subpackage or a `XxxDtos.java` holder class (see `workout/`). Never return entities from controllers.
- **Role checks** via `@PreAuthorize` / method security on controllers; the authenticated user is available as `AuthPrincipal` (see `auth/AuthPrincipal.java`).
- **Error handling:** services throw `ResourceNotFoundException` (in `common/exception/`); `GlobalExceptionHandler` maps exceptions to HTTP responses. Add new exception types there, not ad-hoc `ResponseStatusException`.
- **Push notifications:** go through `common/NotificationService` + `common/FcmPushService`, not direct Firebase calls.
- Lombok everywhere: `@RequiredArgsConstructor` for DI, `@Builder` on entities, `@Data` on DTOs.

Domains: `auth`, `user`, `coaching` (trainer–trainee links), `workout` (templates + sessions), `exercise`, `health` (Health Connect sync), `checkin`, `course`, `chat` (REST history + WebSocket live), `call`/`videocall`, `trainer`, `trainerapplication`, `notification`, `config`.

Cross-cutting config lives in `config/`: `SecurityConfig` (filter chain + CORS), `FirebaseConfig`, `JacksonConfig`, `StaticResourceConfig` (serves uploaded files).

## WebSocket (chat)

STOMP endpoints `/ws` and `/ws-sockjs`; auth happens in a handshake interceptor under `chat/ws/`. When adding real-time features, follow the existing `chat/` split: `domain/`, `dto/`, `event/`, `repo/`, `service/`, `ws/`.

## Testing

Unit tests only — plain Mockito, no Spring context, no embedded Mongo:

- `@ExtendWith(MockitoExtension.class)` + `@Mock` repos + `@InjectMocks` service
- AssertJ assertions (`assertThat`, `assertThatThrownBy`)
- `@DisplayName` with plain-English behavior description; method names follow `method_condition_expectedResult`
- Build test data with the entity builders (`User.builder()...`)

Follow this pattern for new tests (reference: `user/UserServiceTest.java`). Don't introduce `@SpringBootTest` without a strong reason — CI runs `./mvnw test` on every PR.

## Gotchas

- File uploads (course thumbnails/PDFs) are capped at 50MB (`application.properties`); uploaded files land in `uploads/` (gitignored).
- `src/main/resources/seed/exercises.json` seeds the exercise library — update it when changing the `Exercise` schema.
- Firebase project ID is configured in `application.properties` (`fitlink.firebase.*`), not hardcoded.
