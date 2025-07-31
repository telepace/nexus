"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useReferenceManagerSafe, type EnhancedReferenceInfo } from "./ReferenceManager";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";

interface OptimizedReferenceTooltipProps {
  refId: number;
  contentId?: string;
  children: React.ReactElement;
  showPreview?: boolean;
  showContext?: boolean;
  maxLength?: number;
  delay?: number;
  position?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onReferenceLoad?: (info: EnhancedReferenceInfo) => void;
  onError?: (error: Error) => void;
}

// 组件状态类型
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 设计优化：将tooltip内容分解为更小的组件
const TooltipHeader: React.FC<{
  refId: number;
  title?: string;
  position?: { chapter?: string; section?: string; index: number };
  isFromCache?: boolean;
}> = ({ refId, title, position, isFromCache }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <h4 className="font-semibold text-sm">引用 #{refId}</h4>
      {position?.chapter && (
        <Badge variant="secondary" className="text-xs">
          {position.chapter}
        </Badge>
      )}
    </div>
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isFromCache ? "bg-green-400 animate-pulse" : "bg-blue-400"
      )}></div>
      <span className="text-xs opacity-70">
        {isFromCache ? "缓存" : "实时"}
      </span>
    </div>
  </div>
);

const TooltipContent: React.FC<{
  content?: string;
  snippet?: string;
  maxLength?: number;
  loading: boolean;
  loadingState: LoadingState;
}> = ({ content, snippet, maxLength = 200, loading, loadingState }) => {
  if (loading || loadingState === 'loading') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className="text-red-400 text-xs flex items-center gap-2">
        <span>⚠️</span>
        <span>加载失败，请稍后重试</span>
      </div>
    );
  }

  const displayContent = content || snippet || '';
  const truncatedContent = displayContent.length > maxLength
    ? `${displayContent.substring(0, maxLength)}...`
    : displayContent;

  return (
    <p className="text-xs leading-relaxed opacity-90 line-clamp-4">
      {truncatedContent}
    </p>
  );
};

const TooltipContext: React.FC<{
  context?: { before?: string; after?: string };
}> = ({ context }) => {
  if (!context?.before && !context?.after) return null;

  return (
    <div className="text-xs space-y-1 opacity-75 border-t border-gray-700 dark:border-gray-300 pt-2">
      {context.before && (
        <div>
          <span className="font-medium">上文:</span> {context.before}
        </div>
      )}
      {context.after && (
        <div>
          <span className="font-medium">下文:</span> {context.after}
        </div>
      )}
    </div>
  );
};

const TooltipActions: React.FC<{
  refId: number;
  onJump: () => void;
  onClose: () => void;
  metadata?: { wordCount?: number; chunkId?: string };
}> = ({ refId, onJump, onClose, metadata }) => (
  <div className="flex items-center justify-between pt-2 border-t border-gray-700 dark:border-gray-300">
    <button
      onClick={(e) => {
        e.stopPropagation();
        onJump();
      }}
      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full transition-colors duration-200 flex items-center gap-1"
    >
      <span>🔗</span>
      跳转
    </button>
    
    <div className="text-xs opacity-60 flex items-center gap-2">
      {metadata?.wordCount && (
        <span>{metadata.wordCount}字</span>
      )}
      <span>点击跳转到原文</span>
    </div>
  </div>
);

/**
 * 🎨 优化的引用工具提示组件
 * 
 * 特性：
 * - 智能内容预览（真实数据 + 降级方案）
 * - 延迟加载和缓存
 * - 优雅的动画效果
 * - 自适应位置计算
 * - 完整的错误处理
 * - 分层架构设计
 */
