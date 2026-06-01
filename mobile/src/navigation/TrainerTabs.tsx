import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GraduationCap, Home, MessageSquare, User, Users } from 'lucide-react-native';
import type { TrainerTabParamList } from './types';
import { BottomTabBar } from '../components/layout';
import { TrainerDashboardScreen } from '../screens/coach/TrainerDashboardScreen';
import { ClientsScreen } from '../screens/coach/ClientsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { CourseListScreen } from '../screens/courses/CourseListScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { useUnreadChats } from '../hooks/useUnreadChats';

const Tab = createBottomTabNavigator<TrainerTabParamList>();

export function TrainerTabs() {
  const unread = useUnreadChats();
  return (
    <Tab.Navigator
      tabBar={props => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={TrainerDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} strokeWidth={1.75} />,
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
