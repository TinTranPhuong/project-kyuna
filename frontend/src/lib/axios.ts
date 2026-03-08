import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

// ─── Types ───────────────────────────────────────────────────────────────────
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
let isRefreshing = false
let failedQueue: FailedRequest[] = []

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
      isRefreshing = false
      processQueue(error, null)
      logout()
      return Promise.reject(error)
    }

    try {
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