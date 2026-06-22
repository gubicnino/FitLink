import { useEffect } from 'react'
import { router, Slot, useSegments } from 'expo-router'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Notifications from 'expo-notifications'
import 'react-native-reanimated'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'

// Register Android notification channel at module level
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('fitlink_default', {
    name: 'FitLink Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  })
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export default function RootLayout() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  useNotifications()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) {
      router.replace('/(auth)/login')
    } else if (user && inAuth) {
      if (user.role === 'TRAINEE') router.replace('/(trainee)/(tabs)' as any)
      else if (user.role === 'TRAINER') router.replace('/(trainer)/(tabs)' as any)
      else if (user.role === 'ADMIN') router.replace('/(admin)/(tabs)' as any)
    }
  }, [user, loading, segments])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  )
}
