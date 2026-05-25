import { useCallback, useEffect, useRef, useState } from 'react';
import auth from '@react-native-firebase/auth';
import { liveSessionStorage } from '../utils/liveSessionStorage';
import type {
  LiveExercise,
  LiveSessionState,
  LiveSet,
  WorkoutTemplate,
} from '../types/workout';

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ZBuildamo fresh "LiveSessionState" from a template + a name -> thumbnail map
export function buildSessionFromTemplate(
  template: WorkoutTemplate,
  exerciseLookup: ReadonlyMap<string, { name: string; category: string | null; thumbnailUrl: string | null }>,
): LiveSessionState {
  return {
    version: 1,
    templateId: template.id,
    name: template.name,
    startedAt: new Date().toISOString(),
    exercises: template.exercises.map<LiveExercise>(ex => {
      const lookup = exerciseLookup.get(ex.exerciseId);
      return {
        id: makeId(),
        exerciseId: ex.exerciseId,
        name: lookup?.name ?? ex.exerciseId,
        category: lookup?.category ?? null,
        thumbnailUrl: lookup?.thumbnailUrl ?? null,
        addedLive: false,
        sets: ex.sets.map<LiveSet>(s => ({
          id: makeId(),
          reps: s.targetReps,
          weightKg: s.targetWeightKg,
          restSeconds: s.restSeconds,
          completed: false,
          setType: s.setType ?? 'NORMAL',
        })),
      };
    }),
  };
}



export function useLiveSession() {
  const [session, setSession] = useState<LiveSessionState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    () => auth().currentUser?.uid ?? null,
  );

  // Rehidraci0ja vedno ko se spremeni Firebase auth user (login/logout/switch).
  // Za neavtenticirano stanje samo pobrisemo session iz memmory
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = auth().onAuthStateChanged(firebaseUser => {
      const nextUid = firebaseUser?.uid ?? null;
      setCurrentUserId(prev => (prev === nextUid ? prev : nextUid));

      if (!nextUid) {
        if (!cancelled) {
          setSession(null);
          setHydrated(true);
        }
        return;
      }

      setHydrated(false);
      liveSessionStorage.load(nextUid).then(loaded => {
        if (cancelled) return;
        setSession(loaded ?? null);
        setHydrated(true);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);


  // Persist on every state change. Skip first render so we don't immediately
  // overwrite sveze hidrirane session z initial "null"
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!hydrated || !currentUserId) return;
    if (session) {
      liveSessionStorage.save(currentUserId, session).catch(err =>
        console.warn('[useLiveSession] persist failed', err),
      );
    } else {
      liveSessionStorage.clear(currentUserId).catch(() => {});
    }
  }, [session, hydrated, currentUserId]);


  const start = useCallback((next: LiveSessionState) => {
    setSession(next);
  }, []);


  const discard = useCallback(async (): Promise<void> => {
    if (currentUserId) {
      await liveSessionStorage.clear(currentUserId).catch(err =>
        console.warn('[useLiveSession] discard clear failed', err),
      );
    }
    setSession(null);
  }, [currentUserId]);

  const updateSet = useCallback(
    (exerciseId: string, setId: string, patch: Partial<LiveSet>) => {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map(ex =>
            ex.id !== exerciseId
              ? ex
              : { ...ex, sets: ex.sets.map(s => (s.id === setId ? { ...s, ...patch } : s)) },
          ),
        };
      });
    },
    [],
  );

  const toggleSetCompleted = useCallback((exerciseId: string, setId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id !== exerciseId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map(s =>
                  s.id === setId ? { ...s, completed: !s.completed } : s,
                ),
              },
        ),
      };
    });
  }, []);

  const addSet = useCallback((exerciseId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const last = ex.sets[ex.sets.length - 1];
          const newSet: LiveSet = {
            id: makeId(),
            reps: last?.reps ?? 10,
            weightKg: last?.weightKg ?? 0,
            restSeconds: last?.restSeconds ?? null,
            completed: false,
            setType: 'NORMAL',
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }),
      };
    });
  }, []);

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id !== exerciseId
            ? ex
            : { ...ex, sets: ex.sets.filter(s => s.id !== setId) },
        ),
      };
    });
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.filter(ex => ex.id !== exerciseId) };
    });
  }, []);

  const appendExercises = useCallback(
    (newOnes: Omit<LiveExercise, 'id' | 'sets' | 'addedLive'>[]) => {
      setSession(prev => {
        if (!prev) return prev;
        const newItems: LiveExercise[] = newOnes.map(e => ({
          ...e,
          id: makeId(),
          addedLive: true,
          sets: [
            {
              id: makeId(),
              reps: 10,
              weightKg: 0,
              restSeconds: null,
              completed: false,
              setType: 'NORMAL',
            },
          ],
        }));
        return { ...prev, exercises: [...prev.exercises, ...newItems] };
      });
    },
    [],
  );

  return {
    session,
    hydrated,
    start,
    discard,
    updateSet,
    toggleSetCompleted,
    addSet,
    removeSet,
    removeExercise,
    appendExercises,
  };
}

export { makeId };
