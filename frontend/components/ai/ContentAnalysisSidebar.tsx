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
      item={content}
      conversations={conversations}
      analysisResult={analysisResult}
      isLoading={isLoading}
      className={className}
      variant="sidebar"
      hideHeader={hideHeader}
      headerTitle="AI分析"
    />
  );
};
