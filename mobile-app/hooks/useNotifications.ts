import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuth } from './useAuth'
import { triggerHealthSync } from '@/services/healthSyncService'
import { authApi } from '@/api/authApi'

/**
 * Replaces the old useFcmRegistration + useFcmHandlers pair. Registers an Expo
 * push token with the backend and wires foreground / tap handlers.
 */
export function useNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Register push token
    ;(async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync()
        if (status !== 'granted') return
        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data
        await authApi.registerPushToken(token).catch(() => {})
      } catch (err) {
        console.warn('[useNotifications] push token registration failed', err)
      }
    })()

    // Foreground notification handler (replaces useFcmHandlers foreground listener)
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, string>
      if (data.type === 'health_sync_request') {
        triggerHealthSync()
      }
    })

    // Tap handler (replaces useFcmHandlers notification open listener)
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>
      if (data.type === 'chat' && data.conversationId) {
        router.push(`/chat/${data.conversationId}` as any)
      }
    })

    return () => {
      foregroundSub.remove()
      tapSub.remove()
    }
  }, [user])
}
