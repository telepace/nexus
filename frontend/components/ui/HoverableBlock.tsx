"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface HoverableBlockProps {
  children: React.ReactNode;
  className?: string;
  /** 悬浮效果强度 */
  hoverIntensity?: "none" | "subtle" | "medium" | "strong";
  /** 是否启用悬浮效果 */
  enableHover?: boolean;
  /** 自定义悬浮样式 */
  hoverClassName?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 悬浮进入回调 */
  onHoverStart?: () => void;
  /** 悬浮离开回调 */
  onHoverEnd?: () => void;
  /** 是否显示左侧操作区域 */
  showLeftActions?: boolean;
  /** 左侧操作内容 */
  leftActions?: React.ReactNode;
  /** 是否显示右侧操作区域 */
  showRightActions?: boolean;
  /** 右侧操作内容 */
  rightActions?: React.ReactNode;
  /** 测试ID */
  testId?: string;
}

// 预定义的悬浮样式 - 使用优化的CSS类
const hoverStyles = {
  none: "",
  subtle: "hover-optimized hover-subtle",
  medium: "hover-optimized hover-medium", 
  strong: "hover-optimized hover-strong",
};

/**
 * 统一的悬浮块组件
 * 
 * 提供一致的悬浮效果和交互体验，支持：
 * - 多种悬浮强度
 * - 左右侧操作区域
 * - 平滑动画过渡
 * - 性能优化
 */
export const HoverableBlock: React.FC<HoverableBlockProps> = ({
  children,
  className,
  hoverIntensity = "medium",
  enableHover = true,
  hoverClassName,
  onClick,
  onHoverStart,
  onHoverEnd,
  showLeftActions = false,
  leftActions,
  showRightActions = false,
  rightActions,
  testId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 优化的悬浮处理，避免频繁状态切换
  const handleMouseEnter = useCallback(() => {
    if (!enableHover) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    setIsHovered(true);
    onHoverStart?.();
  }, [enableHover, onHoverStart]);

  const handleMouseLeave = useCallback(() => {
    if (!enableHover) return;
    
    // 添加小延迟避免快速进出时的闪烁
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      onHoverEnd?.();
    }, 50);
  }, [enableHover, onHoverEnd]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 基础样式
  const baseStyles = cn(
    "group relative rounded-lg border border-transparent",
    "px-3 py-2 -mx-3 -my-1",
    "hoverable-block", // 🎯 添加性能优化类
    enableHover && hoverStyles[hoverIntensity],
    hoverClassName,
    onClick && "cursor-pointer",
    className
  );

  return (
    <div
      data-testid={testId}
      className={baseStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* 左侧操作区域 */}
      {showLeftActions && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2">
          <div 
            className={cn(
              "flex items-center gap-1 transition-opacity duration-200 ease-out",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {leftActions}
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="relative min-w-0 flex-1">
        {children}
      </div>

      {/* 右侧操作区域 */}
      {showRightActions && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
          <div 
            className={cn(
              "flex items-center gap-1 transition-opacity duration-200 ease-out",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {rightActions}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化版悬浮块，只提供基础悬浮效果
 */
export const SimpleHoverBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
  onClick?: () => void;
}> = ({ children, className, intensity = "medium", onClick }) => {
  return (
    <HoverableBlock
      className={className}
      hoverIntensity={intensity}
      onClick={onClick}
    >
      {children}
    </HoverableBlock>
  );
};

/**
 * Notion风格的悬浮块，带左右操作区域
 */
export const NotionStyleBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  onClick?: () => void;
}> = ({ children, className, leftActions, rightActions, onClick }) => {
  return (
    <HoverableBlock
      className={className}
      hoverIntensity="subtle"
      onClick={onClick}
      showLeftActions={!!leftActions}
      leftActions={leftActions}
      showRightActions={!!rightActions}
      rightActions={rightActions}
    >
      {children}
    </HoverableBlock>
  );
};

export default HoverableBlock; 