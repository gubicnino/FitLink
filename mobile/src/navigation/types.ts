import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CheckIn } from '../types/checkin';

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
  CalorieCalculator: undefined;
  LiveWorkout:
    | { templateId: string; pendingExerciseIds?: string[] }
    | undefined;
  CourseDetail: { courseId?: string } | undefined;
  WeeklyCheckIn: { checkIn?: CheckIn | null } | undefined;
  FindTrainer: undefined;
  ExercisePicker:
    | {
        mode?: 'browse' | 'select';
        appendToTemplateId?: string;
        appendToLiveSession?: boolean;
      }
    | undefined;
  ExerciseDetail: { exerciseId: string };
  TemplateDetail: { templateId: string };
  SessionDetail: { sessionId: string };
  TemplateForm:
    | { mode: 'create'; exerciseIds: string[]; pendingExerciseIds?: string[] }
    | { mode: 'edit'; templateId: string; pendingExerciseIds?: string[] };
};
