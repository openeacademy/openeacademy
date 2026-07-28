import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) { logout(); return Promise.reject(error); }
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        setTokens(data.data.accessToken, refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  meta?: any;
  message?: string;
}

export const apiGet = <T>(url: string, params?: Record<string, unknown>) => api.get<ApiResponse<T>>(url, { params }).then(r => r.data);
export const apiPost = <T>(url: string, data?: unknown) => api.post<ApiResponse<T>>(url, data).then(r => r.data);
export const apiPut = <T>(url: string, data?: unknown) => api.put<ApiResponse<T>>(url, data).then(r => r.data);
export const apiPatch = <T>(url: string, data?: unknown) => api.patch<ApiResponse<T>>(url, data).then(r => r.data);
export const apiDelete = <T>(url: string) => api.delete<ApiResponse<T>>(url).then(r => r.data);
