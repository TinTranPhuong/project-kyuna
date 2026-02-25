import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip = ({ 
  content, 
  children, 
  position = 'top', 
  className 
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    // 400ms delay before showing
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 400);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Position dictionary for the absolute container and the little arrow
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={showTooltip} 
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute z-[110] px-2 py-1 text-xs font-medium text-white",
              "bg-surface-800 border border-white/10 rounded-md shadow-xl whitespace-nowrap",
              "pointer-events-none backdrop-blur-md",
              positionClasses[position],
              className
            )}
          >
            {content}
            
            {/* Optional: Small pointer arrow */}
            <div className={cn(
              "absolute w-2 h-2 bg-surface-800 border-white/10 rotate-45",
              position === 'top' && "bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r",
              position === 'bottom' && "top-[-5px] left-1/2 -translate-x-1/2 border-t border-l",
              position === 'left' && "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r",
              position === 'right' && "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l",
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;