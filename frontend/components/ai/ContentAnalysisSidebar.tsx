"use client";

import { FC, useState, useCallback } from "react";
import { ContentItemPublic } from "@/lib/api/content";
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import { ModernAnalysisInterface } from "./ModernAnalysisInterface";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

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
  const [historyCount, setHistoryCount] = useState(0);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const handleHistoryCountChange = useCallback((count: number) => {
    setHistoryCount(count);
  }, []);

  const toggleHistoryPanel = () => {
    setShowHistoryPanel((prev) => !prev);
  };

  return (
    <div
      className={`flex flex-col h-full linear-bg-1 ${className}`}
      data-exclude-selection
    >
      {/* Header - 可选显示 */}
      {!hideHeader && (
        <div
          className="flex items-center justify-between pl-4 pr-6 border-b h-header linear-bg-1"
          data-exclude-selection
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">AI分析</h2>
          </div>
          <div className="flex items-center gap-2">
            {historyCount > 0 && (
              <div className="relative">
                <Button
                  aria-label="history"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-neutral-700 hover:bg-neutral-200/50"
                  onClick={toggleHistoryPanel}
                >
                  <MessageSquare className="h-7 w-7" />
                  <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                    {historyCount}
                  </div>
                </Button>
              </div>
            )}
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
          onHistoryCountChange={handleHistoryCountChange}
          showHistory={showHistoryPanel}
          hideHeader={true}
        />
      </div>
    </div>
  );
};
