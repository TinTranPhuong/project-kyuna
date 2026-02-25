import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exports your clsx + twMerge utility

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Dictionary mapping for variants (matching your custom Tailwind setup)
    const variantStyles = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-lg shadow-primary-900/50 border border-transparent',
      secondary: 'bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white active:scale-95', // Glass button style
      ghost: 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white active:scale-95 border border-transparent',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-lg shadow-red-900/50 border border-transparent',
    };

    // Dictionary mapping for sizes
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
      md: 'px-4 py-2 text-base rounded-xl gap-2',
      lg: 'px-6 py-3 text-lg rounded-2xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles applied to all buttons
          'inline-flex items-center justify-center font-medium transition-all duration-200 outline-none',
          'focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
          // Disabled state (we keep pointer-events active ONLY for cursor-wait to work)
          'disabled:opacity-60',
          // Dynamic styles
          variantStyles[variant],
          sizeStyles[size],
          // Loading cursor override
          isLoading ? 'cursor-wait' : 'disabled:cursor-not-allowed',
          // User overrides
          className
        )}
        {...props}
      >
        {/* Render Spinner OR Left Icon */}
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : leftIcon ? (
          <span className="shrink-0 flex items-center">{leftIcon}</span>
        ) : null}
        
        {/* Button Text */}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Fulfills the "Export as default AND as named export" requirement
export default Button;