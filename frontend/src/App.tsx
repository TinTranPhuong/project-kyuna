import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Stores
import { useAuthStore } from '@/store/authStore';

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
import ToolsPage from '@/pages/ToolsPage'; 
import MusicPlayer from '@/components/music/MusicPlayer';
import NotesPage from '@/pages/NotesPage';

export default function App() {
  const location = useLocation();
  const initialize = useAuthStore(state => state.initialize);

  // ── CRITICAL FIX ────────────────────────────────────────────────────────────
  // initialize() was never called anywhere, which means:
  //   • On every page refresh, notes were always empty (noteStore is not persisted)
  //   • Settings came from stale localStorage instead of being re-synced from DB
  //   • An expired JWT was never detected until the user tried to do something
  //
  // initialize() does the following:
  //   1. If no token → marks isInitialized=true, stays logged out. Done.
  //   2. If token exists → calls GET /api/v1/auth/me to validate it.
  //   3. On success → fetches fresh settings + notes from PostgreSQL.
  //   4. On failure → clears all state and marks the user as logged out.
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    void initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: runs exactly once on mount — this is intentional.

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/"          element={<HomePage />} />
              <Route path="/chat"      element={<ChatbotPage />} />
              <Route path="/chat/:id"  element={<ChatbotPage />} />
              <Route path="/translate" element={<TranslatorPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/tools"     element={<ToolsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </AnimatePresence>

      {/* Music player lives outside the route animation so it never unmounts */}
      {!isAuthPage && (
        <div className="fixed bottom-3 left-4 md:left-[285px] right-6 z-[100] pointer-events-none">
          <MusicPlayer />
        </div>
      )}
    </>
  );
}