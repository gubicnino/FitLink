# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** `CLAUDE.md` is listed in `.gitignore` under "Claude Code session context (per-developer)". If you want this shared, remove that entry.

---

## Repository Structure

FitLink is a monorepo for a fitness coaching platform with three independently runnable apps:

| Directory    | Stack                              | Purpose                                  |
|--------------|------------------------------------|------------------------------------------|
| `backend/`   | Java 21 + Spring Boot 4 + MongoDB  | REST API + WebSocket server              |
| `webapp/`    | React 19 + TypeScript + Vite       | Admin/trainer dashboard (deployed Vercel)|
| `mobile/`    | React Native 0.85 (bare workflow)  | Current Android app (being replaced)     |
| `mobile-app/`| Expo 54 + expo-router + Expo Go    | Migration target — Android + iOS         |

---

## Development Commands

### Backend

MongoDB must be running first:
```bash
docker compose up mongodb
```

Run backend:
```bash
cd backend && mvn spring-boot:run
# OR using Maven wrapper:
cd backend && ./mvnw spring-boot:run
```

Run tests:
```bash
cd backend && ./mvnw test
```

Swagger UI: `http://localhost:8080/swagger-ui.html`

**Required secrets (not in repo):**
- `backend/src/main/resources/firebase-adminsdk.json` — Firebase service account key

### Webapp

```bash
cd webapp && npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # tsc + vite build
npm run lint      # ESLint
```

**Required:** Copy `.env.example` to `.env` and fill Firebase credentials (`VITE_FIREBASE_*`).

### Mobile (React Native — primary app)

```bash
cd mobile && npm install
# Terminal 1:
npm start                              # Metro bundler
# Terminal 2:
npx react-native run-android --no-packager
```

Run tests:
```bash
npm test   # Jest
```

**Required:** Create `mobile/.env` with `API_URL=http://10.0.2.2:8080` (emulator localhost alias).

Physical device: run `adb reverse tcp:8081 tcp:8081` after connecting via USB.

Build debug APK:
```bash
cd mobile/android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/
```

Release APKs are built automatically by GitHub Actions on push to `main`.

### Mobile-App (Expo — migration target)

**Required:** Create `mobile-app/.env` — copy Firebase values from `webapp/.env` with `EXPO_PUBLIC_` prefix (see `mobile-app/migration.md` for full template).

```bash
cd mobile-app && npm install

# iOS — runs in Expo Go, no Apple Developer Account needed
npx expo start
# Open Expo Go on iPhone → scan QR code

# Android — requires expo-dev-client build (Health Connect is a native module)
npx eas build --profile development --platform android
# Install the APK once, then for JS-only changes:
npx expo start --dev-client
```

**Important:** `mobile-app` uses the **Firebase JS SDK** (`firebase` npm package), not `@react-native-firebase/*`. Auth is via `firebase/auth`, not native modules.

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
Read `mobile-app/migration.md` for the full step-by-step migration instructions.

---

## Architecture

### Authentication Flow

Firebase handles identity on all clients. The flow:
1. Client signs in via Firebase → receives an ID token
2. Every API request sends `Authorization: Bearer <firebase-id-token>`
3. Backend `FirebaseAuthFilter` (`auth/FirebaseAuthFilter.java`) validates the token via Firebase Admin SDK, extracts the user's role, and stores an `AuthPrincipal` in `SecurityContextHolder`
4. Spring method security (`@EnableMethodSecurity`) enforces role checks (TRAINEE / TRAINER / ADMIN)

### Backend Domain Structure

Package: `si.feri.fitlink.<domain>` — strict layered architecture per domain:

```
Controller → Service → Repository (Spring Data MongoDB)
```

Each domain has its own DTOs separate from `@Document` entities. Key domains:
- `auth/` — Firebase token filter + auth controller
- `coaching/` — Trainer–trainee relationships
- `workout/` — Templates and completed sessions
- `exercise/` — Exercise library
- `health/` — Wearable/Health Connect sync
- `checkin/` — Weekly trainee check-ins
- `course/` — Trainer-published courses
- `chat/` — Messaging (REST for history + WebSocket for real-time)
- `config/` — `SecurityConfig`, `FirebaseConfig`, CORS, Jackson

WebSocket: STOMP protocol at `/ws` and `/ws-sockjs`. Custom auth interceptor handles handshake.

### Webapp API Layer

All HTTP calls go through a single Axios instance in `src/api/apiClient.ts`, which has an interceptor that attaches the Firebase ID token. Per-domain API modules (`workoutApi.ts`, `chatApi.ts`, etc.) import this instance.

Global auth state lives in `src/context/AuthContext.tsx`. Routes are guarded by `ProtectedRoute` (auth) and `RoleRoute` (TRAINER/ADMIN).

### Mobile Source Layout

```
mobile/src/
├── api/          # Axios-based API modules (mirrors webapp pattern)
├── components/   # Shared UI components
├── hooks/        # Custom hooks
├── navigation/   # React Navigation setup (bottom tabs + stacks per role)
├── screens/      # Organized by role: admin/, trainer/, trainee/
├── services/     # Business logic (auth, health connect)
├── theme/        # Colors, spacing, typography constants
└── types/        # Shared TypeScript interfaces
```

### Mobile-App Source Layout (Expo migration target)

```
mobile-app/
├── app/                   # expo-router file-based routes
│   ├── _layout.tsx        # Root: auth guard + role redirect
│   ├── (auth)/            # Login, Register
│   ├── (trainee)/         # Trainee tabs + nested screens
│   ├── (trainer)/         # Trainer tabs + nested screens
│   └── (admin)/           # Admin tabs
├── api/                   # Axios modules (same as mobile/src/api/)
├── components/            # UI components (ported from mobile/src/components/)
├── constants/             # colors.ts, typography.ts, spacing.ts, shadows.ts
├── hooks/                 # Custom hooks (useAuth, useChatSocket, etc.)
├── services/              # firebaseConfig.ts, authService.ts, healthSyncService.ts
└── utils/                 # Utility helpers (same as mobile/src/utils/)
```

Role-based navigation is file-based (expo-router groups) instead of imperative React Navigation stacks. Auth state comes from Firebase JS SDK via `services/firebaseConfig.ts`.

---

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Backend:** Google Java Style; Lombok (`@Data`, `@RequiredArgsConstructor`) throughout
- **Frontend/Mobile:** ESLint + Prettier; functional components with TypeScript; PascalCase components, camelCase functions

## CI/CD

| Workflow               | Trigger              | What it does                                        |
|------------------------|----------------------|-----------------------------------------------------|
| `ci.yml`               | Pull requests        | Backend `mvnw test` + Mobile lint                   |
| `android.yml`          | Push to `main`       | Builds signed release APK, publishes GitHub Release |
| `backend-deploy.yml`   | Push to `main`       | Runs backend tests + builds JAR                     |
