# mobile/CLAUDE.md

> **⚠️ LEGACY APP.** This bare React Native 0.85 app is being replaced by `mobile-app/` (Expo).
> - **New features → `mobile-app/`.** Only critical bug fixes belong here.
> - If you fix something here that also exists in `mobile-app/`, port the fix there too.
> - `mobile/src/` is the source-of-truth reference for the migration (see `mobile-app/migration.md`).

## Commands

```bash
npm install
npm start                                  # Terminal 1: Metro bundler
npx react-native run-android --no-packager # Terminal 2
npm test                                   # Jest (single: npm test -- SomeName)
npm run lint
cd android && ./gradlew assembleDebug      # APK → android/app/build/outputs/apk/debug/
```

- **Required:** `mobile/.env` with `API_URL=http://10.0.2.2:8080` (Android emulator alias for localhost), read via `react-native-config`.
- Physical device: `adb reverse tcp:8081 tcp:8081` after USB connect.
- Release APKs are built by GitHub Actions (`android.yml`) on push to `main`.

## Key Differences from mobile-app

This app uses **native modules** the Expo app deliberately avoids — don't copy these imports into `mobile-app/`:

- `@react-native-firebase/*` (auth, messaging) — mobile-app uses the Firebase **JS SDK**
- `@react-native-google-signin/google-signin`, `react-native-image-picker`, `react-native-fs`, `react-native-config`, `react-native-webview` — mobile-app uses Expo equivalents (substitution table in `mobile-app/migration.md`)

## Layout

```
src/
├── api/          # Axios modules (apiClient.ts + per-domain)
├── components/   # Shared UI
├── hooks/        # Custom hooks
├── navigation/   # React Navigation: bottom tabs + stacks per role
├── screens/      # By role: admin/, trainer/, trainee/
├── services/     # auth, health connect
├── theme/        # colors, spacing, typography
└── types/        # Shared TS interfaces
```
