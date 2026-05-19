import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TraineeTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Courses: undefined;
  Profile: undefined;
};

export type TrainerTabParamList = {
  Home: undefined;
  Clients: undefined;
  Courses: undefined;
  Library: undefined;
  Profile: undefined;
};
export type AdminTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Courses: undefined;
  Profile: undefined;
  Applications: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  AddCourses: { courseId?: string } | undefined;
  TraineeRoot: NavigatorScreenParams<TraineeTabParamList>;
  TrainerRoot: NavigatorScreenParams<TrainerTabParamList>;
  AdminRoot: NavigatorScreenParams<AdminTabParamList>;
  TrainerApplication: undefined;
  AdminApplications: undefined;
  LiveWorkout: { workoutId?: string } | undefined;
  CourseDetail: { courseId?: string } | undefined;
  WeeklyCheckIn: undefined;
  FindTrainer: undefined;
  ExercisePicker:
    | { mode?: 'browse' | 'select'; appendToTemplateId?: string }
    | undefined;
  ExerciseDetail: { exerciseId: string };
  TemplateDetail: { templateId: string };
  TemplateForm:
    | { mode: 'create'; exerciseIds: string[]; pendingExerciseIds?: string[] }
    | { mode: 'edit'; templateId: string; pendingExerciseIds?: string[] };
};
