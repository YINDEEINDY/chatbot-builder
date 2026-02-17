import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithFacebook: (rememberMe?: boolean) => Promise<void>;
  setToken: (token: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// Storage keys
const TOKEN_KEY = 'token';
const REMEMBER_KEY = 'rememberMe';

// Helper functions for storage
const getStoredToken = (): string | null => {
  // Check localStorage first (for remembered users), then sessionStorage
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string, rememberMe: boolean): void => {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, 'true');
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }
};

const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

const isRemembered = (): boolean => {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  // Start with isLoading: true if there's a token, so PrivateRoute shows loading spinner
  // until loadUser() completes (prevents redirect race condition)
  isLoading: !!getStoredToken(),
  isAuthenticated: false,

  login: async (email: string, password: string, rememberMe: boolean = true) => {
    const response = await authApi.login({ email, password, rememberMe });
    if (response.success && response.data) {
      setStoredToken(response.data.token, rememberMe);
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
      // Default to remember for new registrations
      setStoredToken(response.data.token, true);
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
  loginWithFacebook: async (rememberMe: boolean = true) => {
    // Store rememberMe preference for when callback returns
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const response = await authApi.getFacebookAuthUrl();
    if (response.success && response.data?.url) {
      window.location.href = response.data.url;
    } else {
      throw new Error('Failed to get Facebook login URL');
    }
  },

  // Set token after OAuth callback (used by AuthCallback page)
  setToken: async (token: string, rememberMe?: boolean) => {
    // Use stored preference if not provided (from Facebook login flow)
    const shouldRemember = rememberMe ?? isRemembered();
    setStoredToken(token, shouldRemember);
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
      clearStoredToken();
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
    clearStoredToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadUser: async () => {
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
      clearStoredToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
