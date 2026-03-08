import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
  const isLoggedIn     = useAuthStore(state => state.isLoggedIn);
  const isInitialized  = useAuthStore(state => state.isInitialized);
  const location = useLocation();

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