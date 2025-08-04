"use client";

import { FC } from "react";
import { ContentItemPublic } from "@/lib/api/content";
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import { ContentAnalysisView } from "./ContentAnalysisView";

interface ContentAnalysisSidebarProps {
  content: ContentItemPublic;
  conversations?: ConversationListResponse["conversations"];
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
  hideHeader?: boolean;
}

export const ContentAnalysisSidebar: FC<ContentAnalysisSidebarProps> = ({
  content,
  conversations = [],
  analysisResult = null,
  isLoading = false,
  className = "",
  hideHeader = false,
}) => {
  return (
    <ContentAnalysisView
      key={content?.id} // 🎯 关键修复：强制重新挂载，彻底隔离不同文章的状态
      item={content}
      conversations={conversations}
      analysisResult={analysisResult}
      isLoading={isLoading}
      className={className}
      variant="sidebar"
      scene="reader" // 🎯 明确指定为阅读器场景，确保与预览场景状态隔离
      hideHeader={hideHeader}
      headerTitle="AI分析"
    />
  );
};
