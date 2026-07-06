# webapp/CLAUDE.md

React 19 + TypeScript + Vite admin/trainer dashboard. Deployed on Vercel (`vercel.json` handles SPA rewrites). See root `CLAUDE.md` for the auth flow.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b + vite build — run this to verify changes compile
npm run lint      # ESLint (flat config, eslint.config.js)
```

**There are no tests.** Verification = `npm run build` + `npm run lint` must both pass.

**Required:** copy `.env.example` → `.env` and fill `VITE_FIREBASE_*` values. API base URL is the backend on `:8080`.

## Architecture

```
src/
├── api/          # apiClient.ts (Axios + Firebase token interceptor) + per-domain modules
├── components/   # ProtectedRoute, RoleRoute, brand/, layout/, ui/
├── context/      # AuthContext.tsx — global auth state
├── pages/        # By role: admin/, trainer/, plus Home/Login/NoAccess
├── services/     # authService.ts, firebaseConfig.ts
├── theme/        # colors.ts, spacing.ts, typography.ts, shadows.ts
└── types/        # Shared TS interfaces
```

Patterns to follow:

- **All HTTP goes through `src/api/apiClient.ts`** — it attaches the Firebase ID token. New endpoints go in the matching per-domain module (`workoutApi.ts`, `chatApi.ts`, …); never create a second Axios instance.
- **Routing:** react-router v7. Wrap authed routes in `ProtectedRoute`; role-restricted routes additionally in `RoleRoute` (TRAINER/ADMIN). This dashboard is trainer/admin-facing — trainees use the mobile app.
- **Styling:** use constants from `src/theme/` (colors, spacing, typography, shadows) instead of hardcoded values. Icons come from `lucide-react`.
- **Auth state:** read from `AuthContext` (`useAuth`-style consumption), never from Firebase directly in components.
