import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLMotionProps<"div"> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, hoverable = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "glass-card overflow-hidden",
          hoverable && "cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20",
          className
        )}
        // We apply these conditionally only if hoverable is true
        {...(hoverable && {
          whileHover: { scale: 1.02, y: -4 },
          whileTap: { scale: 0.98 },
          transition: { type: 'spring', stiffness: 300, damping: 20 }
        })}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
export default Card;