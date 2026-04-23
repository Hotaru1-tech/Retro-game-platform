import { create } from 'zustand';
import { apiFetch } from '@/lib/utils';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useToastStore } from '@/components/Toast';
import { logoutFromRuntime } from '@/lib/auth-runtime';

interface User {
  id: string;
  username: string;
  email: string;
  clerkId?: string;
  profile?: any;
  rating?: any;
  recentMatches?: any[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isClerkLoaded: boolean;

  logout: () => Promise<void>;
  fetchProfile: (fallbackName?: string) => Promise<void>;
  setClerkState: (state: { isClerkLoaded: boolean; isAuthenticated: boolean }) => void;
  clearSession: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isClerkLoaded: false,

  logout: async () => {
    await logoutFromRuntime();
    disconnectSocket();
    set({ user: null, isAuthenticated: false, error: null });
    useToastStore.getState().addToast('Logged out successfully', 'info');
  },

  fetchProfile: async (fallbackName) => {
    set({ isLoading: true, error: null });
    try {
      await apiFetch('/api/auth/sync', { method: 'POST' });
      const data = await apiFetch('/api/auth/profile');
      set({
        user: {
          ...data,
          username: data.username || fallbackName || 'Player',
        },
        isAuthenticated: true,
        isLoading: false,
      });
      await connectSocket();
    } catch (err: any) {
      disconnectSocket();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: err.message || 'Authentication failed',
      });
    }
  },

  setClerkState: ({ isClerkLoaded, isAuthenticated }) =>
    set((state) => ({
      isClerkLoaded,
      isAuthenticated,
      user: isAuthenticated ? state.user : null,
    })),

  clearSession: () => {
    disconnectSocket();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
