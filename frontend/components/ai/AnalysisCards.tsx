"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Lightbulb, BarChart3} from "lucide-react";
import { AIResult } from "@/lib/api/content";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface AnalysisCardsProps {
  analysisResult: AIResult | null;
  loading?: boolean;
}

// 内容摘要卡片
export const SummaryCard = ({
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
    <Card className="h-full">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BookOpen className="h-3 w-3 text-foreground" />
          内容摘要
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground leading-relaxed">
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
export const KeyPointsCard = ({
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
    <Card className="h-full">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Lightbulb className="h-3 w-3 text-foreground" />
          关键要点
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 如果有markdown内容，直接渲染 */}
        {keyPointsContent ? (
          <div className="text-sm text-muted-foreground leading-relaxed">
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
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {index + 1}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
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
              <div className="text-sm text-muted-foreground">
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

const MetadataCard = ({ analysisResult }: { analysisResult: AIResult }) => {
  const hasMetadata =
    analysisResult.reading_time_minutes ||
    analysisResult.difficulty_level ||
    analysisResult.content_quality_score ||
    (analysisResult.labels && analysisResult.labels.length > 0);

  if (!hasMetadata) return null;

  return (
    <Card className="h-full">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BarChart3 className="h-3 w-3 text-foreground" />
          内容分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysisResult.reading_time_minutes && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              预计阅读时间: {analysisResult.reading_time_minutes} 分钟
            </span>
          </div>
        )}

        {analysisResult.difficulty_level && (
          <div className="flex items-center gap-2">
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

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="h-48">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const AnalysisCards = ({
  analysisResult,
  loading,
}: AnalysisCardsProps) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!analysisResult) {
    return (
      <Card className="h-32 flex items-center justify-center">
        <CardContent>
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无AI分析结果</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cards = [];

  // Summary 卡片
  if (analysisResult.summary) {
    cards.push(<SummaryCard key="summary" summary={analysisResult.summary} />);
  }

  // Key Points 卡片
  if (analysisResult.key_points) {
    cards.push(
      <KeyPointsCard key="key-points" keyPoints={analysisResult.key_points} />,
    );
  }

  // Metadata 卡片
  cards.push(<MetadataCard key="metadata" analysisResult={analysisResult} />);

  if (cards.length === 0) {
    return (
      <Card className="h-32 flex items-center justify-center">
        <CardContent>
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">AI分析结果为空</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
  );
};
