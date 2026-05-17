import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ProtectedAdminApplicationsScreen } from '../screens/admin/ProtectedAdminApplicationsScreen';
import { WeeklyCheckInScreen } from '../screens/checkin/WeeklyCheckInScreen';
import { FindTrainerScreen } from '../screens/coach/FindTrainerScreen';
import { CourseDetailScreen } from '../screens/courses/CourseDetailScreen';
import { TrainerApplicationScreen } from '../screens/profile/TrainerApplicationScreen';
import { LiveWorkoutScreen } from '../screens/workouts/LiveWorkoutScreen';
import { AuthStack } from './AuthStack';
import { TraineeTabs } from './TraineeTabs';
import { TrainerTabs } from './TrainerTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRoute?: keyof RootStackParamList;
}

export function RootNavigator({ initialRoute = 'Auth' }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
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
        <Stack.Screen
          name="WeeklyCheckIn"
          component={WeeklyCheckInScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="FindTrainer" component={FindTrainerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
