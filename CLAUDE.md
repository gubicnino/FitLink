# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Each app has its own `CLAUDE.md` with commands, architecture, and gotchas — it loads automatically when you work in that directory. This root file covers only cross-cutting concerns.

---

## Repository Structure

FitLink is a monorepo for a fitness coaching platform with four independently runnable apps:

| Directory    | Stack                              | Purpose                                   |
|--------------|------------------------------------|-------------------------------------------|
| `backend/`   | Java 21 + Spring Boot 4 + MongoDB  | REST API + WebSocket server               |
| `webapp/`    | React 19 + TypeScript + Vite       | Admin/trainer dashboard (deployed Vercel) |
| `mobile/`    | React Native 0.85 (bare workflow)  | **Legacy** Android app — being replaced   |
| `mobile-app/`| Expo 54 + expo-router              | **Migration target** — Android + iOS      |

**New mobile features go in `mobile-app/`, not `mobile/`.** See `mobile-app/migration.md` for the migration plan.

## Quick Start

```bash
docker compose up mongodb                # MongoDB first (required by backend)
cd backend && ./mvnw spring-boot:run     # API on :8080, Swagger at /swagger-ui.html
cd webapp && npm run dev                 # Dashboard on :5173
cd mobile-app && npx expo start          # Expo dev server
```

Full commands, env setup, and build instructions are in each app's own `CLAUDE.md`.

## Authentication Flow (all clients)

Firebase handles identity everywhere:

1. Client signs in via Firebase → receives an ID token
2. Every API request sends `Authorization: Bearer <firebase-id-token>`
3. Backend `FirebaseAuthFilter` validates the token via Firebase Admin SDK, extracts the role, and stores an `AuthPrincipal` in `SecurityContextHolder`
4. Spring method security enforces role checks: `TRAINEE` / `TRAINER` / `ADMIN`

Real-time chat uses STOMP over WebSocket at `/ws` (and `/ws-sockjs`) with a custom auth interceptor on handshake.

## Secrets & Env Files (never commit)

Each app reads env differently — don't mix prefixes:

| App          | File                                            | Convention                              |
|--------------|--------------------------------------------------|-----------------------------------------|
| `backend/`   | `src/main/resources/firebase-adminsdk.json`      | Firebase service account key (required) |
| `webapp/`    | `.env` (copy `.env.example`)                     | `VITE_FIREBASE_*`                        |
| `mobile/`    | `.env`                                           | `API_URL` via react-native-config        |
| `mobile-app/`| `.env` (copy `.env.example`)                     | `EXPO_PUBLIC_*`                          |

All `.env` files and `firebase-adminsdk*.json` / `google-services.json` are gitignored.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- **Backend:** Google Java Style; Lombok (`@Data`, `@RequiredArgsConstructor`, `@Builder`) throughout
- **Frontend/Mobile:** ESLint + Prettier; functional components with TypeScript; PascalCase components, camelCase functions
- All three frontends share the same API-layer pattern: a single Axios instance with a Firebase ID-token interceptor (`apiClient.ts`) + per-domain API modules

## CI/CD

| Workflow             | Trigger       | What it does                                        |
|----------------------|---------------|-----------------------------------------------------|
| `ci.yml`             | Pull requests | Backend `mvnw test` + Mobile lint                   |
| `android.yml`        | Push to `main`| Builds signed release APK, publishes GitHub Release |
| `backend-deploy.yml` | Push to `main`| Runs backend tests + builds JAR                     |

Before pushing: run `./mvnw test` for backend changes and `npm run lint` for frontend changes — CI runs both on PRs.
