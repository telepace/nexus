"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  preserveAspectRatio?: boolean;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  showLoader?: boolean;
  onError?: () => void;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

/**
 * OptimizedImage component that ensures images are displayed with proper aspect ratio
 * and provides better loading states and error handling.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  fill = false,
  priority = false,
  quality = 75,
  preserveAspectRatio = true,
  fallbackSrc,
  loading = "lazy",
  objectFit = "contain",
  showLoader = true,
  onError,
  onLoad,
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
    onError?.();
  };

  const imageStyle: React.CSSProperties = {
    ...style,
    objectFit: objectFit,
    ...(preserveAspectRatio && {
      aspectRatio: "auto",
      width: "100%",
      height: "auto",
    }),
  };

  const imageClassName = cn(
    "transition-opacity duration-300",
    preserveAspectRatio && "max-w-full h-auto",
    !preserveAspectRatio && "w-full h-full",
    isLoading && "opacity-0",
    !isLoading && "opacity-100",
    className,
  );

  return (
    <div className="relative inline-block">
      {showLoader && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {fill ? (
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={imageClassName}
          style={imageStyle}
          priority={priority}
          quality={quality}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      ) : (
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          className={imageClassName}
          style={imageStyle}
          priority={priority}
          quality={quality}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {hasError && !fallbackSrc && (
        <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
