import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  rounded?: boolean;
}

// 1. Base Skeleton Atom
const SkeletonBase = ({
  width,
  height,
  rounded = true,
  className,
  ...props
}: SkeletonProps) => {
  return (
    <div
      className={cn(
        // The animate-pulse and gradient background
        'animate-pulse bg-gradient-to-r from-white/5 to-white/10',
        // Default rounding
        rounded && 'rounded-md',
        // Optional explicit dimensions (can also be passed via className)
        width,
        height,
        className
      )}
      {...props}
    />
  );
};

// 2. Text Variant (Multiple Lines)
export interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
}

const SkeletonText = ({ lines = 3, className, ...props }: SkeletonTextProps) => {
  return (
    <div className={cn("space-y-3 w-full", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          height="h-4"
          // Make the last line shorter for a more natural text look
          width={i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}
          className="rounded-sm"
        />
      ))}
    </div>
  );
};

// 3. Card Variant (Pre-composed Block)
const SkeletonCard = ({ className, ...props }: SkeletonProps) => {
  return (
    <div className={cn("glass-card p-6 space-y-4 w-full", className)} {...props}>
      {/* Mock Image / Header Area */}
      <SkeletonBase height="h-32" width="w-full" className="rounded-lg" />
      
      {/* Mock Title */}
      <SkeletonBase height="h-6" width="w-1/2" />
      
      {/* Mock Body Text */}
      <SkeletonText lines={2} />
    </div>
  );
};

// 4. Attach sub-components to the main export
export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Card: SkeletonCard,
});

export default Skeleton;