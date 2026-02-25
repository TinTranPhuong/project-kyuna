import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, id, ...props }, ref) => {
    // Generate a unique ID if one isn't explicitly provided
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-1 w-full">
        {/* Optional Label */}
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-sm font-medium text-white/90 ml-1 block"
          >
            {label}
          </label>
        )}
        
        {/* Input Wrapper (for positioning the icon) */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={cn(
              // Base glass styles (assuming .glass-input is in your index.css)
              "glass-input w-full transition-all duration-200 outline-none",
              // Add left padding if an icon is present so text doesn't overlap it
              leftIcon && "pl-10", 
              // Error state overrides
              error && "border-red-500/50 focus:ring-red-500/30 focus:border-red-500", 
              // User overrides
              className
            )}
            // Accessibility attributes for error handling
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p 
            id={`${inputId}-error`} 
            className="text-red-400 text-xs ml-1 mt-1 animate-fade-in"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;