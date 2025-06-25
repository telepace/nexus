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
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface ContentAnalysisSidebarProps {
  contentId: string;
  contentText?: string;
  analysisResult?: AIResult | null;
  conversations?: ConversationListResponse["conversations"];
  className?: string;
}

// 内容摘要卡片
const SummaryCard = ({
  summary,
}: { summary: Record<string, unknown> | null }) => {
  if (!summary) return null;

  const summaryText =
    (summary.text as string) ||
    (summary.content as string) ||
    (summary.summary as string) ||
    (Object.values(summary).find(
      (val) => typeof val === "string" && val.length > 50,
    ) as string) ||
    JSON.stringify(summary);

  return (
    <Card className="h-full analysis-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BookOpen className="h-4 w-4 text-foreground" />
          内容摘要
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground leading-relaxed reading-content">
          <MarkdownRenderer
            content={summaryText}
            className="prose prose-sm max-w-none dark:prose-invert
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0
              prose-strong:text-foreground prose-em:text-foreground
              prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:mb-1
              prose-headings:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />
        </div>
      </CardContent>
    </Card>
  );
};

// 关键要点卡片
const KeyPointsCard = ({
  keyPoints,
}: { keyPoints: Record<string, unknown> | null }) => {
  if (!keyPoints) return null;

  let points: string[] = [];
  let keyPointsContent = "";

  // 尝试提取要点数组
  if (Array.isArray(keyPoints.points)) {
    points = keyPoints.points.map((p) =>
      typeof p === "string" ? p : JSON.stringify(p),
    );
  } else if (Array.isArray(keyPoints.items)) {
    points = keyPoints.items.map((p) =>
      typeof p === "string" ? p : JSON.stringify(p),
    );
  } else if (Array.isArray(keyPoints.key_points)) {
    points = keyPoints.key_points.map((p) =>
      typeof p === "string" ? p : JSON.stringify(p),
    );
  } else {
    // 尝试获取原始文本内容（可能是markdown格式）
    keyPointsContent =
      (keyPoints.text as string) ||
      (keyPoints.content as string) ||
      (keyPoints.markdown as string) ||
      (Object.values(keyPoints).find(
        (val) => typeof val === "string" && val.length > 50,
      ) as string) ||
      "";

    if (!keyPointsContent) {
      points = Object.values(keyPoints)
        .filter((val) => typeof val === "string" && val.length > 10)
        .map((val) => val as string);
    }
  }

  return (
    <Card className="h-full analysis-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Lightbulb className="h-4 w-4 text-foreground" />
          关键要点
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* 如果有markdown内容，直接渲染 */}
        {keyPointsContent ? (
          <div className="text-sm text-muted-foreground leading-relaxed reading-content">
            <MarkdownRenderer
              content={keyPointsContent}
              className="prose prose-sm max-w-none dark:prose-invert
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0
                prose-strong:text-foreground prose-em:text-foreground
                prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:mb-1
                prose-ul:mb-2 prose-ol:mb-2 prose-ul:mt-0 prose-ol:mt-0
                prose-headings:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
                [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            />
          </div>
        ) : (
          /* 如果是要点数组，使用自定义样式 */
          <div className="space-y-3">
            {points.length > 0 ? (
              points.map((point, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed reading-content">
                    <MarkdownRenderer
                      content={point}
                      className="prose prose-sm max-w-none dark:prose-invert
                        prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-1 prose-p:mt-0
                        prose-strong:text-foreground prose-em:text-foreground
                        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground reading-content">
                <MarkdownRenderer
                  content={JSON.stringify(keyPoints)}
                  className="prose prose-sm max-w-none dark:prose-invert"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 内容分析卡片
const MetadataCard = ({ analysisResult }: { analysisResult: AIResult }) => {
  const hasMetadata =
    analysisResult.reading_time_minutes ||
    analysisResult.difficulty_level ||
    analysisResult.content_quality_score ||
    (analysisResult.labels && analysisResult.labels.length > 0);

  if (!hasMetadata) return null;

  return (
    <Card className="h-full analysis-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BarChart3 className="h-4 w-4 text-foreground" />
          内容分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {analysisResult.reading_time_minutes && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              预计阅读时间: {analysisResult.reading_time_minutes} 分钟
            </span>
          </div>
        )}

        {analysisResult.difficulty_level && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">难度等级:</span>
            <Badge
              variant={
                analysisResult.difficulty_level === "beginner"
                  ? "secondary"
                  : analysisResult.difficulty_level === "intermediate"
                    ? "default"
                    : "destructive"
              }
            >
              {analysisResult.difficulty_level === "beginner"
                ? "初级"
                : analysisResult.difficulty_level === "intermediate"
                  ? "中级"
                  : "高级"}
            </Badge>
          </div>
        )}

        {analysisResult.content_quality_score && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">内容质量评分:</span>
            <Badge variant="outline">
              {(analysisResult.content_quality_score * 100).toFixed(1)}%
            </Badge>
          </div>
        )}

        {analysisResult.labels && analysisResult.labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">标签:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysisResult.labels.map((label, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
  contentId,
  contentText,
  analysisResult,
  conversations = [],
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<
    "analysis" | "ai-chat" | "conversations"
  >("analysis");

  // 渲染分析结果卡片
  const renderAnalysisCards = () => {
    if (analysisResult === undefined) {
      return <LoadingSkeleton />;
    }

    if (!analysisResult) {
      return (
        <EmptyState
          title="暂无AI分析结果"
          description="AI正在分析内容，请稍后查看"
        />
      );
    }

    const cards = [];

    // 摘要卡片
    if (analysisResult.summary) {
      cards.push(
        <SummaryCard key="summary" summary={analysisResult.summary} />,
      );
    }

    // 关键要点卡片
    if (analysisResult.key_points) {
      cards.push(
        <KeyPointsCard
          key="key-points"
          keyPoints={analysisResult.key_points}
        />,
      );
    }

    // 元数据卡片
    cards.push(<MetadataCard key="metadata" analysisResult={analysisResult} />);

    if (cards.length === 0) {
      return (
        <EmptyState
          title="AI分析结果为空"
          description="内容分析完成，但没有可显示的结果"
        />
      );
    }

    return <div className="space-y-4">{cards}</div>;
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
              {conversations.length > 0 && (
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
                contentId={contentId}
                contentText={contentText}
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