export const OptimizedReferenceTooltip: React.FC<OptimizedReferenceTooltipProps> = ({
  refId,
  contentId,
  children,
  showPreview = true,
  showContext = false,
  maxLength = 200,
  delay = 500,
  position: forcedPosition = 'auto',
  className,
  onReferenceLoad,
  onError,
}) => {
  // 状态管理
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [referenceInfo, setReferenceInfo] = useState<EnhancedReferenceInfo | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<Error | null>(null);
  
  // Refs
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { actions } = useReferenceManagerSafe();

  // 优化的位置计算算法
  const calculateOptimalPosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || forcedPosition !== 'auto') {
      if (forcedPosition !== 'auto') setPosition(forcedPosition);
      return;
    }
    
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const margin = 10;

    // 计算各个方向的可用空间
    const spaces = {
      top: trigger.top - margin,
      bottom: viewport.height - trigger.bottom - margin,
      left: trigger.left - margin,
      right: viewport.width - trigger.right - margin,
    };

    // 计算每个位置的适合度得分
    const positions = [
      { 
        type: 'top' as const, 
        available: spaces.top >= tooltip.height,
        score: spaces.top >= tooltip.height ? spaces.top : 0,
      },
      { 
        type: 'bottom' as const, 
        available: spaces.bottom >= tooltip.height,
        score: spaces.bottom >= tooltip.height ? spaces.bottom : 0,
      },
      { 
        type: 'left' as const, 
        available: spaces.left >= tooltip.width,
        score: spaces.left >= tooltip.width ? spaces.left : 0,
      },
      { 
        type: 'right' as const, 
        available: spaces.right >= tooltip.width,
        score: spaces.right >= tooltip.width ? spaces.right : 0,
      },
    ];

    // 优先选择有足够空间的位置，其次选择得分最高的
    const bestPosition = positions
      .filter(pos => pos.available)
      .sort((a, b) => b.score - a.score)[0] || 
      positions.sort((a, b) => b.score - a.score)[0];

    setPosition(bestPosition.type);
  }, [forcedPosition]);

  // 优化的内容获取逻辑
  const fetchReferenceContent = useCallback(async () => {
    if (!showPreview || loadingState === 'loading') return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoadingState('loading');
    setError(null);

    try {
      // 使用增强的引用管理器获取数据
      const info = await actions.getEnhancedReferenceInfo(refId, contentId);
      
      if (abortControllerRef.current?.signal.aborted) return;

      if (info) {
        setReferenceInfo(info);
        setLoadingState('success');
        onReferenceLoad?.(info);
      } else {
        throw new Error('无法获取引用信息');
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return;
      
      const err = error as Error;
      console.error('获取引用内容失败:', err);
      setError(err);
      setLoadingState('error');
      onError?.(err);
    }
  }, [refId, contentId, showPreview, loadingState, actions, onReferenceLoad, onError]);

  // 优化的事件处理
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      fetchReferenceContent();
    }, delay);
  }, [delay, fetchReferenceContent]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 短暂延迟后隐藏，允许用户鼠标移动到tooltip上
    setTimeout(() => {
      setIsVisible(false);
      // 清理状态
      setTimeout(() => {
        if (!isVisible) {
          setReferenceInfo(null);
          setLoadingState('idle');
          setError(null);
        }
      }, 300); // 等待动画完成
    }, 100);
  }, [isVisible]);

  // 处理跳转操作
  const handleJumpToParagraph = useCallback(() => {
    actions.jumpToParagraph(refId);
    setIsVisible(false); // 跳转后隐藏tooltip
  }, [actions, refId]);

  // Effect hooks
  useEffect(() => {
    if (isVisible) {
      // 延迟一帧计算位置，确保DOM已更新
      requestAnimationFrame(() => {
        calculateOptimalPosition();
      });
    }
  }, [isVisible, calculateOptimalPosition]);

  useEffect(() => {
    // 监听窗口大小变化，重新计算位置
    const handleResize = () => {
      if (isVisible) {
        calculateOptimalPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, calculateOptimalPosition]);

  useEffect(() => {
    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 样式计算函数
  const getPositionClasses = useCallback(() => {
    const baseClasses = "absolute z-50 transition-all duration-300 ease-out";
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
    }
  }, [position]);

  const getArrowClasses = useCallback(() => {
    const baseArrow = "absolute border-6 border-transparent";
    const lightArrow = "border-t-white dark:border-t-gray-900";
    const darkBorder = "border-gray-200 dark:border-border";
    
    switch (position) {
      case 'top':
        return `${baseArrow} top-full left-1/2 transform -translate-x-1/2 border-t-white dark:border-t-gray-900`;
      case 'bottom':
        return `${baseArrow} bottom-full left-1/2 transform -translate-x-1/2 border-b-white dark:border-b-gray-900`;
      case 'left':
        return `${baseArrow} left-full top-1/2 transform -translate-y-1/2 border-l-white dark:border-l-gray-900`;
      case 'right':
        return `${baseArrow} right-full top-1/2 transform -translate-y-1/2 border-r-white dark:border-r-gray-900`;
    }
  }, [position]);

  // 主渲染逻辑
  return (
    <div 
      className="relative inline-block"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(getPositionClasses(), className)}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'scale(1)' : 'scale(0.95)',
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
          onMouseEnter={() => {
            // 当鼠标进入tooltip时，防止隐藏
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <Card className="w-80 max-w-sm shadow-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <CardContent className="p-4 space-y-3">
              {/* 标题部分 */}
              <TooltipHeader 
                refId={refId}
                title={referenceInfo?.title}
                position={referenceInfo?.position}
                isFromCache={referenceInfo?.isFromCache}
              />
              
              {/* 内容预览部分 */}
              {showPreview && (
                <div className="border-t border-gray-200 dark:border-border pt-3">
                  <TooltipContent
                    content={referenceInfo?.content}
                    snippet={referenceInfo?.snippet}
                    maxLength={maxLength}
                    loading={loadingState === 'loading'}
                    loadingState={loadingState}
                  />
                </div>
              )}
              
              {/* 上下文信息 */}
              {showContext && referenceInfo?.context && (
                <TooltipContext context={referenceInfo.context} />
              )}
              
              {/* 操作按钮 */}
              <TooltipActions
                refId={refId}
                onJump={handleJumpToParagraph}
                onClose={() => setIsVisible(false)}
                metadata={referenceInfo?.metadata}
              />
            </CardContent>
          </Card>
          
          {/* 箭头指示器 */}
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

// 保持向后兼容性的别名
export const EnhancedReferenceTooltip = OptimizedReferenceTooltip;

// 预设的tooltip变体
export const CompactReferenceTooltip: React.FC<Omit<OptimizedReferenceTooltipProps, 'showContext' | 'maxLength'>> = (props) => (
  <OptimizedReferenceTooltip 
    {...props} 
    showContext={false}
    maxLength={100}
    delay={300}
  />
);

export const DetailedReferenceTooltip: React.FC<OptimizedReferenceTooltipProps> = (props) => (
  <OptimizedReferenceTooltip 
    {...props} 
    showContext={true}
    maxLength={300}
    delay={500}
  />
);

export default OptimizedReferenceTooltip;