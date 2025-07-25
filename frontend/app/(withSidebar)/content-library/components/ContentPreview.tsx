"use client";

import React from "react";
import { Library } from "lucide-react";
import type { ContentItemPublic } from "@/lib/api/content";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 不再需要分析卡片导入，统一使用EnhancedModernAnalysisInterface
import { EnhancedModernAnalysisInterface } from "@/components/ai/EnhancedModernAnalysisInterface";

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

// 完全分离动画和渲染的面板组件 - 使用 React.memo 优化性能
const ContentPanel = React.memo(({ item, isActive = true }: { item: ContentItemPublic; isActive?: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = (item as any).ai_result;
  
  // 简化的渲染状态管理
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    
    // 只有激活的面板才执行渲染逻辑
    if (isActive) {
      // 先重置状态
      setShowContent(false);
      
      // 延迟渲染，确保面板动画完成
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 200); // 稍微增加延迟，确保动画稳定
      
      return () => clearTimeout(timer);
    } else {
      // 非激活面板立即隐藏内容
      setShowContent(false);
    }
  }, [item.id, isActive]);

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

      {/* 内容区域 - 根据面板状态渲染 */}
      <div className="flex-1 overflow-hidden">
        {isActive && showContent ? (
          // 只有激活面板才渲染完整内容
          <EnhancedModernAnalysisInterface {...analysisProps} />
        ) : isActive ? (
          // 激活面板的等待状态
          <div className="h-full" />
        ) : (
          // 非激活面板保持空白
          <div className="h-full" />
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 更严格的比较函数，避免不必要的重渲染
  if (!prevProps.item && !nextProps.item) return true;
  if (!prevProps.item || !nextProps.item) return false;
  
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.item.updated_at === nextProps.item.updated_at
  );
});
