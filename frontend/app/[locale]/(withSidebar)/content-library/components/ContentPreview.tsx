"use client";

import React from "react";
import { Library } from "lucide-react";
import type { ContentItemPublic } from "@/lib/api/content";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// 移除复杂动画库，使用CSS过渡
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
      <div className="relative z-20 h-full shadow-macos-window rounded-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between h-header px-4 linear-bg-1">
          <div className="flex items-center gap-2 text-base font-medium">
            <Library className="h-5 w-5" />
            Preview
          </div>
        </div>
        <div className="pb-4 px-6 flex-1 overflow-auto mt-12">
          <div className="text-center py-12">
            <Library className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground">
              点击内容卡片查看预览
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

// 深度简化的内容面板组件 - 移除复杂包装层
const ContentPanel = React.memo(({ item }: { item: ContentItemPublic }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = (item as any).ai_result;

  // 简化的滚动处理，避免requestAnimationFrame竞态
  useEffect(() => {
    if (containerRef.current) {
      // 使用微任务延迟滚动，避免与渲染冲突
      Promise.resolve().then(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [item.id]); // 只依赖item.id

  // 稳定的props对象，避免不必要的重新渲染
  const analysisProps = useMemo(() => ({
    content: item,
    analysisResult: aiResult,
    variant: "preview" as const,
    showPreprocessedContent: true,
    height: "full" as const,
    hideHeader: true,
  }), [item.id, aiResult]); // 精确依赖

  return (
    <div
      ref={containerRef}
      className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden"
      style={{
        // 防止布局抖动的关键样式
        contain: 'layout style paint',
        willChange: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center h-header px-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-base font-medium">
          <Library className="h-5 w-5" />
          Preview
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
