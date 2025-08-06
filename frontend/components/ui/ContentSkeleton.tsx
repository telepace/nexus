"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ContentSkeletonProps {
  /** 骨架屏变体 */
  variant?: "simple" | "detailed" | "minimal";
  /** 显示的块数量 */
  blocks?: number;
  /** 是否启用动画 */
  animated?: boolean;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义高度 */
  height?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * ContentSkeleton 骨架屏组件
 * 用于在内容加载时显示占位符，提供平滑的用户体验
 */
export function ContentSkeleton({
  variant = "simple",
  blocks = 3,
  animated = true,
  loading = true,
  height,
  className,
}: ContentSkeletonProps) {
  const baseClasses = cn(
    "space-y-4 p-6",
    variant,
    // 移除pulse动画
    className,
  );

  const skeletonBlockClasses = cn(
    "bg-neutral-200 dark:bg-neutral-700 rounded",
    // 移除pulse动画
  );

  const renderSimpleVariant = () => (
    <>
      {/* 标题骨架 */}
      <div
        data-testid="skeleton-title"
        className={cn(skeletonBlockClasses, "h-6 w-3/4")}
      />

      {/* 内容骨架 */}
      <div data-testid="skeleton-content" className="space-y-3">
        {Array.from({ length: blocks }, (_, index) => (
          <div
            key={index}
            data-testid={`skeleton-block-${index}`}
            className={cn(
              skeletonBlockClasses,
              "h-4",
              index === 0 ? "w-full" : index === blocks - 1 ? "w-2/3" : "w-5/6",
            )}
          />
        ))}
      </div>
    </>
  );

  const renderDetailedVariant = () => (
    <>
      {/* 头部骨架 */}
      <div
        data-testid="skeleton-header"
        className="flex items-center space-x-3"
      >
        <div className={cn(skeletonBlockClasses, "h-10 w-10 rounded-full")} />
        <div className="space-y-2 flex-1">
          <div className={cn(skeletonBlockClasses, "h-4 w-1/3")} />
          <div className={cn(skeletonBlockClasses, "h-3 w-1/4")} />
        </div>
      </div>

      {/* 元数据骨架 */}
      <div data-testid="skeleton-metadata" className="flex space-x-4">
        <div className={cn(skeletonBlockClasses, "h-3 w-16")} />
        <div className={cn(skeletonBlockClasses, "h-3 w-20")} />
        <div className={cn(skeletonBlockClasses, "h-3 w-12")} />
      </div>

      {/* 标题骨架 */}
      <div
        data-testid="skeleton-title"
        className={cn(skeletonBlockClasses, "h-8 w-4/5")}
      />

      {/* 内容骨架 */}
      <div data-testid="skeleton-content" className="space-y-3">
        {Array.from({ length: blocks }, (_, index) => (
          <div
            key={index}
            data-testid={`skeleton-block-${index}`}
            className={cn(
              skeletonBlockClasses,
              "h-4",
              index === 0
                ? "w-full"
                : index === 1
                  ? "w-11/12"
                  : index === blocks - 1
                    ? "w-3/5"
                    : "w-5/6",
            )}
          />
        ))}
      </div>

      {/* 标签骨架 */}
      <div data-testid="skeleton-tags" className="flex space-x-2">
        <div className={cn(skeletonBlockClasses, "h-6 w-16 rounded-full")} />
        <div className={cn(skeletonBlockClasses, "h-6 w-20 rounded-full")} />
        <div className={cn(skeletonBlockClasses, "h-6 w-12 rounded-full")} />
      </div>
    </>
  );

  const renderMinimalVariant = () => (
    <>
      {/* 仅显示基本的标题和内容骨架 */}
      <div
        data-testid="skeleton-title"
        className={cn(skeletonBlockClasses, "h-5 w-2/3")}
      />
      <div data-testid="skeleton-content" className="space-y-2">
        {Array.from({ length: Math.min(blocks, 2) }, (_, index) => (
          <div
            key={index}
            data-testid={`skeleton-block-${index}`}
            className={cn(
              skeletonBlockClasses,
              "h-3",
              index === 0 ? "w-full" : "w-4/5",
            )}
          />
        ))}
      </div>
    </>
  );

  const renderContent = () => {
    switch (variant) {
      case "detailed":
        return renderDetailedVariant();
      case "minimal":
        return renderMinimalVariant();
      case "simple":
      default:
        return renderSimpleVariant();
    }
  };

  return (
    <div
      data-testid="content-skeleton"
      className={baseClasses}
      style={height ? { height } : undefined}
    >
      {renderContent()}
    </div>
  );
}
