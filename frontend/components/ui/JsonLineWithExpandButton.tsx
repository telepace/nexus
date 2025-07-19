"use client";

import React, { useState } from "react";
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
  /** Whether the child component has already handled expand button (prevents double buttons) */
  hasCustomExpandButton?: boolean;
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
  hasCustomExpandButton = false,
}: JsonLineWithExpandButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Check if this line should show expand button
  // Support both boolean true and string expandable values
  // But don't show if child component already has custom expand button
  const shouldShowButton = !hasCustomExpandButton && (showExpandButton || !!jsonLine.expandable);

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
          "px-3 py-2 -mx-3 my-1",
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
        // 預留 40px 空槽給展開按鈕 (pl-10 => 2.5rem)
        "py-2 pr-3 pl-10 -mx-3 my-1",
        "border border-transparent",
        enableHoverEffects &&
          "hover:border-gray-200 dark:hover:border-gray-700",
        "overflow-visible", // 確保子元素不被裁切
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expand button - positioned absolutely */}
      {isHovered && (
        // icon 放置在預留區域內，left-3 (0.75rem) 與 pl-10 搭配，保持約 28px 間隔
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-50">
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
                    // 移除 slide-in-from-left，改為淡入
                    "animate-in fade-in-50 duration-200",
                  )}
                  onClick={handleExpandClick}
                >
                  <span className="text-[12px]">💭</span>
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
