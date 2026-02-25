import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Wraps all routes that require authentication.
 *
 * Three states:
 *  1. isInitialized === false → Auth check in progress. Show a full-screen loader.
 *     (This prevents a flash-redirect to /login before localStorage has been read.)
 *
 *  2. isInitialized === true && isLoggedIn === false → No valid session found.
 *     Redirect to /login, preserving the intended destination in `location.state.from`
 *     so we can redirect back after a successful login.
 *
 *  3. isInitialized === true && isLoggedIn === true → Render the protected child routes.
 */
export const ProtectedRoute = () => {
  // Use individual selectors instead of destructuring the whole store.
  // This prevents re-renders from unrelated store updates (e.g. token refresh).
  const isInitialized = useAuthStore(state => state.isInitialized)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const location = useLocation()

  // ── State 1: Auth initialisation in progress ────────────────────────────────
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-900 z-[100]">
        <Spinner size="lg" className="text-primary-500" />
        <p className="mt-4 text-white/50 text-sm font-medium animate-pulse">
          Initializing session...
        </p>
      </div>
    )
  }

  // ── State 2: Not authenticated ───────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // ── State 3: Authenticated — render child routes ─────────────────────────────
  return <Outlet />
}

export default ProtectedRoute