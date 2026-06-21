# Migration Instructions: /mobile → /mobile-app

## Context for the agent

You are migrating a fully-featured React Native 0.85 app (`/mobile`) into an Expo 54 + expo-router scaffold (`/mobile-app`). The Expo app is currently a blank starter template — zero production code exists there.

**Strategy:** Replace all native modules with Expo SDK equivalents so iOS works in Expo Go (no Apple Developer Account needed). Android still needs `expo-dev-client` for Health Connect.

**Source of truth for all screens, components, hooks, and API logic:** `mobile/src/`  
**Target:** `mobile-app/`

**Package substitution rules (apply everywhere you see the old import):**

| Old import | New import |
|---|---|
| `@react-native-firebase/auth` | `firebase/auth` (JS SDK) |
| `@react-native-firebase/messaging` | `expo-notifications` |
| `@react-native-google-signin/google-signin` | `expo-auth-session/providers/google` |
| `react-native-image-picker` | `expo-image-picker` |
| `@react-native-documents/picker` | `expo-document-picker` |
| `react-native-fs` | `expo-file-system` |
| `react-native-linear-gradient` | `expo-linear-gradient` |
| `react-native-webview` or `react-native-youtube-iframe` | `expo-web-browser` (open URL externally) |
| `react-native-config` (`Config.API_URL`) | `process.env.EXPO_PUBLIC_API_URL` |
| `react-native-health-connect` | keep as-is, Android only |

---

## Phase 1 — Packages & Config

### 1.1 Install packages

Run in `mobile-app/`:

```bash
npx expo install \
  expo-dev-client \
  expo-notifications \
  expo-auth-session \
  expo-web-browser \
  expo-image-picker \
  expo-document-picker \
  expo-file-system \
  expo-linear-gradient \
  expo-build-properties \
  @react-native-async-storage/async-storage \
  @react-native-community/datetimepicker \
  react-native-svg

npm install \
  firebase \
  react-native-health-connect \
  @stomp/stompjs \
  axios \
  lucide-react-native \
  react-native-gifted-charts \
  react-native-body-highlighter \
  text-encoding \
  buffer
```

### 1.2 Replace `app.json`

Overwrite `mobile-app/app.json` entirely with:

```json
{
  "expo": {
    "name": "FitLink",
    "slug": "fitlink",
    "scheme": "fitlink",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "android": {
      "package": "si.feri.fitlink",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "backgroundColor": "#E6F4FE"
      },
      "edgeToEdgeEnabled": true,
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE",
        "android.permission.health.READ_STEPS",
        "android.permission.health.WRITE_STEPS",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.WRITE_HEART_RATE",
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.WRITE_WEIGHT",
        "android.permission.health.READ_HEIGHT",
        "android.permission.health.WRITE_HEIGHT",
        "android.permission.health.READ_BODY_FAT",
        "android.permission.health.WRITE_BODY_FAT",
        "android.permission.health.READ_LEAN_BODY_MASS",
        "android.permission.health.READ_BASAL_METABOLIC_RATE",
        "android.permission.health.WRITE_BASAL_METABOLIC_RATE",
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
        "android.permission.health.WRITE_ACTIVE_CALORIES_BURNED",
        "android.permission.health.READ_TOTAL_CALORIES_BURNED",
        "android.permission.health.WRITE_TOTAL_CALORIES_BURNED",
        "android.permission.health.READ_DISTANCE",
        "android.permission.health.WRITE_DISTANCE",
        "android.permission.health.READ_FLOORS_CLIMBED",
        "android.permission.health.WRITE_FLOORS_CLIMBED",
        "android.permission.health.READ_ELEVATION_GAINED",
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.WRITE_EXERCISE",
        "android.permission.health.READ_SLEEP",
        "android.permission.health.WRITE_SLEEP",
        "android.permission.health.READ_HYDRATION",
        "android.permission.health.WRITE_HYDRATION",
        "android.permission.health.READ_NUTRITION",
        "android.permission.health.READ_BLOOD_PRESSURE",
        "android.permission.health.WRITE_BLOOD_PRESSURE",
        "android.permission.health.READ_OXYGEN_SATURATION",
        "android.permission.health.WRITE_OXYGEN_SATURATION",
        "android.permission.health.READ_RESPIRATORY_RATE",
        "android.permission.health.WRITE_RESPIRATORY_RATE",
        "android.permission.health.READ_BODY_TEMPERATURE",
        "android.permission.health.WRITE_BODY_TEMPERATURE",
        "android.permission.health.READ_RESTING_HEART_RATE",
        "android.permission.health.WRITE_RESTING_HEART_RATE",
        "android.permission.health.READ_VO2_MAX",
        "android.permission.health.WRITE_VO2_MAX",
        "android.permission.health.READ_POWER",
        "android.permission.health.READ_SPEED"
      ]
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "si.feri.fitlink",
      "infoPlist": {
        "NSCameraUsageDescription": "FitLink needs camera access for check-in photos.",
        "NSPhotoLibraryUsageDescription": "FitLink needs photo library access for check-in photos."
      }
    },
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#3B82F6",
          "androidMode": "default",
          "androidCollapsedTitle": "FitLink"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "FitLink needs photo library access for check-in photos.",
          "cameraPermission": "FitLink needs camera access for check-in photos."
        }
      ],
      [
        "expo-build-properties",
        {
          "android": { "minSdkVersion": 26 }
        }
      ],
      ["react-native-health-connect", { "healthConnectVersion": "1.1.0-alpha11" }],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

### 1.3 Create `.env`

Create `mobile-app/.env` (copy Firebase values from `webapp/.env`):

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=790319371268-bpdaobthfgj89ea7jnt3vk2khlco9eju.apps.googleusercontent.com
```

