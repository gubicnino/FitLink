import { initializeApp } from 'firebase/app'
// getReactNativePersistence exists at runtime in firebase 12 but is missing
// from the published type defs, so the import is suppressed for TypeScript.
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseApp = initializeApp(firebaseConfig)

// initializeAuth with AsyncStorage persistence so the session survives app
// restarts (getAuth() would default to in-memory persistence on React Native).
export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
})
