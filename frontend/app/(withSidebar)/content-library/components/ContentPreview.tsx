"use client";

import React from "react";
import type { ContentItemPublic } from "@/lib/api/content";
import { ContentAnalysisView } from "@/components/ai/ContentAnalysisView";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  // 提取AI结果（如果存在）
  const aiResult = item ? (item as unknown as { ai_result?: unknown }).ai_result : null;

  return (
    <div className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden">
      <ContentAnalysisView
        item={item}
        analysisResult={aiResult}
        variant="preview"
        hideHeader={false}
        headerTitle="Preview"
        emptyStateText="点击内容卡片查看预览"
        className="rounded-sm"
      />
    </div>
  );
};
