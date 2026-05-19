import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ProtectedAdminApplicationsScreen } from '../screens/admin/ProtectedAdminApplicationsScreen';
import { WeeklyCheckInScreen } from '../screens/checkin/WeeklyCheckInScreen';
import { FindTrainerScreen } from '../screens/coach/FindTrainerScreen';
import { AddCourses } from '../screens/courses/AddCourses';
import { CourseDetailScreen } from '../screens/courses/CourseDetailScreen';
import { ExerciseDetailScreen } from '../screens/exercises/ExerciseDetailScreen';
import { ExercisePickerScreen } from '../screens/exercises/ExercisePickerScreen';
import { TrainerApplicationScreen } from '../screens/profile/TrainerApplicationScreen';
import { LiveWorkoutScreen } from '../screens/workouts/LiveWorkoutScreen';
import { TemplateDetailScreen } from '../screens/workouts/TemplateDetailScreen';
import { TemplateFormScreen } from '../screens/workouts/TemplateFormScreen';
import { User } from '../types/types';
import { AuthStack } from './AuthStack';
import { TraineeTabs } from './TraineeTabs';
import { TrainerTabs } from './TrainerTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  user: User | null;
}
export function RootNavigator({ user }: RootNavigatorProps) {

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!user) return 'Auth';
    if (user.role === 'TRAINER') return 'TrainerRoot';
    if (user.role === 'ADMIN') return 'AdminApplications';
    return 'TraineeRoot';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="TraineeRoot" component={TraineeTabs} />
        <Stack.Screen name="TrainerRoot" component={TrainerTabs} />
        <Stack.Screen name="TrainerApplication" component={TrainerApplicationScreen} />
        <Stack.Screen name="AdminApplications" component={ProtectedAdminApplicationsScreen} />
        <Stack.Screen
          name="LiveWorkout"
          component={LiveWorkoutScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
        <Stack.Screen name="AddCourses" component={AddCourses} />
        <Stack.Screen
          name="WeeklyCheckIn"
          component={WeeklyCheckInScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="FindTrainer" component={FindTrainerScreen} />
        <Stack.Screen
          name="ExercisePicker"
          component={ExercisePickerScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
        <Stack.Screen name="TemplateForm" component={TemplateFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}