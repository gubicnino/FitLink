import { getAuth } from '@react-native-firebase/auth';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:8080/api',
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