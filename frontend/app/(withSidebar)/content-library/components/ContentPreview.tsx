"use client";

import React from "react";
import type { ContentItemPublic } from "@/lib/api/content";
import { ContentAnalysisView } from "@/components/ai/ContentAnalysisView";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  // 提取AI结果（如果存在）
  const aiResult = item
    ? (item as unknown as { ai_result?: unknown }).ai_result
    : null;

  return (
    <div className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden">
      <ContentAnalysisView
        key={item?.id} // 🎯 关键修复：强制重新挂载，彻底隔离不同文章的状态
        item={item}
        analysisResult={aiResult}
        variant="preview"
        scene="preview" // 🎯 明确指定为预览场景，确保状态隔离
        hideHeader={false}
        headerTitle="Preview"
        emptyStateText="点击内容卡片查看预览"
        className="rounded-sm"
      />
    </div>
  );
};
