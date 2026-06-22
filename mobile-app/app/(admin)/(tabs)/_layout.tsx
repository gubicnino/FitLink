import { Tabs } from 'expo-router'
import { Dumbbell, FileText, GraduationCap, Home, User } from 'lucide-react-native'

export default function AdminTabs() {
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
        name="applications"
        options={{ title: 'Applications', tabBarIcon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.75} /> }}
      />
    </Tabs>
  )
}
