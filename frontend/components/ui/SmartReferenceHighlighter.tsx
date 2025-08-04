"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useReferenceManagerSafe } from "./ReferenceManager";

interface SmartReferenceHighlighterProps {
  children: React.ReactNode;
  references: number[];
  autoHighlight?: boolean;
  highlightDuration?: number;
  className?: string;
}

/**
 * 🎨 智能引用高亮器
 * 
 * 特性：
 * - 自动高亮相关引用
 * - 渐变动画效果
 * - 智能颜色分配
 * - 批量高亮管理
 */
export const SmartReferenceHighlighter: React.FC<SmartReferenceHighlighterProps> = ({
  children,
  references,
  autoHighlight = true,
  highlightDuration = 3000,
  className,
}) => {
  const [highlightedRefs, setHighlightedRefs] = useState<Set<number>>(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const { actions, state } = useReferenceManagerSafe();

  // 监听全局引用高亮事件
  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      const { refIds } = event.detail;
      if (refIds && Array.isArray(refIds)) {
        const myRefs = refIds.filter((id: number) => references.includes(id));
        if (myRefs.length > 0) {
          setHighlightedRefs(new Set(myRefs));
          
          // 自动清除高亮
          if (highlightDuration > 0) {
            setTimeout(() => {
              setHighlightedRefs(new Set());
            }, highlightDuration);
          }
        }
      }
    };

    const handleClearHighlights = () => {
      setHighlightedRefs(new Set());
    };

    window.addEventListener('highlightParagraphs', handleHighlight as EventListener);
    window.addEventListener('clearHighlights', handleClearHighlights);

    return () => {
      window.removeEventListener('highlightParagraphs', handleHighlight as EventListener);
      window.removeEventListener('clearHighlights', handleClearHighlights);
    };
  }, [references, highlightDuration]);

  // 鼠标悬停时高亮相关引用
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (autoHighlight && references.length > 0) {
      actions?.highlightParagraphs?.(references);
    }
  }, [autoHighlight, references, actions]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (autoHighlight) {
      actions?.clearHighlights?.();
    }
  }, [autoHighlight, actions]);

  // 计算高亮强度
  const getHighlightIntensity = () => {
    const highlightCount = highlightedRefs.size;
    if (highlightCount === 0) return 0;
    
    // 根据高亮的引用数量调整强度
    if (highlightCount === 1) return 0.8;
    if (highlightCount <= 3) return 0.6;
    return 0.4;
  };

  // 获取高亮颜色
  const getHighlightColor = () => {
    const colors = [
      'rgba(59, 130, 246, 0.15)', // blue
      'rgba(147, 51, 234, 0.15)', // purple
      'rgba(34, 197, 94, 0.15)',  // green
      'rgba(249, 115, 22, 0.15)', // orange
      'rgba(236, 72, 153, 0.15)', // pink
    ];
    
    // 根据引用数量选择颜色
    const colorIndex = Math.min(references.length - 1, colors.length - 1);
    return colors[colorIndex];
  };

  // 生成动态样式
  const getDynamicStyles = () => {
    const intensity = getHighlightIntensity();
    const color = getHighlightColor();
    
    if (intensity === 0 && !isHovered) {
      return {};
    }

    return {
      backgroundColor: isHovered ? 'rgba(59, 130, 246, 0.05)' : color,
      borderLeft: intensity > 0 ? `3px solid ${color.replace('0.15', '0.6')}` : undefined,
      paddingLeft: intensity > 0 ? '12px' : undefined,
      marginLeft: intensity > 0 ? '-15px' : undefined,
      borderRadius: '4px',
      transition: 'all 0.3s ease-in-out',
      transform: isHovered ? 'translateX(2px)' : undefined,
      boxShadow: intensity > 0.5 ? `0 0 20px ${color}` : undefined,
    };
  };

  // 生成脉冲动画类
  const getPulseClass = () => {
    if (highlightedRefs.size === 0) return '';
    
    return 'animate-pulse';
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-300 ease-in-out",
        getPulseClass(),
        isHovered && "z-10",
        className
      )}
      style={getDynamicStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* 高亮指示器 */}
      {highlightedRefs.size > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1">
          {Array.from(highlightedRefs).slice(0, 3).map((refId, index) => (
            <div
              key={refId}
              className="w-2 h-2 rounded-full bg-blue-500 animate-ping"
              style={{
                animationDelay: `${index * 200}ms`,
                opacity: 0.7,
              }}
            />
          ))}
          {highlightedRefs.size > 3 && (
            <div className="text-xs text-blue-600 font-medium px-1">
              +{highlightedRefs.size - 3}
            </div>
          )}
        </div>
      )}
      
      {/* 连接线效果 */}
      {isHovered && references.length > 1 && (
        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-400 rounded-full opacity-60" />
      )}
    </div>
  );
};

/**
 * 🌈 批量引用高亮管理器
 */
interface ReferenceHighlightManagerProps {
  children: React.ReactNode;
  globalHighlightColor?: string;
  maxSimultaneousHighlights?: number;
}

export const ReferenceHighlightManager: React.FC<ReferenceHighlightManagerProps> = ({
  children,
  globalHighlightColor = 'blue',
  maxSimultaneousHighlights = 10,
}) => {
  const [activeHighlights, setActiveHighlights] = useState<Map<string, number[]>>(new Map());

  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      const { refIds, source = 'global' } = event.detail;
      
      setActiveHighlights(prev => {
        const newHighlights = new Map(prev);
        newHighlights.set(source, refIds);
        
        // 限制同时高亮的数量
        if (newHighlights.size > maxSimultaneousHighlights) {
          const oldestKey = newHighlights.keys().next().value;
          newHighlights.delete(oldestKey);
        }
        
        return newHighlights;
      });
    };

    const handleClear = () => {
      setActiveHighlights(new Map());
    };

    window.addEventListener('highlightParagraphs', handleHighlight as EventListener);
    window.addEventListener('clearHighlights', handleClear);

    return () => {
      window.removeEventListener('highlightParagraphs', handleHighlight as EventListener);
      window.removeEventListener('clearHighlights', handleClear);
    };
  }, [maxSimultaneousHighlights]);

  // 计算全局高亮状态
  const getAllHighlightedRefs = () => {
    const allRefs = new Set<number>();
    activeHighlights.forEach(refs => {
      refs.forEach(ref => allRefs.add(ref));
    });
    return Array.from(allRefs);
  };

  return (
    <div className="relative">
      {children}
      
      {/* 全局高亮状态指示器 */}
      {activeHighlights.size > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>{getAllHighlightedRefs().length} 个引用已高亮</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartReferenceHighlighter;