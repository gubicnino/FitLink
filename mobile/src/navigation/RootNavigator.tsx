import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ProtectedAdminApplicationsScreen } from '../screens/admin/ProtectedAdminApplicationsScreen';
import { ConversationScreen } from '../screens/chat/ConversationScreen';
import { WeeklyCheckInScreen } from '../screens/checkin/WeeklyCheckInScreen';
import { ClientDetailScreen } from '../screens/coach/ClientDetailScreen';
import { ClientWorkouts } from '../screens/coach/ClientWorkouts';
import { FindTrainerScreen } from '../screens/coach/FindTrainerScreen';
import { TrainerProfileScreen } from '../screens/coach/TrainerProfileScreen';
import { AddCourses } from '../screens/courses/AddCourses';
import { CourseDetailScreen } from '../screens/courses/CourseDetailScreen';
import { ExerciseDetailScreen } from '../screens/exercises/ExerciseDetailScreen';
import { ExercisePickerScreen } from '../screens/exercises/ExercisePickerScreen';
import { CalorieCalculatorScreen } from '../screens/nutrition/CalorieCalculatorScreen';
import { TrainerApplicationScreen } from '../screens/profile/TrainerApplicationScreen';
import { LiveWorkoutScreen } from '../screens/workouts/LiveWorkoutScreen';
import { SessionDetailScreen } from '../screens/workouts/SessionDetailScreen';
import { TemplateDetailScreen } from '../screens/workouts/TemplateDetailScreen';
import { TemplateFormScreen } from '../screens/workouts/TemplateFormScreen';
import { User } from '../types/types';
import { useFcmHandlers } from '../hooks/useFcmHandlers';
import { AdminTabs } from './AdminTabs';
import { AuthStack } from './AuthStack';
import { TraineeTabs } from './TraineeTabs';
import { TrainerTabs } from './TrainerTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

interface RootNavigatorProps {
  user: User | null;
}
export function RootNavigator({ user }: RootNavigatorProps) {

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!user) return 'Auth';
    if (user.role === 'TRAINER') return 'TrainerRoot';
    if (user.role === 'ADMIN') return 'AdminRoot';
    return 'TraineeRoot';
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <FcmHandlersBridge />
      <Stack.Navigator
        key={user?.id ?? 'guest'}
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="TraineeRoot" component={TraineeTabs} />
        <Stack.Screen name="TrainerRoot" component={TrainerTabs} />
        <Stack.Screen name="ClientWorkouts" component={ClientWorkouts} />
        <Stack.Screen name="AdminRoot" component={AdminTabs} />
        <Stack.Screen name="TrainerApplication" component={TrainerApplicationScreen} />
        <Stack.Screen name="AdminApplications" component={ProtectedAdminApplicationsScreen} />
        <Stack.Screen name="CalorieCalculator" component={CalorieCalculatorScreen} />
        <Stack.Screen
          name="LiveWorkout"
          component={LiveWorkoutScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
        <Stack.Screen name="AddCourses" component={AddCourses} />
        <Stack.Screen
          name="WeeklyCheckIn"
          children={({ route }) => (
            <WeeklyCheckInScreen checkIn={route.params?.checkIn ?? null} />
          )}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
        <Stack.Screen name="FindTrainer" component={FindTrainerScreen} />
        <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
        <Stack.Screen
          name="ExercisePicker"
          component={ExercisePickerScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
        <Stack.Screen name="TemplateForm" component={TemplateFormScreen} />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
        <Stack.Screen name="ChatThread" component={ConversationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function FcmHandlersBridge() {
  useFcmHandlers();
  return null;
}
