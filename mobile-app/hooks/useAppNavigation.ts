import { useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'

/**
 * Compatibility layer that lets the ported React-Navigation screens keep their
 * original `navigation.navigate('RouteName', params)` / `route.params` call
 * sites while routing through expo-router under the hood.
 *
 * Centralising the route-name -> path mapping here means the 50+ navigate()
 * call sites across the screens did not have to be individually rewritten.
 */

type AnyParams = Record<string, any> | undefined

// JSON-encode object/array params so they survive expo-router's string-only
// query params; drop undefined/null entries.
function enc(params?: AnyParams): Record<string, string> | undefined {
  if (!params) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
  return out
}

type Target = { pathname: string; params?: Record<string, string> }

const ROUTES: Record<string, (p?: AnyParams) => Target> = {
  // Auth
  Login: () => ({ pathname: '/(auth)/login' }),
  Register: () => ({ pathname: '/(auth)/register' }),
  // Role roots
  TraineeRoot: () => ({ pathname: '/(trainee)/(tabs)' }),
  TrainerRoot: () => ({ pathname: '/(trainer)/(tabs)' }),
  AdminRoot: () => ({ pathname: '/(admin)/(tabs)' }),
  Home: () => ({ pathname: '/(trainee)/(tabs)' }),
  // Trainee stack
  CalorieCalculator: () => ({ pathname: '/(trainee)/calorie-calculator' }),
  Health: () => ({ pathname: '/(trainee)/health' }),
  WeeklyCheckIn: (p) => ({ pathname: '/(trainee)/checkin', params: enc({ checkIn: p?.checkIn }) }),
  LiveWorkout: (p) => ({
    pathname: '/(trainee)/workout/live',
    params: enc({ templateId: p?.templateId, pendingExerciseIds: p?.pendingExerciseIds }),
  }),
  TemplateDetail: (p) => ({
    pathname: '/(trainee)/workout/[templateId]',
    params: enc({ templateId: p?.templateId, canStart: p?.canStart }),
  }),
  SessionDetail: (p) => ({
    pathname: '/(trainee)/workout/session/[sessionId]',
    params: { sessionId: String(p?.sessionId) },
  }),
  TemplateForm: (p) => ({ pathname: '/workout-form', params: enc(p) }),
  // Shared
  CourseDetail: (p) => ({
    pathname: '/course/[courseId]',
    params: { courseId: String(p?.courseId ?? '') },
  }),
  ExerciseDetail: (p) => ({
    pathname: '/exercise/[exerciseId]',
    params: { exerciseId: String(p?.exerciseId) },
  }),
  ExercisePicker: (p) => ({ pathname: '/(trainer)/exercises', params: enc(p) }),
  ChatThread: (p) => ({
    pathname: '/chat/[conversationId]',
    params: { conversationId: String(p?.conversationId) },
  }),
  FindTrainer: () => ({ pathname: '/find-trainer' }),
  TrainerProfile: (p) => ({
    pathname: '/trainer/[trainerId]',
    params: { trainerId: String(p?.trainerId) },
  }),
  TrainerApplication: () => ({ pathname: '/(trainer)/trainer-application' }),
  AdminApplications: () => ({ pathname: '/(admin)/(tabs)/applications' }),
  AddCourses: (p) => ({ pathname: '/add-courses', params: enc({ courseId: p?.courseId }) }),
  // Trainer client stack
  ClientDetail: (p) => ({
    pathname: '/(trainer)/client/[clientId]',
    params: enc({ clientId: p?.client?.id, coaching: p?.coaching, client: p?.client }),
  }),
  ClientWorkouts: (p) => ({
    pathname: '/(trainer)/client/[clientId]/workouts',
    params: enc({ clientId: p?.traineeId, traineeId: p?.traineeId }),
  }),
  ClientHealth: (p) => ({
    pathname: '/(trainer)/client/[clientId]/health',
    params: enc({ clientId: p?.traineeId, traineeId: p?.traineeId, traineeName: p?.traineeName }),
  }),
}

function resolve(name: string, params?: AnyParams): Target | null {
  const fn = ROUTES[name]
  if (!fn) {
    console.warn('[useAppNavigation] unmapped route:', name)
    return null
  }
  return fn(params)
}

export function useAppNavigation() {
  return {
    // Supports both navigate('Name', params) and the object form
    // navigate({ name, params, merge }) used by a few screens.
    navigate: (
      nameOrConfig: string | { name: string; params?: AnyParams; merge?: boolean },
      params?: AnyParams,
    ) => {
      const name = typeof nameOrConfig === 'string' ? nameOrConfig : nameOrConfig.name
      const p = typeof nameOrConfig === 'string' ? params : nameOrConfig.params
      const t = resolve(name, p)
      if (t) router.push({ pathname: t.pathname as any, params: t.params })
    },
    push: (name: string, params?: AnyParams) => {
      const t = resolve(name, params)
      if (t) router.push({ pathname: t.pathname as any, params: t.params })
    },
    replace: (name: string, params?: AnyParams) => {
      const t = resolve(name, params)
      if (t) router.replace({ pathname: t.pathname as any, params: t.params })
    },
    goBack: () => {
      if (router.canGoBack()) router.back()
    },
    canGoBack: () => router.canGoBack(),
    // No-ops kept so existing call sites compile; redirects are driven by the
    // root layout's auth effect.
    dispatch: (_action?: any) => {},
    reset: (_state?: any) => {},
    setOptions: (_options?: any) => {},
    setParams: (params: AnyParams) => router.setParams(enc(params)),
    addListener: (_event?: any, _cb?: any) => () => {},
  }
}

/**
 * Mirrors React-Navigation's `useRoute()` shape ({ params }), decoding any
 * JSON-encoded object params back into objects.
 */
export function useAppRoute<T = Record<string, any>>(): { params: T } {
  const raw = useLocalSearchParams()
  // Memoize on the serialized raw params so the parsed object (and any nested
  // objects/arrays) keeps a stable identity across renders. Without this,
  // screens that put a parsed param object in a useEffect dependency array
  // would re-run their effect every render and loop infinitely.
  const key = JSON.stringify(raw)
  return useMemo(() => {
    const params: Record<string, any> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try {
          params[k] = JSON.parse(v)
          continue
        } catch {
          // fall through, keep raw string
        }
      }
      params[k] = v
    }
    return { params: params as T }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
