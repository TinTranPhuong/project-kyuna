import axiosInstance from '@/lib/axios'
import type { User, LoginResponse } from '@/types/auth.types'

export type { User, LoginResponse }

/**
 * Authentication service.
 *
 * Backend router ownership (see backend/app/main.py):
 *   Auth actions  → /api/v1/auth/*    (login, register, logout, refresh, me)
 *   User actions  → /api/v1/users/*   (update profile, change password, delete account)
 *
 * These are TWO different routers on the backend. Using the wrong prefix
 * will return 404 even though the function name looks correct.
 */
export const authService = {

  // ─── Auth router (/api/v1/auth) ──────────────────────────────────────────────

  /** POST /api/v1/auth/login */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/login', {
      email,
      password,
    })
    return response.data
  },

  /** POST /api/v1/auth/register */
  register: async (
    username: string,
    email: string,
    password: string,
  ): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/register', {
      username,
      email,
      password,
    })
    return response.data
  },

  /** POST /api/v1/auth/logout */
  logout: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/logout')
  },

  /** POST /api/v1/auth/refresh */
  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    const response = await axiosInstance.post<{ access_token: string }>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
    )
    return response.data
  },

  /** GET /api/v1/auth/me */
  getMe: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/api/v1/auth/me')
    return response.data
  },

  // ─── Users router (/api/v1/users) ────────────────────────────────────────────
  // Spec: backend/app/routers/users.py → PATCH /me, PATCH /me/password, DELETE /me
  // These are NOT under /auth — they live under the separate users router.

  /** PATCH /api/v1/users/me */
  updateProfile: async (data: { username?: string }): Promise<User> => {
    const response = await axiosInstance.patch<User>('/api/v1/users/me', data)
    return response.data
  },

  /** PATCH /api/v1/users/me/password */
  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    await axiosInstance.patch('/api/v1/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  /** DELETE /api/v1/users/me */
  deleteAccount: async (password: string): Promise<void> => {
    await axiosInstance.delete('/api/v1/users/me', { data: { password } })
  },
}