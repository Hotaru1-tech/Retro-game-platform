import { create } from 'zustand';
import { apiFetch } from '@/lib/utils';
import { connectSocket, disconnectSocket, updateSocketAuth } from '@/lib/socket';
import { useToastStore } from '@/components/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  isGuest?: boolean;
  profile?: any;
  rating?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      updateSocketAuth();
      connectSocket();
      useToastStore.getState().addToast(`Welcome back, ${data.user.username}!`, 'success');
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      useToastStore.getState().addToast(err.message, 'error');
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      updateSocketAuth();
      connectSocket();
      useToastStore.getState().addToast(`Account created! Welcome, ${data.user.username}!`, 'success');
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      useToastStore.getState().addToast(err.message, 'error');
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch('/api/auth/guest', { method: 'POST' });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      updateSocketAuth();
      connectSocket();
      useToastStore.getState().addToast(`Logged in as ${data.user.username}!`, 'success');
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      useToastStore.getState().addToast(err.message, 'error');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
    useToastStore.getState().addToast('Logged out successfully', 'info');
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      connectSocket();
      get().fetchProfile();
    }
  },

  fetchProfile: async () => {
    try {
      const data = await apiFetch('/api/auth/profile');
      set({ user: data });
    } catch {
      // Token invalid
      localStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null }),
}));
