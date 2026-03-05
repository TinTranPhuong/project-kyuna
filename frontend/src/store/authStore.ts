import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authService } from '@/services/auth.service'
import { useSettingsStore } from '@/store/settingsStore'
import { useNoteStore } from '@/store/noteStore'
import type { User } from '@/types/auth.types'

export type { User }

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoggedIn: boolean
  isInitialized: boolean  // true once initialize() has completed (success OR failure)

  initialize: () => Promise<void>
  login: (user: User, token: string, refreshToken: string) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  updateToken: (token: string) => void
}

/** Pull fresh settings + notes from PostgreSQL after login / page reload. */
async function hydrateUserData() {
  await useSettingsStore.getState().syncFromBackend()
  await useNoteStore.getState().loadNotes()
}

/**
 * Wipe all user-specific data from every store on logout.
 * This prevents stale data from one user leaking into a subsequent session.
 */
function clearUserData() {
  useSettingsStore.getState().resetToDefaults()
  useNoteStore.setState({ notes: [], isManagerOpen: false, isLoading: false })
  // Remove the persisted settings cache so the next user gets a clean slate.
  localStorage.removeItem('kyuna-settings-storage')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoggedIn: false,
      isInitialized: false,

      // ── Called ONCE on App mount (via useEffect in App.tsx) ──────────────────
      initialize: async () => {
        const { token } = get()

        // No stored token → nothing to validate. Mark as done immediately.
        if (!token) {
          set({ isInitialized: true, isLoggedIn: false })
          return
        }

        try {
          // Validate the stored token against the backend.
          const userData = await authService.getMe()
          set({ user: userData, isLoggedIn: true })

          // Token is valid → hydrate notes + settings from PostgreSQL.
          await hydrateUserData()
        } catch {
          // Token expired or revoked → clear everything.
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
          clearUserData()
        } finally {
          // Always mark as initialized so ProtectedRoute stops showing the spinner.
          set({ isInitialized: true })
        }
      },

      // ── Called by LoginPage / RegisterPage after a successful auth response ──
      login: (user, token, refreshToken) => {
        set({ user, token, refreshToken, isLoggedIn: true, isInitialized: true })
        // Hydrate fresh data from PostgreSQL. Fire-and-forget — the UI will
        // update reactively when the Zustand state changes.
        void hydrateUserData()
      },

      // ── Called from the logout button ────────────────────────────────────────
      logout: async () => {
        try {
          await authService.logout()
        } catch {
          console.warn('[authStore] Backend logout call failed — clearing local state anyway.')
        } finally {
          // 1. Clear auth tokens so axios stops sending them.
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
          // 2. Wipe all user-specific store data.
          clearUserData()
        }
      },

      setUser:     (user)  => set({ user }),
      updateToken: (token) => set({ token }),
    }),
    {
      name: 'kyuna-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist auth tokens + login state.
      // isInitialized is intentionally NOT persisted — it must default to false
      // on every page load so App.tsx triggers initialize() fresh each time.
      partialize: (state) => ({
        user:         state.user,
        token:        state.token,
        refreshToken: state.refreshToken,
        isLoggedIn:   state.isLoggedIn,
      }),
    }
  )
)