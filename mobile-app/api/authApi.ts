import { User } from '../types/types'
import apiClient from './apiClient'

/**
 * Auth-related backend calls. In the legacy /mobile app these lived inline in
 * authService; collected here so authService + notification hooks can share them.
 */
export const authApi = {
  getMe: () => apiClient.get<User>('/auth/me'),

  // Legacy FCM token removal (kept for parity with the old logout flow).
  deleteFcmToken: () => apiClient.delete('/user/me/fcm-token'),

  // Expo push token registration (see Phase 8 backend endpoint).
  registerPushToken: (token: string) =>
    apiClient.post('/user/me/push-token', { token }),
}
