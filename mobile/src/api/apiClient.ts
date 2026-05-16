import axios from 'axios';
import { authService } from '../services/authService';


const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:8080/api', 
});

apiClient.interceptors.request.use(async (config) => {
  const token = await authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;