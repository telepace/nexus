"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface SilentLoadingIndicatorProps {
  isLoading?: boolean;
  className?: string;
  variant?: 'subtle' | 'ghost' | 'invisible';
  position?: 'bottom' | 'top' | 'inline';
}

/**
 * A nearly invisible loading indicator that provides subtle feedback
 * without disrupting the reading experience
 */
export const SilentLoadingIndicator: React.FC<SilentLoadingIndicatorProps> = ({
  isLoading = false,
  className,
  variant = 'subtle',
  position = 'bottom',
}) => {
  if (!isLoading) return null;

  const baseClasses = "transition-all duration-300 ease-out";
  
  const variantClasses = {
    subtle: "opacity-60",
    ghost: "opacity-30", 
    invisible: "opacity-10",
  };

  const positionClasses = {
    bottom: "fixed bottom-0 left-0 right-0 z-10",
    top: "fixed top-0 left-0 right-0 z-10",
    inline: "relative w-full",
  };

  return (
    <div className={cn(baseClasses, positionClasses[position], className)}>
      {/* Progressive loading bar */}
      <div className={cn(
        "h-0.5 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40",
        "animate-pulse",
        variantClasses[variant]
      )}>
        {/* Shimmer effect */}
        <div 
          className="h-full bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Skeleton shimmer loading for content chunks
 */
export const SilentSkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted/30 rounded-sm w-full" />
          <div className="h-4 bg-muted/20 rounded-sm w-4/5" />
          {i === lines - 1 && (
            <div className="h-4 bg-muted/10 rounded-sm w-3/5" />
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Micro loading indicator for inline use
 */
export const MicroLoadingDot: React.FC<{
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}> = ({ className, size = 'xs' }) => {
  const sizeClasses = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5", 
    md: "w-2 h-2",
  };

  return (
    <div className={cn(
      "rounded-full bg-muted-foreground/40 animate-pulse",
      sizeClasses[size],
      className
    )} />
  );
};

/**
 * Content transition wrapper for smooth content updates
 */
export const SilentTransition: React.FC<{
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}> = ({ children, isLoading = false, className }) => {
  return (
    <div className={cn(
      "transition-opacity duration-200 ease-out",
      isLoading ? "opacity-95" : "opacity-100",
      className
    )}>
      {children}
    </div>
  );
}; 