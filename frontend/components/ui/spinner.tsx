import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "ring" | "pulse";
  className?: string;
}

export function Spinner({
  size = "sm",
  variant = "default",
  className,
}: SpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  if (variant === "default") {
    return (
      <Loader2
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  if (variant === "ring") {
    return (
      <div
        className={cn(
          "border-2 border-muted border-t-primary rounded-full animate-spin",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "bg-primary rounded-full animate-pulse",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <Loader2
      className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size],
        className,
      )}
    />
  );
}
