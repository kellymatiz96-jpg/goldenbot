import axios from 'axios';

// Cliente HTTP base para llamar al API de GoldenBot
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: agrega el token en cada request si existe
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('goldenbot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor: si el token expiró (401), intenta renovarlo con el refresh token
// Solo cierra sesión si el refresh también falla
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined'
    ) {
      // En el login no intentar renovar — dejar que el formulario maneje el error
      if (originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // Evitar bucle infinito si el propio endpoint de refresh da 401
      if (originalRequest.url?.includes('/auth/refresh')) {
        localStorage.removeItem('goldenbot_token');
        localStorage.removeItem('goldenbot_refresh_token');
        localStorage.removeItem('goldenbot_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) return Promise.reject(error);
      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('goldenbot_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await api.post('/auth/refresh', { refreshToken });
        const newToken = data.data?.accessToken;
        if (!newToken) throw new Error('No new token');

        localStorage.setItem('goldenbot_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        isRefreshing = false;
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        localStorage.removeItem('goldenbot_token');
        localStorage.removeItem('goldenbot_refresh_token');
        localStorage.removeItem('goldenbot_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
