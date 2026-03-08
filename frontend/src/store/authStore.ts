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

      initialize: async () => {
        const { token } = get()

        if (!token) {
          set({ isInitialized: true, isLoggedIn: false })
          return
        }

        try {
          const userData = await authService.getMe()
          set({ user: userData, isLoggedIn: true })

          await hydrateUserData()
        } catch {
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
          clearUserData()
        } finally {
          set({ isInitialized: true })
        }
      },

      login: (user, token, refreshToken) => {
        set({ user, token, refreshToken, isLoggedIn: true, isInitialized: true })
        void hydrateUserData()
      },

      logout: async () => {
        try {
          await authService.logout()
        } catch {
          console.warn('[authStore] Backend logout call failed — clearing local state anyway.')
        } finally {
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
          clearUserData()
        }
      },

      setUser:     (user)  => set({ user }),
      updateToken: (token) => set({ token }),
    }),
    {
      name: 'kyuna-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user:         state.user,
        token:        state.token,
        refreshToken: state.refreshToken,
        isLoggedIn:   state.isLoggedIn,
      }),
    }
  )
)