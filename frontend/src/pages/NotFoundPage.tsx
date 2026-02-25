import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

// Store and Components
import { useAuthStore } from '@/store/authStore';
import ThemeBackground from '@/components/ThemeBackground';

export default function NotFoundPage() {
  const navigate = useNavigate();
  
  // Check if the user has an active session
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-surface-900">
      
      {/* Background Layer (z-0) */}
      <div className="absolute inset-0 z-0">
        {isAuthenticated ? (
          <ThemeBackground />
        ) : (
          // Subtle fallback animation for unauthenticated visitors
          <div className="absolute inset-0 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 animate-pulse-slow opacity-50" />
        )}
      </div>
      
      {/* Content Layer (z-10) */}
      <motion.div 
        className="relative z-10 flex flex-col items-center text-center p-8 md:p-12 glass-card border-white/10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.h1 
          className="text-8xl md:text-9xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-primary-400 to-primary-800/50 drop-shadow-xl select-none"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          404
        </motion.h1>
        
        <motion.h2 
          className="mt-6 text-2xl md:text-3xl font-semibold text-white/90"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          This page doesn't exist
        </motion.h2>
        
        <motion.p 
          className="mt-3 text-white/50 max-w-sm"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          It looks like you've wandered into the void. Let's get you back to familiar territory.
        </motion.p>
        
        <motion.button
          onClick={() => navigate('/')}
          className="btn-primary mt-8 flex items-center gap-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Home className="w-5 h-5" />
          Go Home
        </motion.button>
      </motion.div>
      
    </div>
  );
}