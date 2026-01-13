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
  loginWithFacebook: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// PREVIEW MODE: Set to true to bypass auth for UI preview
const PREVIEW_MODE = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: PREVIEW_MODE ? { id: 'preview', email: 'preview@test.com', name: 'Preview User' } : null,
  token: localStorage.getItem('token'),
  // Start with isLoading: true if there's a token, so PrivateRoute shows loading spinner
  // until loadUser() completes (prevents redirect race condition)
  isLoading: !PREVIEW_MODE && !!localStorage.getItem('token'),
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

  // Redirect to Facebook OAuth
  loginWithFacebook: async () => {
    console.log('auth.store: loginWithFacebook called');
    const response = await authApi.getFacebookAuthUrl();
    console.log('auth.store: getFacebookAuthUrl response:', response);
    if (response.success && response.data?.url) {
      console.log('auth.store: redirecting to:', response.data.url);
      window.location.href = response.data.url;
    } else {
      throw new Error('Failed to get Facebook login URL');
    }
  },

  // Set token after OAuth callback (used by AuthCallback page)
  setToken: async (token: string) => {
    localStorage.setItem('token', token);
    set({ token, isLoading: true });

    // Load user data with the new token
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
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
