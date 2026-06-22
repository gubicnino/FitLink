/**
 * Compatibility shim that mirrors the small slice of the
 * `@react-native-firebase/auth` default-export API the app relied on
 * (`auth().currentUser`, `auth().onAuthStateChanged(cb)`), backed by the
 * Firebase JS SDK. Lets the ported screens/hooks keep their original call
 * sites instead of rewriting every usage.
 */
import {
  onAuthStateChanged as fbOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { firebaseAuth } from './firebaseConfig'

function auth() {
  return {
    get currentUser(): FirebaseUser | null {
      return firebaseAuth.currentUser
    },
    onAuthStateChanged(cb: (user: FirebaseUser | null) => void) {
      return fbOnAuthStateChanged(firebaseAuth, cb)
    },
  }
}

export default auth
