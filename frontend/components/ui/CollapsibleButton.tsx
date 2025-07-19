"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface CollapsibleButtonProps {
  /** 是否处于折叠状态 */
  isCollapsed: boolean;
  /** 点击回调函数 */
  onClick: (e: React.MouseEvent) => void;
  /** 按钮大小 */
  size?: "sm" | "md" | "lg";
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-7 w-7", 
  lg: "h-8 w-8",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function CollapsibleButton({
  isCollapsed,
  onClick,
  size = "md",
  className,
  disabled = false,
}: CollapsibleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        sizeClasses[size],
        "text-neutral-400 hover:text-neutral-600 relative z-10",
        "transition-colors duration-200",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isCollapsed ? 180 : 0 }}
        transition={{ 
          duration: 0.3, 
          ease: "easeInOut",
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <ChevronDown className={iconSizes[size]} />
      </motion.div>
    </Button>
  );
} 