"use client";

import {
  FileText,
} from "lucide-react";
import type { ContentItemPublic } from "../types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  adaptAnalysisData,
  SummaryCard,
  KeyPointsCard,
} from "@/components/ai/AnalysisCards";





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
      <div className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-visible">
        <div className="flex items-center justify-between h-header px-4">
          <div className="flex items-center gap-2 text-base font-medium">
            <FileText className="h-5 w-5" />
            Preview
          </div>
        </div>
        <div className="pb-4 flex-1 overflow-auto mt-12">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
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
  const aiAnalysis = item.ai_analysis;

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, []);

  // 使用适配器函数统一数据格式
  const unifiedData = adaptAnalysisData(aiResult, aiAnalysis);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-visible"
    >
      {/* Header */}
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-5 w-5" />
          Preview
        </div>
      </div>

      {/* Body */}
      <div className="pb-4 flex-1 overflow-auto">
        <div className="space-y-6 max-w-[28rem] mx-auto">
          {/* 标题 */}
          <div className="mt-12">
            <h3 className="font-semibold text-lg">{item.title || "无标题"}</h3>
          </div>

          {/* AI 摘要和关键要点 - 使用统一组件 */}
          <div className="space-y-4">
            {/* 内容摘要 */}
            {unifiedData.summary && (
              <SummaryCard summary={unifiedData.summary} variant="preview" />
            )}

            {/* 关键要点 */}
            {unifiedData.keyPoints && (
              <KeyPointsCard
                keyPoints={unifiedData.keyPoints}
                variant="preview"
              />
            )}
          </div>

          {/* 标签 */}
          {aiResult?.labels && aiResult.labels.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-3">
                标签
              </label>
              <div className="flex flex-wrap gap-2">
                {aiResult.labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-base bg-muted text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};
