import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { firebaseAuth } from '../services/firebaseConfig'
import { authService } from '../services/authService'
import { User } from '../types/types'

interface AuthState {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
  })

  const waitForRegistrationToFinish = async () => {
    const timeoutMs = 8000
    const stepMs = 250
    const startedAt = Date.now()

    while (authService.isRegistrationInProgress() && Date.now() - startedAt < timeoutMs) {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), stepMs)
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ firebaseUser: null, user: null, loading: false })
        return
      }

      if (authService.isRegistrationInProgress()) {
        setState((current) => ({ ...current, firebaseUser, loading: true }))
        await waitForRegistrationToFinish()
      }

      const user = await authService.getUser()

      setState({ firebaseUser, user, loading: false })
    })

    return unsubscribe
  }, [])

  return state
}
