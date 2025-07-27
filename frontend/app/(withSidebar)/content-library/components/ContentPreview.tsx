"use client";

import React from "react";
import { Library } from "lucide-react";
import type { ContentItemPublic } from "@/lib/api/content";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 不再需要分析卡片导入，统一使用EnhancedModernAnalysisInterface
import { EnhancedModernAnalysisInterface } from "@/components/ai/EnhancedModernAnalysisInterface";
import { PreviewWrapper } from "@/components/ui/UnifiedVisibilityWrapper";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  // 面板管理系统
  const [panels, setPanels] = useState<Array<{id: number, item: ContentItemPublic, zIndex: number}>>([]);

  // 当item改变时，创建新面板 - 优化版本，减少不必要的面板创建
  useEffect(() => {
    if (!item) {
      setPanels([]);
      return;
    }

    setPanels(prev => {
      // 检查是否已经存在相同item的面板
      const existingPanel = prev.find(panel => panel.item.id === item.id);
      if (existingPanel) {
        // 如果已存在，将其移到最前面并更新zIndex
        const otherPanels = prev.filter(panel => panel.item.id !== item.id);
        const updatedPanel = { ...existingPanel, zIndex: Date.now() };
        return [...otherPanels, updatedPanel].slice(-2);
      }
      
      // 创建新面板
      const timestamp = Date.now();
      const newPanel = {
        id: timestamp,
        item: item,
        zIndex: timestamp
      };
      
      const newPanels = [...prev, newPanel];
      return newPanels.slice(-2); // 只保留最新的2个面板
    });
  }, [item?.id]);

  // 无内容时的空状态
  if (!item) {
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

  // 有内容时的预览 - 使用多面板系统
  return (
    <div className="relative w-full h-full z-20">
      <AnimatePresence>
        {panels.map((panel) => {
          // 判断是否为最新面板
          const isLatestPanel = panel.id === Math.max(...panels.map(p => p.id));
          
          return (
            <motion.div
              key={panel.id}                // 使用递增的唯一ID
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 25,
                duration: 0.2 
              }}
              style={{ 
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: panel.zIndex 
              }}
            >
              <ContentPanel item={panel.item} isActive={isLatestPanel} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// 大幅简化的内容面板组件 - 使用统一可见性包装器
const ContentPanel = React.memo(({ item, isActive = true }: { item: ContentItemPublic; isActive?: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = (item as any).ai_result;

  // 滚动到顶部的优化处理
  useEffect(() => {
    if (containerRef.current && isActive) {
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [isActive]);

  // 使用 useMemo 缓存 EnhancedModernAnalysisInterface 的 props
  const analysisProps = useMemo(() => ({
    content: item,
    analysisResult: aiResult,
    variant: "preview" as const,
    showPreprocessedContent: true,
    height: "full" as const,
    hideHeader: true,
  }), [item, aiResult]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <Library className="h-5 w-5" />
          Preview
        </div>
      </div>

      {/* 内容区域 - 使用统一可见性包装器大幅简化 */}
      <div className="flex-1 overflow-hidden relative">
        <PreviewWrapper
          contentId={item.id}
          visible={isActive}
          priority={Date.now()}
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
              </div>
            </div>
          }
        >
          <EnhancedModernAnalysisInterface {...analysisProps} />
        </PreviewWrapper>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 优化的比较函数 - 减少不必要的重渲染
  if (!prevProps.item && !nextProps.item) return true;
  if (!prevProps.item || !nextProps.item) return false;
  
  // 主要比较ID和激活状态，避免因为其他属性变化导致重渲染
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isActive === nextProps.isActive
  );
});
