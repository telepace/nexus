"use client";

import { FC } from "react";
import { ContentItemPublic } from "@/lib/api/content";
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import { ModernAnalysisInterface } from "./ModernAnalysisInterface";

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
    <div className={`flex flex-col h-full bg-background ${className}`} data-exclude-selection>
      {/* Header - 可选显示 */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 border-b h-header" data-exclude-selection>
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">AI分析</h2>
          </div>
        </div>
      )}

      {/* Modern Analysis Interface */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        <ModernAnalysisInterface
          content={content}
          conversations={conversations}
          analysisResult={analysisResult}
          isLoading={isLoading}
          className="h-full"
        />
      </div>
    </div>
  );
};
