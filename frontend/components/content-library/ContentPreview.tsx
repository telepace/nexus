"use client";

import React from "react";
import { Library } from "lucide-react";
import type { ContentItemPublic } from "./types";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { EnhancedModernAnalysisInterface } from "@/components/ai/EnhancedModernAnalysisInterface";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  // 简化状态管理：只保留当前项和过渡状态
  const [currentItem, setCurrentItem] = useState<ContentItemPublic | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 优化的内容切换逻辑，避免不必要的状态更新
  useEffect(() => {
    // 如果新项目与当前项目相同，直接返回
    if (item?.id === currentItem?.id) {
      return;
    }

    // 启动过渡状态
    setIsTransitioning(true);
    
    // 使用微任务确保状态更新的原子性
    Promise.resolve().then(() => {
      setCurrentItem(item);
      // 延迟重置过渡状态，确保CSS动画完成
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    });
  }, [item?.id, currentItem?.id]);

  // 空状态渲染（当前项为null时）
  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-background via-background to-muted/20 p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Library className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-muted-foreground">
              选择内容进行预览
            </h3>
            <p className="text-sm text-muted-foreground/70 leading-relaxed">
              在左侧列表中选择或悬停内容项目来查看详细信息
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 内容渲染 - 简化为单一容器，使用CSS过渡
  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full h-full z-20 transition-opacity duration-200 ease-out
        ${isTransitioning ? 'opacity-70' : 'opacity-100'}
      `}
      style={{
        // 使用CSS containment优化渲染性能
        contain: 'layout style paint',
      }}
    >
      <ContentPanel item={currentItem} />
    </div>
  );
};

// 深度简化的内容面板组件 - 移除复杂包装层，添加AI状态监听
const ContentPanel = React.memo(({ item }: { item: ContentItemPublic }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [hasAnyConversations, setHasAnyConversations] = useState(false);

  // 简化的滚动处理，避免requestAnimationFrame竞态
  useEffect(() => {
    if (containerRef.current) {
      // 使用微任务延迟滚动，避免与渲染冲突
      Promise.resolve().then(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [item?.id]); // 安全的依赖检查

  // 监听AI处理状态变化
  useEffect(() => {
    const handleAIStatusUpdate = (event: CustomEvent) => {
      const { status, hasConversations } = event.detail;
      setAiStatus(status);
      if (hasConversations !== undefined) {
        setHasAnyConversations(hasConversations);
      }
    };

    window.addEventListener('aiStatusUpdate' as keyof WindowEventMap, handleAIStatusUpdate);
    
    return () => {
      window.removeEventListener('aiStatusUpdate' as keyof WindowEventMap, handleAIStatusUpdate);
    };
  }, []);

  // 根据AI状态决定标题文本
  const getHeaderTitle = () => {
    if (aiStatus === 'processing') {
      return 'AI分析中';
    }
    if (aiStatus === 'completed' || hasAnyConversations) {
      return '分析结果';
    }
    return '内容预览';
  };

  // 稳定的props对象，避免不必要的重新渲染
  const analysisProps = useMemo(() => ({
    content: item,
    variant: "preview" as const,
    showTitle: true,
    onStatusChange: (status: string, hasConversations: boolean) => {
      // 发送状态更新事件
      window.dispatchEvent(new CustomEvent('aiStatusUpdate', {
        detail: { status, hasConversations }
      }));
    },
  }), [item?.id]); // 安全的精确依赖

  return (
    <div
      className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden"
      ref={containerRef}
      style={{
        // 防止布局抖动的关键样式
        contain: 'layout style paint',
        willChange: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center h-header px-4 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground truncate">
            {getHeaderTitle()}
          </span>
          {aiStatus === 'processing' && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0 ml-1" />
          )}
        </div>
      </div>

      {/* 内容区域 - 直接渲染，移除中间包装层 */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <EnhancedModernAnalysisInterface {...analysisProps} />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 极简的比较函数 - 只比较核心标识
  return prevProps.item.id === nextProps.item.id;
});