### 1.4 Create `eas.json`

Create `mobile-app/eas.json`:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "gradleCommand": ":app:assembleDebug" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### 1.5 Copy theme

Copy these files verbatim from `mobile/src/theme/` to `mobile-app/constants/`:
- `colors.ts`
- `typography.ts`
- `spacing.ts`
- `shadows.ts`

Delete `mobile-app/constants/Colors.ts` (starter file).

---

## Phase 2 — Firebase & Auth Services

### 2.1 Create `services/firebaseConfig.ts`

Create `mobile-app/services/firebaseConfig.ts`:

```ts
import { initializeApp } from 'firebase/app'
import { getReactNativePersistence, initializeAuth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
})
```

### 2.2 Create `services/authService.ts`

Do NOT copy from `mobile/src/services/authService.ts` — rewrite using Firebase JS SDK:

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  getIdToken,
} from 'firebase/auth'
import { firebaseAuth } from './firebaseConfig'
import { authApi } from '../api/authApi'

export async function register(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  return cred.user
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password)
  return cred.user
}

export async function logout() {
  await authApi.deleteFcmToken().catch(() => {})
  await signOut(firebaseAuth)
}

export async function getToken(): Promise<string> {
  if (!firebaseAuth.currentUser) throw new Error('Not authenticated')
  return getIdToken(firebaseAuth.currentUser)
}

export async function getUser() {
  const { data } = await import('../api/authApi').then(m => m.authApi.getMe())
  return data
}
```

### 2.3 Create `api/apiClient.ts`

Create `mobile-app/api/apiClient.ts`:

```ts
import axios from 'axios'
import { firebaseAuth } from '../services/firebaseConfig'
import { getIdToken } from 'firebase/auth'

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL + '/api',
})

