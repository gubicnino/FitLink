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
  Library: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  TraineeRoot: NavigatorScreenParams<TraineeTabParamList>;
  TrainerRoot: NavigatorScreenParams<TrainerTabParamList>;
  TrainerApplication: undefined;
  AdminApplications: undefined;
  LiveWorkout: { workoutId?: string } | undefined;
  CourseDetail: { courseId?: string } | undefined;
  WeeklyCheckIn: undefined;
  FindTrainer: undefined;
  ExercisePicker: { mode?: 'browse' | 'select' } | undefined;
  CreateTemplate: { exerciseIds: string[] };
};
