import { Tabs } from 'expo-router'
import { Dumbbell, GraduationCap, Home, MessageSquare, User } from 'lucide-react-native'
import { useUnreadChats } from '@/hooks/useUnreadChats'

export default function TraineeTabs() {
  const unread = useUnreadChats()
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: 'Courses', tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.75} /> }}
      />
    </Tabs>
  )
}
