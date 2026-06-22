import axios from 'axios'
import { getIdToken } from 'firebase/auth'
import { firebaseAuth } from '../services/firebaseConfig'

// Android emulator: http://10.0.2.2:8080 (see EXPO_PUBLIC_API_URL)
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'
export const API_BASE_URL = `${API_ORIGIN}/api`

const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

// Attach the Firebase ID token to every request.
apiClient.interceptors.request.use(async (config) => {
  try {
    const user = firebaseAuth.currentUser
    const token = user ? await getIdToken(user) : null
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    console.log('apiClient interceptor getIdToken error:', err)
  }
  return config
})

export default apiClient
