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

  // 有内容时的预览 - 使用智能动画
  return (
    <div className="relative w-full h-full z-20">
      <AnimatePresence mode="wait">
        <div className="absolute inset-0">
          <motion.div
            key={item.id} // 使用item.id作为key确保每次切换都重新渲染
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 40,
              duration: 0.3 
            }}
          >
            <ContentPanel item={item} />
          </motion.div>
        </div>
      </AnimatePresence>
    </div>
  );
};

// 完全分离动画和渲染的面板组件
const ContentPanel = ({ item }: { item: ContentItemPublic }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = (item as any).ai_result;
  const isFetchingCompleteData = (item as any)._fetchingCompleteData === true;
  
  // 简化的渲染状态管理
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    
    // 重置状态
    setShowContent(false);
    
    // 等待动画完成后显示内容
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 450); // 等待450ms确保动画完成和渲染稳定
    
    return () => clearTimeout(timer);
  }, [item.id]);

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

      {/* 内容区域 - 简化的两状态：空白/显示 */}
      <div className="flex-1 overflow-hidden">
        {showContent ? (
          // 渲染完成，瞬间显示内容
          <ModernAnalysisInterface
            content={item}
            analysisResult={aiResult}
            isLoading={isFetchingCompleteData}
            variant="preview"
            showPreprocessedContent={true}
            height="full"
            hideHeader={true}
          />
        ) : (
          // 等待期间保持完全空白
          <div className="h-full" />
        )}
      </div>
    </div>
  );
};
