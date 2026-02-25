import { Navigate, Outlet } from 'react-router-dom';
import { Moon } from 'lucide-react';

// Store (Will show an error until implemented)
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  // Check auth state from Zustand
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;

  // Immediate redirect for users who are already logged in
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    // Fast-loading dark gradient background (no heavy video/canvas elements)
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-black p-4">
      
      {/* Centered glass morphism card (max-width exactly 420px as requested) */}
      <div className="w-full max-w-[420px] glass-card p-8 shadow-2xl flex flex-col relative z-10 animate-fade-in">
        
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mb-3 border border-primary-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
            <Moon className="w-6 h-6 text-primary-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">
            Project Luna
          </h1>
        </div>

        {/* Page Content (Login or Register Form) */}
        <div className="w-full">
          <Outlet />
        </div>
        
      </div>
    </div>
  );
}