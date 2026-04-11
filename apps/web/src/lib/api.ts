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

// Interceptor: si el token expiró (401), redirige al login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('goldenbot_token');
      localStorage.removeItem('goldenbot_refresh_token');
      localStorage.removeItem('goldenbot_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
