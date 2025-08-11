"use client";

import React, { useMemo } from "react";
import { Library, Loader2 } from "lucide-react";
import { StaticAnalysisCard } from "./StaticAnalysisCard";
import { StaticAIPanel } from "./StaticAIPanel";
import { adaptAnalysisData } from "./AnalysisCards";
import type { ContentItemPublic, AIResult, ConversationListResponse } from "@/lib/api/content";

interface StaticPreviewInterfaceProps {
  content: ContentItemPublic;
  conversations?: ConversationListResponse["conversations"];
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
  hideHeader?: boolean;
  headerTitle?: string;
  emptyStateText?: string;
  onNavigateToFullMode?: () => void;
}

interface StaticAnalysisCardType {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "conversation";
    data: any;
  };
}

export const StaticPreviewInterface: React.FC<StaticPreviewInterfaceProps> = ({
  content,
  conversations = [],
  analysisResult = null,
  isLoading = false,
  className = "",
  hideHeader = false,
  headerTitle,
  emptyStateText = "点击内容卡片查看预览",
  onNavigateToFullMode,
}) => {
  const staticCards = useMemo((): StaticAnalysisCardType[] => {
    if (isLoading || !content) return [];
    
    const cards: StaticAnalysisCardType[] = [];
    
    const metaInfo = content.meta_info ? JSON.parse(content.meta_info) : null;
    const adaptedData = adaptAnalysisData(analysisResult, metaInfo);
    
    if (adaptedData.summary) {
      cards.push({
        id: `summary-${content.id}`,
        title: "内容摘要",
        subtitle: "AI提取的核心要点",
        emoji: "📄",
        content: {
          type: "summary",
          data: adaptedData.summary,
        },
      });
    }
    
    if (adaptedData.keyPoints) {
      cards.push({
        id: `keyPoints-${content.id}`,
        title: "提问清单", 
        subtitle: "深度思考问题",
        emoji: "🤔",
        content: {
          type: "keyPoints",
          data: adaptedData.keyPoints,
        },
      });
    }
    
    if (conversations && conversations.length > 0) {
      const recentConversations = conversations
        .filter(conv => conv.messages && conv.messages.length > 0)
        .slice(0, 2);
        
      recentConversations.forEach((conversation) => {
        const getConversationTitle = () => {
          if (conversation.title && !conversation.title.startsWith("AI分析:")) {
            return conversation.title.length > 30 
              ? `${conversation.title.substring(0, 30)}...` 
              : conversation.title;
          }
          
          if (conversation.messages && conversation.messages.length > 0) {
            const firstUserMessage = conversation.messages.find(
              (msg: any) => msg.role === "user" && msg.content
            );
            if (firstUserMessage) {
              const metadata = firstUserMessage.metadata || {};
              if (metadata.isPromptBased && metadata.promptName) {
                return metadata.promptName;
              }
              if (metadata.originalUserInput) {
                const input = String(metadata.originalUserInput);
                return input.startsWith("使用模板：") 
                  ? input.replace("使用模板：", "")
                  : input.length > 30 ? `${input.substring(0, 30)}...` : input;
              }
              const content = String(firstUserMessage.content);
              return content.length > 30 ? `${content.substring(0, 30)}...` : content;
            }
          }
          
          return "AI分析";
        };
        
        cards.push({
          id: `conversation-${conversation.id}`,
          title: getConversationTitle(),
          subtitle: "AI分析结果",
          emoji: "🤖",
          content: {
            type: "conversation",
            data: conversation,
          },
        });
      });
    }
    
    return cards;
  }, [content, analysisResult, conversations, isLoading]);
  
  const containerClasses = useMemo(() => {
    return `flex flex-col h-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 ${className}`;
  }, [className]);
  
  if (!content) {
    return (
      <div className={containerClasses}>
        {!hideHeader && (
          <div className="flex items-center h-header px-4 flex-shrink-0 border-b">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {headerTitle || "内容预览"}
              </span>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto">
              <Library className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-muted-foreground">
                {emptyStateText}
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                在左侧列表中选择或悬停内容项目来查看详细信息
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className={containerClasses}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-500">正在加载分析结果...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={containerClasses} data-exclude-selection>
      {!hideHeader && (
        <div className="flex items-center h-header px-4 flex-shrink-0 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground truncate">
              {headerTitle || content.title || "内容预览"}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-6 pb-6">
          <div className="space-y-6 max-w-2xl mx-auto">
            {staticCards.length > 0 ? (
              staticCards.map((card) => (
                <StaticAnalysisCard
                  key={card.id}
                  card={card}
                  contentId={content.id}
                  onExpandLine={() => {
                    onNavigateToFullMode?.();
                  }}
                />
              ))
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Library className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果
                  </p>
                  <button
                    onClick={onNavigateToFullMode}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    点击开始AI分析
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <StaticAIPanel 
        onNavigateToFullMode={onNavigateToFullMode}
      />
    </div>
  );
};