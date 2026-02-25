import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Shape of a queued request waiting for token refresh to complete.
 * Using explicit types instead of `any` to satisfy strict ESLint rules.
 */
interface FailedRequest {
  resolve: (token: string) => void
  reject: (reason: AxiosError) => void
}

// ─── Axios Instance ───────────────────────────────────────────────────────────

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Concurrent Refresh State ─────────────────────────────────────────────────

/**
 * Guards against triggering multiple simultaneous refresh calls.
 * If two 401s fire at the same time, only one refresh request is made.
 * All other failed requests are queued and replayed when the refresh resolves.
 */
let isRefreshing = false
let failedQueue: FailedRequest[] = []

/**
 * Drains the queue after a refresh attempt.
 * If refresh succeeded: resolves each queued request with the new token.
 * If refresh failed: rejects each queued request with the error.
 */
function processQueue(error: AxiosError | null, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || token === null) {
      reject(error as AxiosError)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

// ─── Request Interceptor ──────────────────────────────────────────────────────

/**
 * Attaches the current access token to every outgoing request.
 * Reads directly from Zustand store state (no React hook needed here).
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// ─── Response Interceptor ─────────────────────────────────────────────────────

/**
 * Intercepts 401 Unauthorized responses and attempts a silent token refresh.
 *
 * Flow:
 *  1. Receive 401 on a request that hasn't already been retried.
 *  2. If a refresh is already in-flight → queue this request and wait.
 *  3. Otherwise → start the refresh, queue future 401s, replay on success.
 *  4. If refresh fails → logout and hard-redirect to /login.
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // ── Case: Another refresh is already running ──────────────────────────────
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((newToken: string) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return axiosInstance(originalRequest)
      })
    }

    // ── Case: Start the refresh ───────────────────────────────────────────────
    originalRequest._retry = true
    isRefreshing = true

    const { refreshToken, updateToken, logout } = useAuthStore.getState()

    if (!refreshToken) {
      // No refresh token stored — cannot recover, log out immediately
      isRefreshing = false
      processQueue(error, null)
      logout()
      return Promise.reject(error)
    }

    try {
      // Use a plain axios call (not axiosInstance) to avoid interceptor loops
      const response = await axios.post<{ access_token: string }>(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/refresh`,
        { refresh_token: refreshToken }
      )

      const newToken = response.data.access_token

      updateToken(newToken)
      processQueue(null, newToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      }

      return axiosInstance(originalRequest)
    } catch (refreshError) {
      // Refresh token itself is expired or revoked — full logout
      processQueue(refreshError as AxiosError, null)
      logout()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosInstance