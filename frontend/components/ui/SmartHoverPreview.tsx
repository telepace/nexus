"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useReferenceStore,
  type ReferenceContent,
} from "@/lib/stores/referenceStore";
import { usePreviewAnimation } from "@/lib/hooks/useReferenceAnimation";
import { useReferenceManagerSafe } from "./ReferenceManager";
import { Card, CardContent, CardHeader } from "./card";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { Quote, ExternalLink, Clock, Zap } from "lucide-react";

/**
 * 🔮 智能悬浮预览组件
 *
 * 设计理念：
 * - 智能位置计算，避免屏幕溢出
 * - 磨砂玻璃效果，现代化视觉设计
 * - 延迟加载和缓存优化
 * - 丰富的内容预览和元信息
 */

export interface SmartHoverPreviewProps {
  refId: number;
  contentId: string;
  triggerRef: React.RefObject<HTMLElement>;

  // 显示控制
  isVisible: boolean;
  onVisibilityChange?: (visible: boolean) => void;

  // 位置配置
  position?: "auto" | "top" | "bottom" | "left" | "right";
  offset?: number;

  // 内容配置
  maxLength?: number;
  showMetadata?: boolean;
  showPosition?: boolean;

  // 样式定制
  className?: string;
  maxWidth?: number;

  // 行为控制
  delay?: number;
  hideDelay?: number;
  preventAutoHide?: boolean;

  // 回调函数
  onContentLoad?: (content: ReferenceContent) => void;
  onError?: (error: Error) => void;

  // 调试模式
  debug?: boolean;
}

type LoadingState = "idle" | "loading" | "success" | "error";

// 智能位置计算
const calculateOptimalPosition = (
  triggerRect: DOMRect,
  previewRect: DOMRect,
  preferredPosition: string,
  offset: number,
) => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const positions = {
    top: {
      x: triggerRect.left + triggerRect.width / 2 - previewRect.width / 2,
      y: triggerRect.top - previewRect.height - offset,
    },
    bottom: {
      x: triggerRect.left + triggerRect.width / 2 - previewRect.width / 2,
      y: triggerRect.bottom + offset,
    },
    left: {
      x: triggerRect.left - previewRect.width - offset,
      y: triggerRect.top + triggerRect.height / 2 - previewRect.height / 2,
    },
    right: {
      x: triggerRect.right + offset,
      y: triggerRect.top + triggerRect.height / 2 - previewRect.height / 2,
    },
  };

  // 检查位置是否在视口内
  const isInViewport = (pos: { x: number; y: number }) => {
    return (
      pos.x >= 16 &&
      pos.x + previewRect.width <= viewport.width - 16 &&
      pos.y >= 16 &&
      pos.y + previewRect.height <= viewport.height - 16
    );
  };

  // 如果首选位置可用，使用它
  if (
    preferredPosition !== "auto" &&
    positions[preferredPosition as keyof typeof positions]
  ) {
    const pos = positions[preferredPosition as keyof typeof positions];
    if (isInViewport(pos)) {
      return { ...pos, placement: preferredPosition };
    }
  }

  // 否则按优先级尝试其他位置
  const priorityOrder = ["bottom", "top", "right", "left"];

  for (const placement of priorityOrder) {
    const pos = positions[placement as keyof typeof positions];
    if (isInViewport(pos)) {
      return { ...pos, placement };
    }
  }

  // 如果都不合适，使用底部并调整到视口内
  let finalPos = positions.bottom;
  finalPos.x = Math.max(
    16,
    Math.min(finalPos.x, viewport.width - previewRect.width - 16),
  );
  finalPos.y = Math.max(
    16,
    Math.min(finalPos.y, viewport.height - previewRect.height - 16),
  );

  return { ...finalPos, placement: "bottom" };
};

