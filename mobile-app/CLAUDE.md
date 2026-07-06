@AGENTS.md

# mobile-app/CLAUDE.md

Expo 54 + expo-router app — the migration target replacing `mobile/`. Runs on Android + iOS. Read `migration.md` for the full migration plan and package substitution table; `mobile/src/` is the reference implementation for screens/logic being ported.

## Commands

```bash
npm install
npx expo start                    # iOS: open Expo Go on iPhone → scan QR (no Apple Dev Account needed)
npm run lint                      # expo lint — the only automated check; no tests exist

# Android needs a dev-client build (Health Connect is a native module, won't run in Expo Go):
npx eas build --profile development --platform android
npx expo start --dev-client       # after the APK is installed, for JS-only changes
```

**Required:** copy `.env.example` → `.env` and fill all `EXPO_PUBLIC_*` values (Firebase config + Google OAuth client IDs + `EXPO_PUBLIC_API_URL`). Android emulator API URL: `http://10.0.2.2:8080`.

## Hard Rules

- **Firebase JS SDK only** (`firebase` npm package). Never import `@react-native-firebase/*` — auth is `firebase/auth`, push is `expo-notifications`.
- **Don't "fix" `services/firebaseConfig.ts`:** it uses `initializeAuth` + `getReactNativePersistence(AsyncStorage)` with a `@ts-ignore` (the function exists at runtime in firebase 12 but is missing from type defs). Switching to `getAuth()` silently breaks session persistence on React Native.
- **No bare-RN native modules** — use Expo SDK equivalents per the substitution table in `migration.md`. Sole exception: `react-native-health-connect` (Android only, requires the dev client).
- Check Expo v54 docs (https://docs.expo.dev/versions/v54.0.0/) before writing Expo API code — APIs move between SDK versions.

## Architecture

```
app/                    # expo-router file-based routes
├── _layout.tsx         # Root: auth guard + role redirect (useSegments-based)
├── (auth)/             # Login, Register
├── (trainee)/(tabs)/   # Trainee tab navigator + nested screens
├── (trainer)/(tabs)/   # Trainer tab navigator + nested screens
├── (admin)/(tabs)/     # Admin tabs
└── chat/, course/, exercise/, workout-form.tsx, …  # Shared modal/detail routes
api/                    # apiClient.ts + per-domain modules (mirrors webapp pattern)
components/             # brand/, calendar/, filters/, health/, layout/, ui/
constants/              # colors, spacing, typography, shadows, theme, healthPermissions
hooks/                  # useAuth, useChatSocket, useHealthConnect, useNotifications, …
services/               # firebaseConfig, authService, googleSignIn, healthSyncService
utils/                  # helpers (mediaPicker, muscleMapping, …)
```

Patterns to follow:

- **Navigation is file-based** (expo-router groups per role) — no imperative React Navigation stacks. Role redirect happens only in the root `_layout.tsx`; don't add per-screen role guards.
- **Path alias:** import project files as `@/hooks/useAuth` etc. (`@/*` in tsconfig).
- **API calls:** all through `api/apiClient.ts` (attaches Firebase ID token, base URL `${EXPO_PUBLIC_API_URL}/api`). New endpoints go in the matching per-domain module.
- **Auth state:** consume via `hooks/useAuth.ts`, not Firebase directly in components.
- **Styling:** constants from `constants/` (note: `constants/`, not `theme/` like the other apps). Icons: `lucide-react-native`.

## Gotchas

- **Health Connect is Android-only:** guard with `Platform.OS === 'android'` and lazy-import; iOS/Expo Go must not crash. Permissions are declared in both `constants/healthPermissions.ts` and `app.json` — keep them in sync.
- **Chat:** STOMP over WebSocket via `@stomp/stompjs` (`hooks/useChatSocket.ts`). The `text-encoding` and `buffer` packages are polyfills stompjs needs in React Native — don't remove them.
- Adding a package: use `npx expo install <pkg>` (not `npm install`) for anything with native code so versions match SDK 54.
- Changing `app.json` (permissions, plugins, native config) requires a new EAS dev-client build; JS-only changes don't.
