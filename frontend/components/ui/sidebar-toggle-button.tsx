"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarToggleButtonProps {
  /** 自定义样式类名 */
  className?: string;
  /** 按钮大小 */
  size?: "sm" | "md" | "lg";
  /** 是否显示在右侧边缘 */
  showOnEdge?: boolean;
  /** 图标类型 */
  iconType?: "chevron" | "panel";
  /** 是否显示工具提示 */
  showTooltip?: boolean;
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

export function SidebarToggleButton({
  className,
  size = "md",
  showOnEdge = false,
  iconType = "chevron",
  showTooltip = true,
}: SidebarToggleButtonProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  };

  const getIcon = () => {
    if (iconType === "panel") {
      return isCollapsed ? (
        <PanelLeftOpen className={iconSizes[size]} />
      ) : (
        <PanelLeftClose className={iconSizes[size]} />
      );
    }
    
    return isCollapsed ? (
      <ChevronRight className={iconSizes[size]} />
    ) : (
      <ChevronLeft className={iconSizes[size]} />
    );
  };

  const tooltipText = isCollapsed ? "展开侧边栏" : "收起侧边栏";

  const buttonContent = (
    <Button
      variant={showOnEdge ? "outline" : "ghost"}
      size="icon"
      className={cn(
        sizeClasses[size],
        showOnEdge
          ? [
              "bg-white border-neutral-200 shadow-md hover:shadow-lg",
              "text-neutral-500 hover:text-neutral-700",
            ]
          : [
              "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100",
              "rounded-md",
            ],
        "transition-all duration-200",
        className
      )}
      onClick={handleToggle}
    >
      <motion.div
        initial={false}
        animate={{ 
          scale: [1, 0.9, 1],
        }}
        transition={{ 
          duration: 0.15,
          ease: "easeInOut"
        }}
        key={isCollapsed ? "collapsed" : "expanded"}
      >
        {getIcon()}
      </motion.div>
    </Button>
  );

  if (showOnEdge) {
    // 显示在侧边栏右边缘的版本
    const edgeContent = (
      <div
        className={cn(
          "absolute -right-3 top-4 z-30",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          className
        )}
      >
        {buttonContent}
      </div>
    );

    return showTooltip ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {edgeContent}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : edgeContent;
  }

  // 显示在侧边栏内部的版本
  return showTooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : buttonContent;
} 