apiClient.interceptors.request.use(async config => {
  if (firebaseAuth.currentUser) {
    const token = await getIdToken(firebaseAuth.currentUser)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
```

### 2.4 Copy API modules

Copy these files verbatim from `mobile/src/api/` to `mobile-app/api/`:
- `authApi.ts`, `chatApi.ts`, `checkInApi.ts`, `coachingApi.ts`
- `exerciseApi.ts`, `healthApi.ts`, `trainerApi.ts`, `userApi.ts`
- `videoCallApi.ts`, `workoutApi.ts`

In each file, update the import:
```ts
// Before
import apiClient from './apiClient'
// After — path stays the same, no change needed if structure matches
```

### 2.5 Copy utility files

Copy verbatim from `mobile/src/utils/` to `mobile-app/utils/`:
- `liveSessionStorage.ts`
- `chatUnreadBus.ts`
- `avatar.ts`
- `calorieCalculator.ts`
- `muscleMapping.ts`
- `setTypeMeta.ts`
- `clientCoaching.ts`

### 2.6 Create `hooks/useAuth.ts`

Copy `mobile/src/hooks/useAuth.ts` then replace the Firebase import:

```ts
// Replace:
import auth from '@react-native-firebase/auth'
// With:
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../services/firebaseConfig'

// Replace auth().onAuthStateChanged(cb) with:
onAuthStateChanged(firebaseAuth, cb)

// Replace auth().currentUser with:
firebaseAuth.currentUser
```

### 2.7 Create Google Sign-In helper

Create `mobile-app/services/googleSignIn.ts`:

```ts
import * as Google from 'expo-auth-session/providers/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { firebaseAuth } from './firebaseConfig'

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  async function signInWithGoogle() {
    const result = await promptAsync()
    if (result.type !== 'success') throw new Error('Google sign-in cancelled')
    const { id_token } = result.params
    const credential = GoogleAuthProvider.credential(id_token)
    return signInWithCredential(firebaseAuth, credential)
  }

  return { signInWithGoogle, request }
}
```

---

## Phase 3 — Root Layout & Navigation Structure

### 3.1 Delete starter app files

Delete these files from `mobile-app/app/`:
- `(tabs)/index.tsx`
- `(tabs)/explore.tsx`
- `(tabs)/_layout.tsx`
- `modal.tsx`

### 3.2 Create `app/_layout.tsx`

```tsx
import { useEffect } from 'react'
import { router, Slot, useSegments } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Register Android notification channel at module level
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('fitlink_default', {
    name: 'FitLink Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  })
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export default function RootLayout() {
  const { user, loading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) {
      router.replace('/(auth)/login')
    } else if (user && inAuth) {
      if (user.role === 'TRAINEE') router.replace('/(trainee)/(tabs)')
      else if (user.role === 'TRAINER') router.replace('/(trainer)/(tabs)')
      else if (user.role === 'ADMIN') router.replace('/(admin)/(tabs)')
    }
  }, [user, loading])

  return <Slot />
}
```

### 3.3 Create navigation route groups

Create the following directory structure under `mobile-app/app/`. Each `_layout.tsx` is described below.

**`app/(auth)/_layout.tsx`** — simple stack:
```tsx
import { Stack } from 'expo-router'
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

**`app/(trainee)/_layout.tsx`** — stack wrapper for all trainee routes:
```tsx
import { Stack } from 'expo-router'
export default function TraineeLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

**`app/(trainee)/(tabs)/_layout.tsx`** — bottom tab navigator matching `TraineeTabs.tsx`:
```tsx
import { Tabs } from 'expo-router'
import { Home, Dumbbell, GraduationCap, MessageSquare, User } from 'lucide-react-native'
import { useUnreadChats } from '../../../hooks/useUnreadChats'

export default function TraineeTabs() {
  const unreadCount = useUnreadChats()
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts', tabBarIcon: ({ color }) => <Dumbbell color={color} size={22} /> }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: ({ color }) => <GraduationCap color={color} size={22} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarBadge: unreadCount > 0 ? unreadCount : undefined, tabBarIcon: ({ color }) => <MessageSquare color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  )
}
```

Create matching `_layout.tsx` files for `(trainer)` and `(admin)`:
- `(trainer)/(tabs)/_layout.tsx` — tabs: Home, Clients, Courses, Chat, Profile (icons: Home, Users, GraduationCap, MessageSquare, User)
- `(admin)/(tabs)/_layout.tsx` — tabs: Home, Workouts, Courses, Applications, Profile (icons: Home, Dumbbell, GraduationCap, FileText, User)

---

## Phase 4 — Screens

### 4.1 Navigation call pattern

Apply these two replacements in every screen file you port:

**Navigating:**
```ts
// Before
navigation.navigate('ScreenName', { id: '123' })
navigation.goBack()

// After
router.push('/path/123')
router.back()
```

**Reading params:**
```ts
// Before
const { id } = route.params

// After
import { useLocalSearchParams } from 'expo-router'
const { id } = useLocalSearchParams<{ id: string }>()
```

### 4.2 Auth screens

| File to create | Source to copy from |
|---|---|
| `app/(auth)/login.tsx` | `mobile/src/screens/auth/LoginScreen.tsx` |
| `app/(auth)/register.tsx` | `mobile/src/screens/auth/RegisterScreen.tsx` |

In `login.tsx`, replace `useGoogleUser()` call with the `useGoogleSignIn()` hook from `services/googleSignIn.ts`.

### 4.3 Trainee screens

| File to create | Source to copy from |
|---|---|
| `app/(trainee)/(tabs)/index.tsx` | `TraineeDashboardScreen.tsx` |
| `app/(trainee)/(tabs)/workouts.tsx` | `WorkoutsListScreen.tsx` |
| `app/(trainee)/(tabs)/courses.tsx` | `CourseListScreen.tsx` |
| `app/(trainee)/(tabs)/chat.tsx` | `ChatListScreen.tsx` |
| `app/(trainee)/(tabs)/profile.tsx` | `ProfileScreen.tsx` |
| `app/(trainee)/health.tsx` | `HealthScreen.tsx` — add iOS manual entry branch (see Phase 7) |
| `app/(trainee)/checkin.tsx` | `WeeklyCheckInScreen.tsx` |
| `app/(trainee)/workout/[id].tsx` | `TemplateDetailScreen.tsx` |
| `app/(trainee)/workout/live.tsx` | `LiveWorkoutScreen.tsx` |
| `app/(trainee)/workout/session/[id].tsx` | `SessionDetailScreen.tsx` |
| `app/(trainee)/calorie-calculator.tsx` | `CalorieCalculatorScreen.tsx` |

### 4.4 Trainer screens

| File to create | Source to copy from |
|---|---|
| `app/(trainer)/(tabs)/index.tsx` | `TrainerDashboardScreen.tsx` |
| `app/(trainer)/(tabs)/clients.tsx` | `ClientsScreen.tsx` |
| `app/(trainer)/(tabs)/courses.tsx` | `CourseListScreen.tsx` |
| `app/(trainer)/(tabs)/chat.tsx` | `ChatListScreen.tsx` |
| `app/(trainer)/(tabs)/profile.tsx` | `ProfileScreen.tsx` |
| `app/(trainer)/client/[id].tsx` | `ClientDetailScreen.tsx` |
| `app/(trainer)/client/[id]/workouts.tsx` | `ClientWorkouts.tsx` |
| `app/(trainer)/client/[id]/health.tsx` | `ClientHealthScreen.tsx` |
| `app/(trainer)/exercises.tsx` | `ExercisePickerScreen.tsx` |
| `app/(trainer)/trainer-application.tsx` | `TrainerApplicationScreen.tsx` |

### 4.5 Admin screens

| File to create | Source to copy from |
|---|---|
| `app/(admin)/(tabs)/index.tsx` | `TraineeDashboardScreen.tsx` |
| `app/(admin)/(tabs)/workouts.tsx` | `WorkoutsListScreen.tsx` |
| `app/(admin)/(tabs)/courses.tsx` | `CourseListScreen.tsx` |
| `app/(admin)/(tabs)/applications.tsx` | `AdminApplicationsScreen.tsx` |
| `app/(admin)/(tabs)/profile.tsx` | `ProfileScreen.tsx` |

### 4.6 Shared modal screens

Create these at `app/` root level (accessible from all role navigators):

| File to create | Source to copy from |
|---|---|
| `app/chat/[id].tsx` | `ConversationScreen.tsx` |
| `app/course/[id].tsx` | `CourseDetailScreen.tsx` |
| `app/exercise/[id].tsx` | `ExerciseDetailScreen.tsx` |
| `app/find-trainer.tsx` | `FindTrainerScreen.tsx` |
| `app/trainer/[id].tsx` | `TrainerProfileScreen.tsx` |

---

## Phase 5 — Hooks & Services

### 5.1 Copy hooks directly

Copy these verbatim from `mobile/src/hooks/` to `mobile-app/hooks/`:
- `useUnreadChats.ts`
- `useLiveSession.ts`
- `useHealthConnect.ts`
- `useCalendarEvents.ts`
- `useClientWeight.ts`
- `useElapsedTime.ts`
- `useDebouncedValue.ts`

### 5.2 Copy health service (Android path)

Copy `mobile/src/services/healthSyncService.ts` to `mobile-app/services/healthSyncService.ts`, then add the iOS branch at the top of `triggerHealthSync`:

```ts
import { Platform } from 'react-native'

export async function triggerHealthSync() {
  if (Platform.OS !== 'android') {
    // iOS: health data is entered manually via the form screen — nothing to sync automatically
    return
  }
  // ... rest of existing Android Health Connect logic unchanged
}
```

### 5.3 Create push notification hooks

Create `mobile-app/hooks/useNotifications.ts` (replaces `useFcmRegistration.ts` + `useFcmHandlers.ts`):

```ts
import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useAuth } from './useAuth'
import { triggerHealthSync } from '../services/healthSyncService'
import { authApi } from '../api/authApi'
import { router } from 'expo-router'

export function useNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Register push token
    ;(async () => {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') return
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data
      // Replace useFcmRegistration: POST token to backend
      await authApi.registerPushToken(token)
    })()

    // Foreground notification handler (replaces useFcmHandlers foreground listener)
    const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as Record<string, string>
      if (data.type === 'health_sync_request') {
        triggerHealthSync()
      }
    })

    // Tap handler (replaces useFcmHandlers notification open listener)
    const tapSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>
      if (data.type === 'chat' && data.conversationId) {
        router.push(`/chat/${data.conversationId}`)
      }
    })

    return () => {
      foregroundSub.remove()
      tapSub.remove()
    }
  }, [user])
}
```

Call `useNotifications()` inside `app/_layout.tsx`'s root component.

### 5.4 Create `useChatSocket.ts`

Copy `mobile/src/hooks/useChatSocket.ts` verbatim — only change the WebSocket URL:

```ts
// Before
const url = Config.API_URL.replace('http', 'ws') + '/ws'
// After
const url = process.env.EXPO_PUBLIC_API_URL!.replace('http', 'ws') + '/ws'
```

---

## Phase 6 — UI Components

### 6.1 Delete starter components

Delete all files in `mobile-app/components/` and `mobile-app/hooks/use-color-scheme.ts`, `mobile-app/hooks/use-theme-color.ts`.

### 6.2 Copy component directories

Copy entire directories from `mobile/src/components/` to `mobile-app/components/`:
- `ui/` (22 files)
- `brand/` (3 files)
- `layout/` (3 files)
- All remaining individual component files (HealthHomeCards, CalendarCards, FilterSheets, etc.)

### 6.3 Apply import replacements in components

For every `.tsx` file in `mobile-app/components/`, apply the package substitution rules from the top of this document. Specific occurrences:

**LinearGradient:**
```ts
// Before
import LinearGradient from 'react-native-linear-gradient'
// After
import { LinearGradient } from 'expo-linear-gradient'
// Props are identical — no other changes needed
```

**YouTube / WebView:**
```tsx
// Before
import YoutubeIframe from 'react-native-youtube-iframe'
<YoutubeIframe videoId={videoId} height={220} />

