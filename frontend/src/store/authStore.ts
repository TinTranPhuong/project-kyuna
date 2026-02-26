import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/auth.types'

// Re-export so other stores can import User from here if needed
export type { User }

// ─── State Interface ──────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoggedIn: boolean
  isInitialized: boolean  // stays false until initialize() finishes its first run

  // Actions
  initialize: () => Promise<void>
  login: (user: User, token: string, refreshToken: string) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  updateToken: (token: string) => void  // called by axios interceptor on silent refresh
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoggedIn: false,
      isInitialized: false,

      /**
       * Called once in main.tsx / App.tsx on mount.
       * Reads the persisted token from localStorage and validates it against
       * the backend. Sets isInitialized = true when done regardless of outcome,
       * so ProtectedRoute can stop showing the loading spinner.
       */
      initialize: async () => {
        const { token } = get()

        if (!token) {
          set({ isInitialized: true, isLoggedIn: false })
          return
        }

        try {
          const userData = await authService.getMe()
          set({ user: userData, isLoggedIn: true })
        } catch {
          // Token is invalid or expired — wipe state so user must log in again
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
        } finally {
          set({ isInitialized: true })
        }
      },

      /**
       * Called by LoginPage and RegisterPage on successful API response.
       * Sets all auth state and marks the session as initialized.
       */
      login: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken,
          isLoggedIn: true,
          isInitialized: true,
        })
      },

      /**
       * Calls the backend to invalidate the refresh token, then wipes all
       * local state regardless of whether the backend call succeeded.
       * The persist middleware will automatically sync the cleared state to
       * localStorage — no need to call localStorage.removeItem manually.
       */
      logout: async () => {
        try {
          await authService.logout()
        } catch {
          // Backend logout failed (e.g. refresh token already expired).
          // This is non-fatal — we still clear local state.
          console.warn('Backend logout failed; clearing local state anyway.')
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isLoggedIn: false,
          })
        }
      },

      /** Used by SettingsPage after a successful profile update. */
      setUser: (user) => set({ user }),

      /**
       * Called by the axios response interceptor after a successful
       * silent token refresh. Updates the token without touching anything else.
       */
      updateToken: (token) => set({ token }),
    }),
    {
      name: 'luna-auth-storage',
      storage: createJSONStorage(() => localStorage),
      /**
       * Only persist the fields needed to restore a session across page loads.
       * isInitialized is intentionally excluded — it must always start as false
       * so initialize() runs its validation check on every app load.
       */
      partialize: (state) => ({
        user:         state.user,
        token:        state.token,
        refreshToken: state.refreshToken,
        isLoggedIn:   state.isLoggedIn,
      }),
    }
  )
)