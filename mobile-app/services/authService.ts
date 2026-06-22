import {
  createUserWithEmailAndPassword,
  getIdToken,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { firebaseAuth } from './firebaseConfig'
import { authApi } from '../api/authApi'
import { User } from '../types/types'
import { liveSessionStorage } from '../utils/liveSessionStorage'

let registrationInProgress = false

const setRegistrationInProgress = (value: boolean) => {
  registrationInProgress = value
}

export const authService = {
  beginRegistration: () => setRegistrationInProgress(true),
  endRegistration: () => setRegistrationInProgress(false),
  isRegistrationInProgress: () => registrationInProgress,

  register: async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    return cred.user
  },

  login: async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password)
    return cred.user
  },

  logout: async () => {
    const uid = firebaseAuth.currentUser?.uid
    // Clear current user's live workout BEFORE signOut so we still know who it
    // belonged to, then wipe ALL user-scoped sessions so a shared device cannot
    // leak previous accounts' workouts into the next login.
    if (uid) {
      await liveSessionStorage.clear(uid).catch(() => {})
    }
    await liveSessionStorage.clearAllUsers().catch(() => {})
    // Drop the push token on the backend so we stop pushing to a device that
    // may be picked up by the next account that logs in here.
    await authApi.deleteFcmToken().catch(() => {})
    await signOut(firebaseAuth)
  },

  getToken: async (): Promise<string | null> => {
    const user = firebaseAuth.currentUser
    if (!user) return null
    return getIdToken(user)
  },

  getUser: async (): Promise<User | null> => {
    try {
      if (!firebaseAuth.currentUser) return null
      const res = await authApi.getMe()
      return res.data as User
    } catch (error) {
      console.error('authService.getUser error:', error)
      return null
    }
  },
}
