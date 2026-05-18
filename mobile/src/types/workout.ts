// Template

export interface SetTarget {
  targetReps: number;
  targetWeightKg: number;
  restSeconds: number | null;
}

export interface TemplateExercise {
  exerciseId: string;
  order: number;
  sets: SetTarget[];
  notes: string | null;
}

export interface WorkoutTemplate {
  id: string;
  ownerId: string;
  createdBy: string;
  name: string;
  exercises: TemplateExercise[];
  lastEditedBy: string | null;
  lastEditedAt: string | null;
  createdAt: string | null;
}

/** Body zza POST /api/workouts/templates in PUT /api/workouts/templates/{id}. */
export interface TemplateUpsertRequest {
  name: string;
  exercises: TemplateExercise[];
}

//Session

export interface SetResult {
  reps: number;
  weightKg: number;
  rpe: number | null;
  completed: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  sets: SetResult[];
  notes: string | null;
}

export interface TrainerComment {
  text: string;
  authorId: string;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  ownerId: string;
  templateId: string | null;
  name: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMinutes: number;
  exercises: SessionExercise[];
  trainerComment: TrainerComment | null;
}

/** Body za POST /api/workouts/sessions in PATCH /api/workouts/sessions/{id}. */
export interface SessionUpsertRequest {
  templateId?: string | null;
  name: string;
  exercises: SessionExercise[];
}
