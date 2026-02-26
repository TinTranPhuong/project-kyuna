import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';

// Define the asset mapping based on your theme requirements
const THEME_ASSETS: Record<string, string> = {
  'night-garden': '/assets/backgrounds/night-garden.mp4',
  'rainy-city': '/assets/backgrounds/rainy-city.mp4',
  'space': '/assets/backgrounds/space.mp4',
  'forest': '/assets/backgrounds/forest.mp4',
};

export const ThemeBackground = () => {
  const currentTheme = useSettingsStore((state) => state.theme);
  const [hasError, setHasError] = useState(false);

  // If the theme name provided doesn't exist in our map, we'll use a fallback
  const videoSrc = THEME_ASSETS[currentTheme] || THEME_ASSETS['night-garden'];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-surface-950">
      <AnimatePresence mode="popLayout">
        {hasError ? (
          /* --- Fallback: Static Dark Gradient --- */
          <motion.div
            key="fallback-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-surface-900 via-black to-surface-950"
          />
        ) : (
          /* --- Primary: Animated Video Layer --- */
          <motion.div
            key={currentTheme} // Key change forces re-mount and triggers AnimatePresence
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 h-full w-full"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              onError={() => setHasError(true)}
              className="h-full w-full object-cover"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Readability Overlay --- */}
      {/* This ensures the glass morphism UI and text always have enough contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
    </div>
  );
};

export default ThemeBackground;