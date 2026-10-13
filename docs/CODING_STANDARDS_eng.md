# Coding Standards – FitLink

A unified summary of coding standards for the entire FitLink project (monorepo). This document consolidates rules that are scattered across `README.md` and `CLAUDE.md` files and the individual apps' configurations, and supplements them with the conventions actually used in the code. It applies to the **backend**, **mobile**, and **webapp**.

---

## 1. Shared standards (all apps)

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) – prefixes `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` (and `test:`, `perf:`, `ci:` as needed).
- **Small, focused files and functions:** one responsibility per file/function; break extensive logic into smaller, named pieces.
- **Validation at system boundaries:** never trust incoming data (user input, API responses) without verification.
- **Explicit error handling:** show the user a meaningful message; never expose internal details (stack traces, system messages) externally.
- **Organize by domain/feature**, not by file type.

---

## 2. Backend (Java 21 + Spring Boot)

**Architecture**
- Package-per-domain: `si.feri.fitlink.<domain>` (e.g. `auth`, `user`, `coaching`, `workout`, `chat`, `health` …).
- Strict layering within a domain: **Controller → Service → Repository**.
- Shared code in `common/`, configuration in `config/`.

**Rules**
- **DTOs are separate from `@Document` entities.** DTOs live in a `dto/` subpackage or in a "holder" class (`WorkoutDtos`, `ExerciseDtos`, `ChatDtos`). Controllers **do not return** entities.
- **Lombok everywhere:** `@RequiredArgsConstructor` for constructor injection (no field injection), `@Builder` on entities, `@Data` on DTOs.
- **Authorization:** roles via `@PreAuthorize` / method security; the authenticated user is available as `AuthPrincipal`.
- **Centralized error handling:** services throw domain exceptions (`ResourceNotFoundException` from `common/exception/`); `GlobalExceptionHandler` maps them to HTTP responses. Add new exception types there, **without ad-hoc `ResponseStatusException`**.
- **Push notifications** go through `common/NotificationService` + `common/FcmPushService`, not through direct Firebase calls.

**Style and naming**
- Google Java Style, 4-space indentation, one public type per file.
- `PascalCase` for classes/interfaces/`enum`; `camelCase` for methods, fields, and parameters; `SCREAMING_SNAKE_CASE` for constants and `enum` values (`Role`, `CoachingStatus`, `VideoCallStatus`).
- Packages: lowercase.

**Tests**
- JUnit 5 + Mockito + AssertJ; unit tests of the service layer (`@ExtendWith(MockitoExtension.class)`, `@Mock` repositories, `@InjectMocks` service).
- `@DisplayName` with a human-readable description of the behavior; method names follow the `method_condition_expectedResult` pattern.
- Build test data with entity builders (`User.builder()...`).

---

## 3. Frontend (webapp and mobile – TypeScript + React / React Native)

**Common to both clients**
- **Functional components** in TypeScript.
- **Naming:** `PascalCase` for components and types/interfaces, `camelCase` for functions, `use` prefix for hooks, `UPPER_SNAKE_CASE` for constants.
- **Unified API layer:** all HTTP goes through a single Axios instance (`apiClient.ts`) that attaches the Firebase ID token; new endpoints go into the appropriate domain module (`workoutApi.ts`, `chatApi.ts`, `checkInApi.ts` …). **Never** create a second Axios instance.
- **Authentication state** is read via `AuthContext` / `useAuth`, not directly from Firebase in components.
- **Styling** via theme constants (`colors`, `spacing`, `typography`, `shadows`).
- **Type safety:** avoid `any` – for untrusted input use `unknown` + narrowing or generics; exported functions have explicit return types.
- **No `console.*`** in production code (use a dedicated logger or remove it).
- Keep shared type definitions separate in `types/`.

**Webapp (React 19 + Vite)**
- Routing with react-router v7: wrap authenticated routes in `ProtectedRoute`, role-restricted ones additionally in `RoleRoute` (TRAINER/ADMIN).
- Styling from `src/theme/`; icons from `lucide-react`.
- Verifying changes: `npm run build` (`tsc -b` + Vite) and `npm run lint` must both pass.

**Mobile (React Native)**
- Structure: `api/`, `components/`, `hooks/`, `navigation/`, `screens/` (by role: `admin/`, `trainer/`, `trainee/`), `services/`, `theme/`, `types/`.
- Styling from `theme/`; navigation with React Navigation (bottom tabs + per-role stacks).

---

## 4. Where the rules are written (sources in the repository)

| Source | What it defines |
|-----|------------|
| root `README.md` → *Conventions* | commits; "backend – Google Java Style; mobile – ESLint + Prettier". |
| root `CLAUDE.md` → *Conventions* | commits; backend Google Java Style + Lombok; frontend/mobile ESLint + Prettier, functional components, naming; unified API layer. |
| `backend/README.md` → *Conventions* | layered architecture, `@Service`/`@RestController`, DTOs separate from entities, Lombok, `GlobalExceptionHandler`, packages by domain. |
| `backend/CLAUDE.md` | layering, DTO vs `@Document`, `@PreAuthorize`, exceptions, Lombok, testing standard. |
| `webapp/CLAUDE.md` | `apiClient.ts`, routing, styling from `theme/`, `AuthContext`. |
| `mobile/CLAUDE.md` | folder structure, unified API layer. |
| `webapp/eslint.config.js` | ESLint (flat): `js`, `typescript-eslint`, `react-hooks`, `react-refresh`. |
| `mobile/.eslintrc.js` + `mobile/.prettierrc.js` | ESLint `@react-native`; Prettier: `singleQuote`, `trailingComma: 'all'`, `arrowParens: 'avoid'`. |
| `webapp/tsconfig.app.json` / `mobile/tsconfig.json` | TypeScript compiler rules. |

---
