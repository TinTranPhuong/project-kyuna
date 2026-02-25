import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Layout Components (Will show errors until implemented)
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ThemeBackground from '@/components/ui/ThemeBackground';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      
      {/* Fixed-width Left Panel */}
      <Sidebar />                            
      
      {/* Right Container: Holds Background, Topbar, and Page Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Absolute Background Layer (z-0) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <ThemeBackground />                  
        </div>
        
        {/* Glass Header (z-10) */}
        <div className="relative z-10 shrink-0">
          <Topbar />                           
        </div>
        
        {/* Scrollable Page Content (z-10) */}
        <main className="flex-1 overflow-auto z-10 relative">
          {/* mode="wait" ensures the old page fades out before the new one fades in */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="min-h-full"
            >
              {/* This is where your HomePage, ChatbotPage, etc. will render */}
              <Outlet />                         
            </motion.div>
          </AnimatePresence>
        </main>
        
      </div>
    </div>
  );
}