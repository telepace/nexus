"use client";

import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JsonLineWithExpandButtonProps {
  /** JSON object for this line */
  jsonLine: Record<string, unknown>;
  /** The rendered content element */
  children: React.ReactNode;
  /** Callback when expand button is clicked */
  onExpand?: (jsonContent: Record<string, unknown>) => void;
  /** Whether this line should show the expand button */
  showExpandButton?: boolean;
  /** Whether hover effects are enabled */
  enableHoverEffects?: boolean;
}

/**
 * Wrapper component for JSON lines that adds expand button functionality
 * when the JSON object has an "expandable" property set to true
 */
export function JsonLineWithExpandButton({
  jsonLine,
  children,
  onExpand,
  showExpandButton = false,
  enableHoverEffects = true,
}: JsonLineWithExpandButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Check if this line should show expand button
  // Support both boolean true and string expandable values
  const shouldShowButton = showExpandButton || !!jsonLine.expandable;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExpand) {
      onExpand(jsonLine);
    }
  };

  if (!shouldShowButton) {
    // If no expand button needed, just render children with optional hover effects
    if (!enableHoverEffects) {
      return <>{children}</>;
    }

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out",
          "px-3 py-2 -mx-3 -my-2",
          "border border-transparent",
        )}
      >
        <div className="relative">{children}</div>
      </div>
    );
  }

  // Render with expand button
  return (
    <div
      className={cn(
        "group relative rounded-lg transition-all duration-200 ease-out",
        "px-3 py-2 -mx-3 -my-2",
        "border border-transparent",
        enableHoverEffects && "hover:border-gray-200 dark:hover:border-gray-700",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expand button - positioned absolutely */}
      {isHovered && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-md",
                    "bg-white dark:bg-gray-950",
                    "border border-gray-200 dark:border-gray-700",
                    "shadow-sm hover:shadow-md",
                    "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
                    "transition-all duration-200",
                    "animate-in fade-in-50 slide-in-from-left-2 duration-200"
                  )}
                  onClick={handleExpandClick}
                >
                  <Wand2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                AI深度展开
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Main content */}
      <div className="relative">{children}</div>
    </div>
  );
}