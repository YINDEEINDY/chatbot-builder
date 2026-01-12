import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// PREVIEW MODE: Set to true to bypass auth for UI preview
const PREVIEW_MODE = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: PREVIEW_MODE ? { id: 'preview', email: 'preview@test.com', name: 'Preview User' } : null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isAuthenticated: PREVIEW_MODE,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });
    } else {
      throw new Error((response as { message?: string }).message || 'Login failed');
    }
  },

  register: async (email: string, password: string, name: string) => {
    const response = await authApi.register({ email, password, name });
    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });
    } else {
      throw new Error((response as { message?: string }).message || 'Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadUser: async () => {
    // Skip API call in preview mode
    if (PREVIEW_MODE) {
      set({ isLoading: false });
      return;
    }

    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch {
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
