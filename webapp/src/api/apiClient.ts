import axios from 'axios';
import { getAuth } from 'firebase/auth';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN  || 'http://localhost:8080';
export const API_BASE_URL = `${API_ORIGIN}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Avoid importing authService here to prevent circular dependency.
apiClient.interceptors.request.use(async (config) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.log('apiClient interceptor getIdToken error:', err);
  }
  return config;
});

export default apiClient;