// After
import * as WebBrowser from 'expo-web-browser'
<Pressable onPress={() => WebBrowser.openBrowserAsync(`https://youtu.be/${videoId}`)}>
  <Text style={{ color: colors.primary }}>Odpri video na YouTube</Text>
</Pressable>
```

---

## Phase 7 — iOS Manual Health Entry

### 7.1 Create `app/(trainee)/health-manual.tsx`

This is a new screen — no source to copy. Create a form with these fields matching the backend `HealthSnapshotDto`:

Fields: weight (kg), steps, activeCalories, totalCalories, distance (m), heartRate, restingHeartRate, sleepDuration (hours), hydration (ml)

On submit: call `healthApi.updateSnapshot(formValues)` (`PUT /health/me/snapshot`).

### 7.2 Update `app/(trainee)/health.tsx`

At the top of the Health screen component, add a Platform check:

```tsx
import { Platform } from 'react-native'
import { router } from 'expo-router'

// Inside the component, where the "Sync" button is:
{Platform.OS === 'android' ? (
  <Button onPress={triggerHealthSync}>Sync with Health Connect</Button>
) : (
  <Button onPress={() => router.push('/(trainee)/health-manual')}>Ročni vnos</Button>
)}
```

---

## Phase 8 — Backend: Push Token Registration

The backend currently stores FCM tokens. Add support for Expo push tokens.

In `backend/src/main/java/si/feri/fitlink/auth/` — add endpoint `POST /user/me/push-token` that accepts `{ "token": "ExponentPushToken[...]" }` and stores it alongside or instead of the FCM token.

When sending push notifications (health sync trigger, chat notifications), use [Expo Push API](https://exp.host/--/api/v2/push/send):

```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

