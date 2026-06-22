import { Tabs } from 'expo-router'
import { GraduationCap, Home, MessageSquare, User, Users } from 'lucide-react-native'
import { useUnreadChats } from '@/hooks/useUnreadChats'

export default function TrainerTabs() {
  const unread = useUnreadChats()
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={1.75} /> }}
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
