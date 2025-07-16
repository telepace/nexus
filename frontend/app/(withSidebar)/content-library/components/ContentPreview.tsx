"use client";

import { Library } from "lucide-react";
import type { ContentItemPublic } from "@/lib/api/content";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 不再需要分析卡片导入，统一使用ModernAnalysisInterface
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";

interface Panel {
  id: number;
  item: ContentItemPublic;
}

let panelIdCounter = 0;

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  const [panels, setPanels] = useState<Panel[]>([]);

  useEffect(() => {
    if (item) {
      // 使用函数式更新来避免依赖 panels
      setPanels((prevPanels) => {
        // 只有当传入的 item 与栈顶的 item 内容不同时才添加新面板
        if (item.id !== prevPanels[prevPanels.length - 1]?.item.id) {
          panelIdCounter++;
          const newPanels = [
            ...prevPanels,
            { id: panelIdCounter, item: item },
          ].slice(-2);
          return newPanels;
        }
        return prevPanels;
      });
    }
  }, [item]); // 只依赖 item

  if (!panels.length && !item) {
    return (
      <div className="relative z-10 h-full shadow-macos-window  rounded-sm flex flex-col overflow-hidden">
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

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {panels.map((panel, index) => (
          <motion.div
            key={panel.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            style={{
              position: "absolute",
              inset: "0",
              zIndex: 10 + index,
            }}
          >
            <PanelContent item={panel.item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// 子组件渲染实际内容，避免重复
const PanelContent = ({ item }: { item: ContentItemPublic }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = item.ai_result;
  const isFetchingCompleteData = item._fetchingCompleteData === true;

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative z-10 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <Library className="h-5 w-5" />
          Preview
          {isFetchingCompleteData && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">更新中</span>
            </div>
          )}
        </div>
      </div>

      {/* 使用统一的ModernAnalysisInterface */}
      <div className="flex-1 overflow-hidden">
        <ModernAnalysisInterface
          content={item}
          analysisResult={aiResult}
          isLoading={isFetchingCompleteData}
          variant="preview"
          showPreprocessedContent={true}
          height="full"
          hideHeader={true}
        />
      </div>
    </div>
  );
};