{
  "to": "ExponentPushToken[...]",
  "title": "FitLink",
  "body": "Health sync requested",
  "data": { "type": "health_sync_request" }
}
```

---

## Verification

After each phase, verify nothing is broken before continuing.

**After Phase 1:**
```bash
cd mobile-app && npx expo start
# Should start Metro bundler without import errors
```

**After Phase 2:**
- App loads in Expo Go on iOS
- Login with email/password succeeds
- Firebase token attaches to API requests (check network tab)

**After Phase 3:**
- TRAINEE login → TraineeTabs visible
- TRAINER login → TrainerTabs visible
- ADMIN login → AdminTabs visible

**After Phase 4:**
- Navigate to every screen — no crashes
- `useLocalSearchParams` returns correct values on detail screens

**After Phase 5:**
- Android: Health Connect permissions prompt appears
- iOS: "Ročni vnos" button is visible on Health screen
- Expo push token logged to console on app start
- STOMP WebSocket connects (check Metro logs)

**After Phase 6:**
- LinearGradient renders correctly (no white boxes)
- YouTube button opens external browser
- All icons render (lucide-react-native)

**After Phase 7:**
- iOS health manual form submits → `PUT /health/me/snapshot` returns 200

**Full end-to-end:**
- [ ] Send chat message → recipient receives in real-time
- [ ] Complete live workout → session in history
- [ ] Android: Health sync → data visible on backend
- [ ] iOS: Manual health entry → data visible on backend
- [ ] Push notification triggers health sync on Android
- [ ] `npx eas build --profile development --platform android` succeeds
