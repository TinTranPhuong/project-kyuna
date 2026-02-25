import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/services/auth.service';

// Types derived from your requirements
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoggedIn: false,
      isInitialized: false,

      initialize: async () => {
        const { token } = get();

        // If no token exists in storage, we are done initializing
        if (!token) {
          set({ isInitialized: true, isLoggedIn: false });
          return;
        }

        try {
          // Validate existing token against the backend
          const userData = await authService.getMe();
          set({ user: userData, isLoggedIn: true });
        } catch (error) {
          // If token is invalid/expired, wipe the store
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false });
        } finally {
          set({ isInitialized: true });
        }
      },

      login: (user, token, refreshToken) => {
        set({ 
          user, 
          token, 
          refreshToken, 
          isLoggedIn: true,
          isInitialized: true 
        });
      },

      logout: async () => {
        try {
          // Call the backend to invalidate the session/refresh token
          await authService.logout();
        } catch (error) {
          console.error('Backend logout failed, clearing local state anyway');
        } finally {
          // Clear all user data from store
          set({ 
            user: null, 
            token: null, 
            refreshToken: null, 
            isLoggedIn: false 
          });
          // Explicitly clear localStorage as a safety measure
          localStorage.removeItem('luna-auth-storage');
        }
      },

      setUser: (user) => set({ user }),

      updateToken: (token) => set({ token }),
    }),
    {
      name: 'luna-auth-storage', // Name of the key in localStorage
      storage: createJSONStorage(() => localStorage),
      // We only want to persist user data and tokens, not the initialization status
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        refreshToken: state.refreshToken, 
        isLoggedIn: state.isLoggedIn 
      }),
    }
  )
);