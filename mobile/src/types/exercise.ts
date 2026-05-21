export interface ExerciseSummary {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  thumbnailUrl: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string | null;
  images: string[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ExerciseFacets {
  categories: string[];
  levels: string[];
  muscles: string[];
}

export interface ExerciseListParams {
  page?: number;
  size?: number;
  sort?: string;
  category?: string;
  level?: string;
  muscle?: string;
  q?: string;
}
