import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The shape of errors returned by our Axios interceptors.
 * We check the HTTP status on the response to decide whether to retry.
 */
type QueryError = AxiosError<{ detail: string }>

// ─── Non-Retriable Status Codes ───────────────────────────────────────────────

/**
 * HTTP status codes that represent permanent or auth-related failures.
 * Retrying these won't help and would create unnecessary server load.
 *
 *  401 Unauthorized  — Token is invalid; our interceptor handles refresh automatically.
 *                      If we still get a 401 here, the refresh itself failed → no retry.
 *  403 Forbidden     — User doesn't have permission. Retrying won't change that.
 *  404 Not Found     — Resource doesn't exist. Retrying won't create it.
 *  422 Unprocessable — Request body failed validation. Retrying won't fix bad data.
 */
const NON_RETRIABLE_STATUSES = new Set([401, 403, 404, 422])

// ─── Query Client ─────────────────────────────────────────────────────────────

/**
 * Global TanStack Query client.
 * Controls caching, background sync, and retry behaviour for the entire app.
 *
 * Import this in main.tsx and pass to <QueryClientProvider>.
 * Import the instance directly (not the hook) when manually invalidating
 * queries outside of React components (e.g., after a mutation in a Zustand action).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Data stays "fresh" for 5 minutes.
       * During this window, switching pages or mounting a component that
       * uses the same query key will NOT trigger a background re-fetch —
       * the cached data is served immediately.
       */
      staleTime: 1000 * 60 * 5,

      /**
       * Smart retry: skip retrying for errors that require user action
       * or are logically permanent (auth failure, missing resource, bad input).
       * For all other errors (5xx, network timeout), allow up to 1 retry.
       */
      retry: (failureCount: number, error: unknown): boolean => {
        const status = (error as QueryError)?.response?.status

        if (status !== undefined && NON_RETRIABLE_STATUSES.has(status)) {
          return false
        }

        // Allow one retry for transient network/server issues (e.g., 503 flap)
        return failureCount < 2
      },

      /**
       * Disabled: automatic re-fetch when the browser tab regains focus.
       * In development this causes constant re-fetches when switching between
       * VS Code and the browser. In production it's rarely worth the noise.
       */
      refetchOnWindowFocus: false,
    },

    mutations: {
      /**
       * Mutations (POST/PATCH/DELETE) are never retried automatically.
       * Retrying a mutation risks duplicate side-effects (e.g., creating
       * two records). The caller is responsible for retry logic if needed.
       */
      retry: false,
    },
  },
})