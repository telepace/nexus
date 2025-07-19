"use client";

import { Library } from "lucide-react";
import type { ContentItemPublic } from "@/lib/api/content";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 不再需要分析卡片导入，统一使用ModernAnalysisInterface
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  // 面板管理系统
  const [panels, setPanels] = useState<Array<{id: number, item: ContentItemPublic, zIndex: number}>>([]);

  // 当item改变时，创建新面板
  useEffect(() => {
    if (item) {
      const timestamp = Date.now();
      const newPanel = {
        id: timestamp,                 // 使用时间戳作为唯一ID
        item: item,                    // 实际的内容
        zIndex: timestamp              // 层级：新面板总是在上层
      };
      
      setPanels(prev => {
        const newPanels = [...prev, newPanel];
        return newPanels.slice(-2);   // 只保留最新的2个面板
      });
    }
  }, [item?.id]);  // 只依赖item的id变化

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
                stiffness: 400, 
                damping: 40,
                duration: 0.3 
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

// 完全分离动画和渲染的面板组件
const ContentPanel = ({ item, isActive = true }: { item: ContentItemPublic; isActive?: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = (item as any).ai_result;
  const isFetchingCompleteData = (item as any)._fetchingCompleteData === true;
  
  // 简化的渲染状态管理
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    
    // 重置状态
    setShowContent(false);
    
    // 只有激活的面板才执行延迟渲染
    if (isActive) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 450); // 等待450ms确保动画完成和渲染稳定
      
      return () => clearTimeout(timer);
    }
  }, [item.id, isActive]);

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
          {isFetchingCompleteData && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
              <span className="text-xs text-muted-foreground">更新中</span>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 - 根据面板状态渲染 */}
      <div className="flex-1 overflow-hidden">
        {isActive && showContent ? (
          // 只有激活面板才渲染完整内容
          <ModernAnalysisInterface
            content={item}
            analysisResult={aiResult}
            isLoading={isFetchingCompleteData}
            variant="preview"
            showPreprocessedContent={true}
            height="full"
            hideHeader={true}
          />
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
};
