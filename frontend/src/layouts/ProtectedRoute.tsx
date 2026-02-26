import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
//import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
  const { isLoggedIn, /*isInitialized*/ } = useAuthStore();
  const location = useLocation();

  // 1. Wait for auth state to hydrate from localStorage
  /*if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface-950 text-white/50">
        <Loader2 size={32} className="animate-spin text-primary-500 mb-4" />
        <p className="text-sm font-medium animate-pulse">Authenticating...</p>
      </div>
    );
  }*/

  // 2. Redirect unauthenticated users to the login page
  // We pass the current location in state so we can redirect them back after a successful login
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Render the protected child routes
  return <Outlet />;
};

export default ProtectedRoute;