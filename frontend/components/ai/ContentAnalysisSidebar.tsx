"use client";

import { FC, useState } from "react";
import {
  BookOpen,
  Lightbulb,
  BarChart3,
  MessageSquare,
  Sparkles,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import { EnhancedLLMAnalysisSidebar } from "@/components/ui/enhanced-llm-analysis-sidebar";
import { ConversationHistory } from "@/components/ai/ConversationHistory";
import { AnalysisCards, adaptAnalysisData } from "./AnalysisCards";
import { ContentItemPublic } from "@/app/content-library/types";

interface ContentAnalysisSidebarProps {
  content: ContentItemPublic;
  conversations?: ConversationListResponse["conversations"];
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
}

// 加载骨架屏
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="h-32">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// 空状态
const EmptyState = ({
  title,
  description,
}: { title: string; description: string }) => (
  <Card className="h-40 flex items-center justify-center">
    <CardContent>
      <div className="text-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <p className="text-xs">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export const ContentAnalysisSidebar: FC<ContentAnalysisSidebarProps> = ({
  content,
  conversations = [],
  analysisResult = null,
  isLoading = false,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<
    "analysis" | "ai-chat" | "conversations"
  >("analysis");

  // 渲染分析结果卡片
  const renderAnalysisCards = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    // 使用 analysisResult 判断有无数据
    if (!analysisResult) {
      return (
        <EmptyState
          title="暂无AI分析结果"
          description="AI正在分析内容，请稍后查看"
        />
      );
    }

    const adaptedData = adaptAnalysisData(analysisResult, content.ai_analysis as any);

    return (
      <AnalysisCards
        data={adaptedData}
        loading={false}
        layout="vertical"
        variant="sidebar"
      />
    );
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b h-header">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <h2 className="text-sm font-medium truncate">AI分析</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 py-3">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "analysis" | "ai-chat" | "conversations")
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="analysis"
              className="flex items-center gap-1 text-xs"
            >
              <BookOpen className="h-3 w-3" />
              <span>内容分析</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai-chat"
              className="flex items-center gap-1 text-xs"
            >
              <Sparkles className="h-3 w-3" />
              <span>实时AI</span>
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="flex items-center gap-1 text-xs"
            >
              <MessageSquare className="h-3 w-3" />
              <span>对话历史</span>
              {conversations && conversations.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs h-4 px-1">
                  {conversations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        <Tabs value={activeTab} className="h-full">
          {/* 内容分析标签页 */}
          <TabsContent value="analysis" className="h-full mt-0 p-4">
            {renderAnalysisCards()}
          </TabsContent>

          {/* 实时AI分析标签页 */}
          <TabsContent value="ai-chat" className="h-full mt-0">
            <div className="h-full overflow-hidden">
              <EnhancedLLMAnalysisSidebar
                contentId={content.id}
                contentText={content.summary || ""}
                className="border-0 h-full"
              />
            </div>
          </TabsContent>

          {/* 对话历史标签页 */}
          <TabsContent value="conversations" className="h-full mt-0 p-4">
            <div className="h-full custom-scrollbar">
              <ConversationHistory
                conversations={conversations}
                loading={false}
                onRefresh={() => {}}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
