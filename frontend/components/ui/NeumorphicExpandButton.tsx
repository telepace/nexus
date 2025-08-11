"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslationUtils } from "@/lib/i18n-utils";

interface NeumorphicExpandButtonProps {
  /** Callback when expand button is clicked */
  onExpand?: () => void;
  /** Button position side */
  side?: "left" | "right";
  /** Custom className */
  className?: string;
  /** External hover state control */
  isHovered?: boolean;
}

/**
 * Neumorphic style expand button component
 * Replicates the design from 新拟物.html with smooth animations
 */
export function NeumorphicExpandButton({
  onExpand,
  side = "left",
  className,
  isHovered: externalIsHovered,
}: NeumorphicExpandButtonProps) {
  const [internalIsHovered, setInternalIsHovered] = useState(false);
  const isHovered =
    externalIsHovered !== undefined ? externalIsHovered : internalIsHovered;
  const { t } = useTranslationUtils();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExpand) {
      onExpand();
    }
  };

  const positionClasses = side === "left" ? "left-6" : "right-6";

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-50",
        positionClasses,
        className,
      )}
    >
      <button
        className={cn(
          // Base styles matching HTML design
          "w-10 h-10 rounded-full transition-all duration-400 ease-in-out",
          "flex items-center justify-center overflow-hidden",
          // Neumorphic styles matching the HTML
          "linear-bg-1",
          "shadow-[5px_5px_10px_#c2c2c2,-5px_-5px_10px_#ffffff]",
          // Active/pressed state
          "active:shadow-[inset_5px_5px_10px_#c2c2c2,inset_-5px_-5px_10px_#ffffff]",
          // Custom sparkles cursor style
          "cursor-pointer",
          // Hover expansion
          isHovered && "w-36",
        )}
        onClick={handleClick}
        onMouseEnter={() => setInternalIsHovered(true)}
        onMouseLeave={() => setInternalIsHovered(false)}
      >
        {/* Search icon - fades out on hover */}
        <div
          className={cn(
            "absolute transition-opacity duration-200",
            isHovered ? "opacity-0" : "opacity-100",
          )}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Text - fades in on hover with delay */}
        <span
          className={cn(
            "text-gray-700 font-semibold text-sm whitespace-nowrap transition-opacity duration-200",
            isHovered ? "opacity-100 delay-200" : "opacity-0",
          )}
        >
          {t("content.deepDig")}
        </span>
      </button>
    </div>
  );
}
