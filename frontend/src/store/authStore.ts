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
  isInitialized: boolean

  initialize: () => Promise<void>
  login: (user: User, token: string, refreshToken: string) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  updateToken: (token: string) => void
}

/** After a successful auth check, pull user data from PostgreSQL. */
async function hydrateUserData() {
  await useSettingsStore.getState().syncFromBackend()
  await useNoteStore.getState().loadNotes()
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
          // Hydrate settings + notes from PostgreSQL
          await hydrateUserData()
        } catch {
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
        } finally {
          set({ isInitialized: true })
        }
      },

      login: (user, token, refreshToken) => {
        set({ user, token, refreshToken, isLoggedIn: true, isInitialized: true })
        // Hydrate settings + notes after login (fire-and-forget)
        void hydrateUserData()
      },

      logout: async () => {
        try {
          await authService.logout()
        } catch {
          console.warn('Backend logout failed; clearing local state anyway.')
        } finally {
          set({ user: null, token: null, refreshToken: null, isLoggedIn: false })
        }
      },

      setUser: (user) => set({ user }),
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