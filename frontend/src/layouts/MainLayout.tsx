import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ThemeBackground from '@/components/ui/ThemeBackground';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      
      {/* Absolute Background Layer (z-0) */}      
      <div className="absolute inset-0 z-0 pointer-events-none">
          <ThemeBackground />                  
        </div>

      {/* Fixed-width Left Panel */}  
      <Sidebar />                            
      
      {/* Right Container: Holds Background, Topbar, and Page Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
 
        {/* Glass Header (z-10) */}
        <div className="relative z-10 shrink-0">
          <Topbar />                           
        </div>
        
        {/* Scrollable Page Content (z-10) */}
        <main className={cn("flex-1 relative flex flex-col min-w-0 overflow-hidden", location.pathname === '/' ? "pb-24" : "")}>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full w-full flex flex-col" 
            >
              <Outlet />  

            </motion.div>
          </AnimatePresence>
          
        </main>
        
      </div>
    </div>
  );
}