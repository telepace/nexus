"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReferenceManagerSafe, type EnhancedReferenceInfo } from "./ReferenceManager";
import { Card, CardContent, CardHeader } from "./card";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { Quote, ExternalLink, Clock } from "lucide-react";

interface ElegantReferenceTooltipProps {
  refId: number;
  contentId?: string;
  children: React.ReactElement;
  delay?: number;
  maxLength?: number;
  position?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onReferenceLoad?: (info: EnhancedReferenceInfo) => void;
  onError?: (error: Error) => void;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 🎨 优雅的引用悬浮卡片
 * 
 * 设计理念：
 * - 类似Medium/Notion的优雅悬浮卡片
 * - 渐变背景、阴影、动画效果
 * - 内容预览和元信息展示
 * - 响应式设计，适配不同屏幕
 */
export const ElegantReferenceTooltip: React.FC<ElegantReferenceTooltipProps> = ({
  refId,
  contentId,
  children,
  delay = 300,
  maxLength = 200,
  position = 'auto',
  className,
  onReferenceLoad,
  onError,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [referenceInfo, setReferenceInfo] = useState<EnhancedReferenceInfo | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const { actions } = useReferenceManagerSafe();

  // 加载引用数据
  const loadReferenceData = useCallback(async () => {
    if (loadingState === 'loading' || referenceInfo) return;
    
    setLoadingState('loading');
    
    try {
      const info = await actions.getEnhancedReferenceInfo(refId, contentId);
      if (info) {
        setReferenceInfo(info);
        setLoadingState('success');
        onReferenceLoad?.(info);
      } else {
        setLoadingState('error');
      }
    } catch (error) {
      console.error('加载引用信息失败:', error);
      setLoadingState('error');
      onError?.(error as Error);
    }
  }, [refId, contentId, loadingState, referenceInfo, actions, onReferenceLoad, onError]);

  // 计算悬浮卡片位置
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = triggerRect.bottom + 8;
    let left = triggerRect.left;
    
    // 智能位置调整
    if (position === 'auto') {
      // 右侧空间不足时，右对齐
      if (left + tooltipRect.width > viewportWidth - 16) {
        left = triggerRect.right - tooltipRect.width;
      }
      
      // 下方空间不足时，显示在上方
      if (top + tooltipRect.height > viewportHeight - 16) {
        top = triggerRect.top - tooltipRect.height - 8;
      }
      
      // 确保不超出左边界
      left = Math.max(16, left);
    }
    
    setTooltipPosition({ top, left });
  }, [position]);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      loadReferenceData();
    }, delay);
  }, [delay, loadReferenceData]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 短暂延迟后隐藏，允许用户移动到卡片上
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  }, []);

  // 处理卡片鼠标进入（保持显示）
  const handleTooltipMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // 处理卡片鼠标离开
  const handleTooltipMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 监听位置变化
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible, calculatePosition]);

  // 克隆children并添加事件处理
  const trigger = React.cloneElement(children, {
    ref: (el: HTMLElement) => {
      triggerRef.current = el;
      // 保持原有的ref
      if (typeof children.ref === 'function') {
        children.ref(el);
      } else if (children.ref) {
        children.ref.current = el;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
    className: cn(children.props.className, className),
  });

  return (
    <>
      {trigger}
      
      <AnimatePresence>
        {isVisible && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 pointer-events-none"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
            />
            
            {/* 悬浮卡片 */}
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
                duration: 0.2
              }}
              className="fixed z-50 pointer-events-auto"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              <Card className="w-80 max-w-[calc(100vw-2rem)] shadow-2xl border-0 overflow-hidden">
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
                      
                      {loadingState === 'success' && referenceInfo && (
                        <div className="flex items-center gap-2">
                          {referenceInfo.isFromCache && (
                            <Badge variant="secondary" className="text-xs">
                              缓存
                            </Badge>
                          )}
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    {/* 位置信息 */}
                    {loadingState === 'success' && referenceInfo?.position && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {referenceInfo.position.chapter && (
                          <Badge variant="outline" className="text-xs">
                            {referenceInfo.position.chapter}
                          </Badge>
                        )}
                        <span>第 {referenceInfo.position.index} 段</span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* 内容区域 */}
                    {loadingState === 'loading' && (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                      </div>
                    )}
                    
                    {loadingState === 'error' && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                        <span>⚠️</span>
                        <span>暂时无法加载引用内容</span>
                      </div>
                    )}
                    
                    {loadingState === 'success' && referenceInfo && (
                      <div className="space-y-3">
                        {/* 主要内容 */}
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {referenceInfo.content && referenceInfo.content.length > maxLength
                            ? `${referenceInfo.content.substring(0, maxLength)}...`
                            : (referenceInfo.content || referenceInfo.snippet)
                          }
                        </div>
                        
                        {/* 元信息 */}
                        {referenceInfo.metadata && (
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              {referenceInfo.metadata.wordCount && (
                                <span>{referenceInfo.metadata.wordCount} 字</span>
                              )}
                              {referenceInfo.loadedAt && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>刚刚</span>
                                </div>
                              )}
                            </div>
                            
                            <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 transition-colors" />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>
                
                {/* 装饰性底部渐变 */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ElegantReferenceTooltip;