export const SmartHoverPreview: React.FC<SmartHoverPreviewProps> = ({
  refId,
  contentId,
  triggerRef,
  isVisible,
  onVisibilityChange,
  position = "auto",
  offset = 8,
  maxLength = 200,
  showMetadata = true,
  showPosition = true,
  className,
  maxWidth = 320,
  delay = 0,
  hideDelay = 150,
  preventAutoHide = false,
  onContentLoad,
  onError,
  debug = false,
}) => {
  // 状态管理
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [referenceContent, setReferenceContent] =
    useState<ReferenceContent | null>(null);
  const [previewPosition, setPreviewPosition] = useState({
    x: 0,
    y: 0,
    placement: "bottom",
  });

  // Refs
  const previewRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store 和服务
  const { getCachedContent, setCachedContent, getContentCacheKey } =
    useReferenceStore();
  const { actions } = useReferenceManagerSafe();
  const animation = usePreviewAnimation();

  // 调试日志
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[SmartHoverPreview-${refId}] ${message}`, data || "");
      }
    },
    [debug, refId],
  );

  // 加载引用内容
  const loadReferenceContent = useCallback(async () => {
    if (loadingState === "loading") return;

    const cacheKey = getContentCacheKey(refId, contentId);
    const cached = getCachedContent(cacheKey);

    if (cached) {
      log("使用缓存内容");
      setReferenceContent(cached);
      setLoadingState("success");
      onContentLoad?.(cached);
      return;
    }

    setLoadingState("loading");
    log("开始加载引用内容");

    try {
      const content = await actions.getEnhancedReferenceInfo(refId, contentId);

      if (content) {
        const referenceData: ReferenceContent = {
          id: `${contentId}-${refId}`,
          refId,
          content: content.content || content.snippet || "",
          snippet: content.snippet || content.content || "",
          position: content.position,
          metadata: content.metadata,
          loadedAt: Date.now(),
        };

        setReferenceContent(referenceData);
        setCachedContent(cacheKey, referenceData);
        setLoadingState("success");
        log("内容加载成功");
        onContentLoad?.(referenceData);
      } else {
        throw new Error("引用内容为空");
      }
    } catch (error) {
      log("内容加载失败", error);
      setLoadingState("error");
      onError?.(error as Error);
    }
  }, [
    refId,
    contentId,
    loadingState,
    getContentCacheKey,
    getCachedContent,
    setCachedContent,
    actions,
    onContentLoad,
    onError,
    log,
  ]);

  // 计算预览位置
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !previewRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const previewRect = previewRef.current.getBoundingClientRect();

    const optimalPos = calculateOptimalPosition(
      triggerRect,
      previewRect,
      position,
      offset,
    );

    log("计算预览位置", { triggerRect, previewRect, optimalPos });
    setPreviewPosition(optimalPos);
  }, [triggerRef, position, offset, log]);

  // 处理显示状态变化
  useEffect(() => {
    if (isVisible) {
      // 延迟显示
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          loadReferenceContent();
          calculatePosition();
        }, delay);
      } else {
        loadReferenceContent();
        calculatePosition();
      }
    } else {
      // 延迟隐藏
      if (hideDelay > 0 && !preventAutoHide) {
        timeoutRef.current = setTimeout(() => {
          onVisibilityChange?.(false);
        }, hideDelay);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    isVisible,
    delay,
    hideDelay,
    preventAutoHide,
    loadReferenceContent,
    calculatePosition,
    onVisibilityChange,
  ]);

  // 监听窗口变化，重新计算位置
  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => calculatePosition();
    const handleScroll = () => calculatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isVisible, calculatePosition]);

  // 处理鼠标事件
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!preventAutoHide) {
      onVisibilityChange?.(false);
    }
  }, [preventAutoHide, onVisibilityChange]);

  // 渲染内容
  const renderContent = () => {
    switch (loadingState) {
      case "loading":
        return (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        );

      case "error":
        return (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <Zap className="w-4 h-4" />
            <span>暂时无法加载引用内容</span>
          </div>
        );

      case "success":
        if (!referenceContent) return null;

        const displayContent =
          referenceContent.content.length > maxLength
            ? `${referenceContent.content.substring(0, maxLength)}...`
            : referenceContent.content;

        return (
          <div className="space-y-3">
            {/* 主要内容 */}
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {displayContent}
            </div>

            {/* 元信息 */}
            {showMetadata && referenceContent.metadata && (
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {referenceContent.metadata.wordCount && (
                    <span>{referenceContent.metadata.wordCount} 字</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>刚刚</span>
                  </div>
                </div>

                <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 transition-colors" />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 如果不可见，不渲染
  if (!isVisible) return null;

  // 使用 Portal 渲染到 body
  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={previewRef}
        className="fixed z-50 pointer-events-auto"
        style={{
          top: previewPosition.y,
          left: previewPosition.x,
          maxWidth,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        variants={animation.variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* 背景遮罩 */}
        <div className="absolute inset-0 -z-10 bg-black/5 dark:bg-black/10 backdrop-blur-sm rounded-lg" />

        <Card
          className={cn(
            "shadow-2xl border-0 overflow-hidden backdrop-blur-md",
            "bg-white/95 dark:bg-gray-900/95",
            className,
          )}
        >
          {/* 渐变背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 dark:from-gray-900 dark:via-gray-800/80 dark:to-blue-900/20" />

          {/* 内容区域 */}
          <div className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Quote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    引用 #{refId}
                  </span>
                </div>

                {loadingState === "success" && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      预览
                    </Badge>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                )}
              </div>

              {/* 位置信息 */}
              {showPosition &&
                loadingState === "success" &&
                referenceContent?.position && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {referenceContent.position.chapter && (
                      <Badge variant="outline" className="text-xs">
                        {referenceContent.position.chapter}
                      </Badge>
                    )}
                    <span>第 {referenceContent.position.index} 段</span>
                  </div>
                )}
            </CardHeader>

            <CardContent className="pt-0">{renderContent()}</CardContent>
          </div>

          {/* 装饰性底部渐变 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />

          {/* 位置指示箭头 */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-white dark:bg-gray-900 rotate-45 border",
              {
                "top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-r-0 border-b-0":
                  previewPosition.placement === "top",
                "bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-l-0 border-t-0":
                  previewPosition.placement === "bottom",
                "left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-r-0 border-t-0":
                  previewPosition.placement === "left",
                "right-full top-1/2 translate-x-1/2 -translate-y-1/2 border-l-0 border-b-0":
                  previewPosition.placement === "right",
              },
            )}
          />
        </Card>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default SmartHoverPreview;
