import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';

const THEME_ASSETS: Record<string, string> = {
  'night-garden': '/assets/backgrounds/night-garden.mp4',
  'rainy-city': '/assets/backgrounds/rainy-city.mp4',
  'space': '/assets/backgrounds/space.mp4',
  'forest': '/assets/backgrounds/forest.mp4',
};

export const ThemeBackground = () => {
  const currentTheme = useSettingsStore((state) => state.theme);
  const [hasError, setHasError] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);

  // Listen for custom background changes across the app
  useEffect(() => {
    const savedBg = localStorage.getItem('kyuna-bg');
    if (savedBg) setCustomBg(savedBg);

    const handleStorageChange = () => setCustomBg(localStorage.getItem('kyuna-bg'));
    window.addEventListener('bg-updated', handleStorageChange);
    return () => window.removeEventListener('bg-updated', handleStorageChange);
  }, []);

  const videoSrc = THEME_ASSETS[currentTheme] || THEME_ASSETS['night-garden'];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-surface-950">
      <AnimatePresence mode="popLayout">
        {customBg ? (
          /* --- User Uploaded Image --- */
          <motion.div
            key="custom-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customBg})` }}
          />
        ) : hasError ? (
          /* --- Fallback: Static Dark Gradient --- */
          <motion.div
            key="fallback-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-surface-900 via-black to-surface-950"
          />
        ) : (
          /* --- Primary: Animated Video Layer --- */
          <motion.div
            key={currentTheme} 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 h-full w-full"
          >
            <video autoPlay loop muted playsInline onError={() => setHasError(true)} className="h-full w-full object-cover">
              <source src={videoSrc} type="video/mp4" />
            </video>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Readability Overlay --- */}
      {/* Removed backdrop-blur to keep the background completely sharp and original. 
        Retained a subtle 20% dark tint (bg-black/20) solely to ensure white UI text remains readable.
      */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

export default ThemeBackground;