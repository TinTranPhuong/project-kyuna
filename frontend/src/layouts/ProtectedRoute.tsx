import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
  const isLoggedIn     = useAuthStore(state => state.isLoggedIn);
  const isInitialized  = useAuthStore(state => state.isInitialized);
  const location = useLocation();

  // ── CRITICAL FIX ────────────────────────────────────────────────────────────
  // This check was commented out, which caused two problems:
  //
  //  1. Race condition: isLoggedIn=true comes from persisted localStorage
  //     immediately, but initialize() (called in App.tsx) is still running its
  //     async API call to validate the token. Without this guard, a user with
  //     an expired token briefly sees the protected page before being kicked out.
  //
  //  2. Data race: Protected pages began rendering and fetching their own data
  //     before initialize() finished hydrating notes/settings from PostgreSQL,
  //     causing stale or empty data on first render.
  //
  // Now: show a spinner until initialize() has completed (sets isInitialized=true).
  // This only adds ~100–300ms on page load — barely perceptible.
  // ────────────────────────────────────────────────────────────────────────────
  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface-950 text-white/50">
        <Loader2 size={32} className="animate-spin text-primary-500 mb-4" />
        <p className="text-sm font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;