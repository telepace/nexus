"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReferenceManagerSafe } from "./ReferenceManager";
import { Card, CardContent } from "./card";

interface EnhancedReferenceTooltipProps {
  refId: number;
  children: React.ReactElement;
  showPreview?: boolean;
  delay?: number;
  className?: string;
}

/**
 * 🎨 增强的引用工具提示组件
 * 
 * 特性：
 * - 智能内容预览
 * - 延迟加载
 * - 优雅的动画效果
 * - 自适应位置
 */
export const EnhancedReferenceTooltip: React.FC<EnhancedReferenceTooltipProps> = ({
  refId,
  children,
  showPreview = true,
  delay = 500,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const { actions } = useReferenceManagerSafe();

  // 计算最佳位置
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // 默认显示在上方
    let newPosition: typeof position = 'top';

    // 检查是否有足够空间显示在上方
    if (triggerRect.top < tooltipRect.height + 10) {
      newPosition = 'bottom';
    }

    // 检查左右边界
    if (triggerRect.left + tooltipRect.width > viewport.width - 10) {
      newPosition = 'left';
    } else if (triggerRect.left < tooltipRect.width + 10) {
      newPosition = 'right';
    }

    setPosition(newPosition);
  };

  // 获取引用内容
  const fetchReferenceContent = async () => {
    if (!showPreview) return;
    
    setLoading(true);
    try {
      // 模拟获取引用内容（实际应该从API获取）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const mockContent = `这是第${refId}段的内容预览。包含了重要的信息和观点，为AI分析提供了关键的支撑数据。这段文字展示了原文的核心思想和关键细节。`;
      setContent(mockContent);
    } catch (error) {
      console.error('Failed to fetch reference content:', error);
      setContent('无法加载内容预览');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      fetchReferenceContent();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setTimeout(() => {
      setIsVisible(false);
      setContent(null);
    }, 100);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    const baseClasses = "absolute z-50 transition-all duration-200 ease-out";
    
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
  };

  const getArrowClasses = () => {
    const arrowColor = "border-gray-900 dark:border-gray-100";
    
    switch (position) {
      case 'top':
        return `absolute top-full left-1/2 transform -translate-x-1/2 border-6 border-transparent border-t-gray-900 dark:border-t-gray-100`;
      case 'bottom':
        return `absolute bottom-full left-1/2 transform -translate-x-1/2 border-6 border-transparent border-b-gray-900 dark:border-b-gray-100`;
      case 'left':
        return `absolute left-full top-1/2 transform -translate-y-1/2 border-6 border-transparent border-l-gray-900 dark:border-l-gray-100`;
      case 'right':
        return `absolute right-full top-1/2 transform -translate-y-1/2 border-6 border-transparent border-r-gray-900 dark:border-r-gray-100`;
    }
  };

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
          }}
        >
          <Card className="w-80 shadow-lg border-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* 标题 */}
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">引用 #{refId}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs opacity-70">来源</span>
                  </div>
                </div>
                
                {/* 内容预览 */}
                {showPreview && (
                  <div className="border-t border-gray-700 dark:border-gray-300 pt-3">
                    {loading ? (
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-700 dark:bg-gray-300 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-700 dark:bg-gray-300 rounded w-3/4 animate-pulse"></div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed opacity-90 line-clamp-4">
                        {content}
                      </p>
                    )}
                  </div>
                )}
                
                {/* 操作按钮 */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700 dark:border-gray-300">
                  <button
                    onClick={() => actions?.jumpToParagraph?.(refId)}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full transition-colors duration-200 flex items-center gap-1"
                  >
                    <span>🔗</span>
                    跳转
                  </button>
                  
                  <div className="text-xs opacity-60">
                    点击数字跳转到原文
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 箭头 */}
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

export default EnhancedReferenceTooltip;