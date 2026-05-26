import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dumbbell, GraduationCap, Home, MessageSquare, User } from 'lucide-react-native';
import type { TraineeTabParamList } from './types';
import { BottomTabBar } from '../components/layout';
import { TraineeDashboardScreen } from '../screens/dashboard/TraineeDashboardScreen';
import { WorkoutsListScreen } from '../screens/workouts/WorkoutsListScreen';
import { CourseListScreen } from '../screens/courses/CourseListScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { useUnreadChats } from '../hooks/useUnreadChats';

const Tab = createBottomTabNavigator<TraineeTabParamList>();

export function TraineeTabs() {
  const unread = useUnreadChats();
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
        name="Chat"
        component={ChatListScreen}
        options={{
          title: 'Chat',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} strokeWidth={1.75} />
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
