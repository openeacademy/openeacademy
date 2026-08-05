import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) { logout(); return Promise.reject(error); }

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        setTokens(data.data.accessToken, refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// Typed API helpers
export const apiGet = <T>(url: string, params?: Record<string, unknown>) =>
  api.get<{ success: boolean; message: string; data: T; meta?: { page: number; limit: number; total: number; totalPages: number } }>(url, { params }).then(r => r.data);

export const apiPost = <T>(url: string, data?: unknown) =>
  api.post<{ success: boolean; message: string; data: T }>(url, data).then(r => r.data);

export const apiPut = <T>(url: string, data?: unknown) =>
  api.put<{ success: boolean; message: string; data: T }>(url, data).then(r => r.data);

export const apiPatch = <T>(url: string, data?: unknown) =>
  api.patch<{ success: boolean; message: string; data: T }>(url, data).then(r => r.data);

export const apiDelete = <T>(url: string) =>
  api.delete<{ success: boolean; message: string; data: T }>(url).then(r => r.data);

export function resolvePublicUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('/api/v1/files/public/')) {
    const part = url.split('/api/v1/files/public/')[1];
    return `/api/v1/files/public/${part}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url.replace(/^https?:\/\/[^\/]+/, '');
    }
    return url;
  }
  if (url.startsWith('/')) return url;
  return `/api/v1/files/public/${encodeURIComponent(url)}`;
}

