import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'CLIENT_ADMIN' | 'AGENT';
  clientId: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;

      localStorage.setItem('goldenbot_token', accessToken);
      localStorage.setItem('goldenbot_refresh_token', refreshToken);
      localStorage.setItem('goldenbot_user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
      throw new Error('Email o contraseña incorrectos');
    }
  },

  logout: () => {
    localStorage.removeItem('goldenbot_token');
    localStorage.removeItem('goldenbot_refresh_token');
    localStorage.removeItem('goldenbot_user');
    set({ user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('goldenbot_user');
    const token = localStorage.getItem('goldenbot_token');
    if (stored && token) {
      try {
        const user = JSON.parse(stored) as User;
        set({ user, isAuthenticated: true });
      } catch {
        // Si el JSON está corrupto, limpiamos todo
        localStorage.removeItem('goldenbot_user');
        localStorage.removeItem('goldenbot_token');
      }
    }
  },
}));
