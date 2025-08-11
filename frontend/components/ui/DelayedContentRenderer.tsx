"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContentSkeleton } from "./ContentSkeleton";
import { UniversalContentRenderer } from "./UniversalContentRenderer";
import { cn } from "@/lib/utils";

export interface DelayedContentRendererProps {
  /** 要渲染的内容 */
  content: string | null | undefined;
  /** 是否可见（控制是否开始渲染） */
  isVisible: boolean;
  /** 延迟时间（毫秒） */
  delay?: number;
  /** 骨架屏变体 */
  skeletonVariant?: "simple" | "detailed" | "minimal";
  /** 自定义类名 */
  className?: string;
  /** 传递给UniversalContentRenderer的props */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  /** 渲染完成回调 */
  onRenderComplete?: () => void;
  /** 开始渲染回调 */
  onRenderStart?: () => void;
}

/**
 * DelayedContentRenderer 延迟渲染组件
 *
 * 核心功能：
 * 1. 立即显示骨架屏，确保动画流畅
 * 2. 延迟指定时间后开始渲染真实内容
 * 3. 渲染完成后平滑切换到真实内容
 * 4. 支持快速切换不同内容
 */
export function DelayedContentRenderer({
  content,
  isVisible,
  delay = 400,
  skeletonVariant = "simple",
  className,
  onExpandLine,
  onRenderComplete,
  onRenderStart,
}: DelayedContentRendererProps) {
  const [isContentReady, setIsContentReady] = useState(false);
  const [currentContent, setCurrentContent] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderingRef = useRef(false);

  // 清理定时器的工具函数
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 开始延迟渲染的函数
  const startDelayedRender = useCallback(
    (targetContent: string) => {
      // 清理之前的定时器
      clearTimer();

      // 重置状态
      setIsContentReady(false);
      renderingRef.current = true;

      // 调用开始渲染回调
      onRenderStart?.();

      // 启动延迟定时器
      timeoutRef.current = setTimeout(() => {
        if (renderingRef.current) {
          setCurrentContent(targetContent);
          setIsContentReady(true);
          onRenderComplete?.();
        }
      }, delay);
    },
    [delay, clearTimer, onRenderStart, onRenderComplete],
  );

  // 处理内容和可见性变化
  useEffect(() => {
    if (!isVisible) {
      // 不可见时清理所有状态
      clearTimer();
      setIsContentReady(false);
      setCurrentContent(null);
      renderingRef.current = false;
      return;
    }

    if (!content) {
      // 内容为空时清理状态
      clearTimer();
      setIsContentReady(false);
      setCurrentContent(null);
      renderingRef.current = false;
      return;
    }

    // 内容变化时重新开始延迟渲染
    startDelayedRender(content);

    // 清理函数
    return () => {
      renderingRef.current = false;
    };
  }, [content, isVisible, startDelayedRender, clearTimer]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearTimer();
      renderingRef.current = false;
    };
  }, [clearTimer]);

  // 不可见时不渲染任何内容
  if (!isVisible) {
    return null;
  }

  // 渲染骨架屏和真实内容的切换
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {!isContentReady ? (
          // 显示骨架屏
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ContentSkeleton
              variant={skeletonVariant}
              blocks={4}
              animated={true}
            />
          </motion.div>
        ) : (
          // 显示真实内容
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <UniversalContentRenderer
              content={currentContent}
              onExpandLine={onExpandLine}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
