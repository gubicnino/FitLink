import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dumbbell, GraduationCap, Home, User } from 'lucide-react-native';
import type { TraineeTabParamList } from './types';
import { BottomTabBar } from '../components/layout';
import { TraineeDashboardScreen } from '../screens/dashboard/TraineeDashboardScreen';
import { WorkoutsListScreen } from '../screens/workouts/WorkoutsListScreen';
import { CourseListScreen } from '../screens/courses/CourseListScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TraineeTabParamList>();

export function TraineeTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={TraineeDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsListScreen}
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => (
            <Dumbbell size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CourseListScreen}
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => (
            <GraduationCap size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.75} />,
        }}
      />
    </Tab.Navigator>
  );
}
