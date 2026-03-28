import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      updateTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'crm-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          // Fix corrupted selectedModules (stored as string instead of array)
          const pref = state.user?.preference;
          if (pref && !Array.isArray(pref.selectedModules)) {
            try {
              const parsed = typeof pref.selectedModules === 'string'
                ? JSON.parse(pref.selectedModules as any)
                : ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'reports'];
              pref.selectedModules = Array.isArray(parsed) ? parsed : ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'reports'];
            } catch {
              pref.selectedModules = ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'reports'];
            }
          }
        }
      },
    }
  )
);
