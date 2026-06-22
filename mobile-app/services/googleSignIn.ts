import { Platform } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { firebaseAuth } from './firebaseConfig'

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

// expo-auth-session's Google provider throws at render time if the current
// platform's client id is missing. This placeholder keeps the Login/Register
// screens mountable before a real id is configured; signInWithGoogle refuses to
// actually run until `googleConfigured` is true.
const PLACEHOLDER = 'unconfigured.apps.googleusercontent.com'

/** Whether a real Google OAuth client id is set for the current platform. */
export const googleConfigured =
  Platform.OS === 'ios'
    ? Boolean(iosClientId)
    : Platform.OS === 'android'
      ? Boolean(androidClientId)
      : Boolean(webClientId)

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: iosClientId || PLACEHOLDER,
    androidClientId: androidClientId || PLACEHOLDER,
    webClientId: webClientId || PLACEHOLDER,
  })

  async function signInWithGoogle() {
    if (!googleConfigured) {
      throw new Error(
        `Google sign-in isn't configured for ${Platform.OS}. ` +
          `Set the matching EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID in .env.`,
      )
    }
    const result = await promptAsync()
    if (result.type !== 'success') throw new Error('Google sign-in cancelled')
    const { id_token } = result.params
    const credential = GoogleAuthProvider.credential(id_token)
    return signInWithCredential(firebaseAuth, credential)
  }

  return { signInWithGoogle, request, response, googleConfigured }
}
