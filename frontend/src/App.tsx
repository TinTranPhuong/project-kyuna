import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';

// Auth & Protection
import ProtectedRoute from '@/layouts/ProtectedRoute';

// Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import ChatbotPage from '@/pages/ChatbotPage';
import TranslatorPage from '@/pages/TranslatorPage';
import DashboardPage from '@/pages/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import MusicPlayer from '@/components/music/MusicPlayer';

export default function App() {
  // We need the location object to track route changes for Framer Motion
  const location = useLocation();
  
  // Checks if we are on the login/register screen to hide the player
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat" element={<ChatbotPage />} />
              <Route path="/chat/:id" element={<ChatbotPage />} />
              <Route path="/translate" element={<TranslatorPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
          
        </Routes>
      </AnimatePresence>

      {/* THE FIX: Outside the animation zone so it never stops playing! */}
      {/* md:left-[260px] perfectly dodges your sidebar */}
      {!isAuthPage && (
        <div className="fixed bottom-3 left-4 md:left-[285px] right-6 z-[100] pointer-events-none">
          <MusicPlayer />
        </div>
      )}
    </>
  );
}