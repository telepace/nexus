"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, Lightbulb, BarChart3, Star } from "lucide-react";
import { AIResult } from "@/lib/api/content";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

// 统一的分析数据接口
interface UnifiedAnalysisData {
  summary?: Record<string, unknown> | string | null;
  keyPoints?: Record<string, unknown> | string | null;
  metadata?: {
    readingTime?: number;
    difficulty?: string;
    qualityScore?: number;
    labels?: string[];
  };
}

// 组件属性接口
interface AnalysisCardsProps {
  data?: UnifiedAnalysisData;
  analysisResult?: AIResult | null; // 向后兼容
  loading?: boolean;
  layout?: 'grid' | 'vertical' | 'compact';
  variant?: 'default' | 'sidebar' | 'preview';
}

// 单个卡片属性接口
interface CardProps {
  variant?: 'default' | 'sidebar' | 'preview';
}

// 数据适配器函数 - 统一不同数据源
export function adaptAnalysisData(
  aiResult?: AIResult | null,
  aiAnalysis?: any // ContentItemPublic["ai_analysis"] 类型
): UnifiedAnalysisData {
  return {
    summary: aiAnalysis?.summarizer?.summary || 
             aiAnalysis?.summarizer?.raw_text || 
             aiResult?.summary,
    keyPoints: aiAnalysis?.key_points_extractor?.key_points || 
               aiAnalysis?.key_points_extractor?.raw_text || 
               aiResult?.key_points,
    metadata: {
      readingTime: aiResult?.reading_time_minutes,
      difficulty: aiResult?.difficulty_level,
      qualityScore: aiResult?.content_quality_score,
      labels: aiResult?.labels,
    }
  };
}

// 获取变体样式
function getVariantStyles(variant: 'default' | 'sidebar' | 'preview' = 'default') {
  const baseStyles = {
    card: "h-full border-0 rounded-md max-w-[35rem] bg-transparent shadow-none",
    header: "py-3 px-4",
    title: "inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition text-xs font-medium text-neutral-950 dark:text-neutral-100 w-fit bg-transparent",
    icon: "h-2 w-2 text-neutral-950 dark:text-neutral-100",
    content: "px-4",
    text: "text-sm leading-relaxed text-neutral-950 dark:text-neutral-50",
    markdownBase: "prose prose-sm max-w-none dark:prose-invert prose-p:text-neutral-950 dark:prose-p:text-neutral-50 prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0 prose-strong:text-neutral-950 dark:prose-strong:text-neutral-100 prose-em:text-neutral-950 dark:prose-em:text-neutral-100 prose-li:text-neutral-950 dark:prose-li:text-neutral-50 prose-li:leading-relaxed prose-li:mb-1 prose-headings:text-neutral-950 dark:prose-headings:text-neutral-100 prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
  };

  switch (variant) {
    case 'sidebar':
      return {
        ...baseStyles,
        card: "h-full analysis-card border-0 rounded-md max-w-[35rem] mx-auto bg-transparent shadow-none",
        header: "pb-3 pt-4 px-4",
        title: "inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition text-xs font-medium text-neutral-950 dark:text-neutral-100 w-fit bg-transparent",
        icon: "h-3 w-3 text-neutral-950 dark:text-neutral-100",
        content: "px-8 pb-4",
        text: "text-sm text-neutral-950 dark:text-neutral-50 leading-relaxed reading-content",
      };
    case 'preview':
      return {
        ...baseStyles,
        card: "h-full analysis-card border-0 rounded-md max-w-[35rem] mx-auto bg-transparent shadow-none hover:shadow-none",
        header: "pb-3 pt-4 !px-0",
        title: "inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition text-xs font-medium text-neutral-950 dark:text-neutral-100 w-fit bg-transparent",
        icon: "h-3 w-3 text-neutral-950 dark:text-neutral-100",
        content: "pb-3 !px-0",
        text: "text-sm text-neutral-950 dark:text-neutral-50 leading-relaxed reading-content",
      };
    default:
      return {
        ...baseStyles,
        title: "inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition text-xs font-medium text-neutral-950 dark:text-neutral-100 w-fit bg-transparent",
        icon: "h-2 w-2 text-neutral-950 dark:text-neutral-100",
        text: "text-sm text-neutral-950 dark:text-neutral-50 leading-relaxed",
      };
  }
}

// 内容摘要卡片
export const SummaryCard = ({
  summary,
  variant = 'default'
}: { 
  summary: Record<string, unknown> | string | null;
  variant?: CardProps['variant'];
}) => {
  if (!summary) return null;

  const styles = getVariantStyles(variant);
  
  let summaryText = "";
  
  if (typeof summary === "string") {
    summaryText = summary;
  } else if (summary && typeof summary === "object") {
    summaryText =
    (summary.text as string) ||
    (summary.content as string) ||
    (summary.summary as string) ||
    (Object.values(summary).find(
      (val) => typeof val === "string" && val.length > 50,
    ) as string) ||
    JSON.stringify(summary);
  }

  if (!summaryText) return null;

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>
          <BookOpen className={styles.icon} />
          内容摘要
        </CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <div className={styles.text}>
          <MarkdownRenderer
            content={summaryText}
            className={styles.markdownBase}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// 关键要点卡片
export const KeyPointsCard = ({
  keyPoints,
  variant = 'default'
}: { 
  keyPoints: Record<string, unknown> | string | null;
  variant?: CardProps['variant'];
}) => {
  if (!keyPoints) return null;

  const styles = getVariantStyles(variant);

  let points: string[] = [];
  let keyPointsContent = "";

  if (typeof keyPoints === "string") {
    keyPointsContent = keyPoints;
  } else if (keyPoints && typeof keyPoints === "object") {
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
    } else if (Array.isArray(keyPoints)) {
      points = (keyPoints as unknown[]).map((p) =>
        typeof p === "string" ? p : JSON.stringify(p),
      );
  } else {
    // 尝试获取原始文本内容（可能是markdown格式）
    keyPointsContent =
      (keyPoints.text as string) ||
      (keyPoints.content as string) ||
      (keyPoints.markdown as string) ||
        (keyPoints.raw_text as string) ||
        (Object.values(keyPoints || {}).find(
        (val) => typeof val === "string" && val.length > 50,
      ) as string) ||
      "";

    if (!keyPointsContent) {
        points = Object.values(keyPoints || {})
        .filter((val) => typeof val === "string" && val.length > 10)
        .map((val) => val as string);
    }
  }
  }

  if (!keyPointsContent && points.length === 0) return null;

  const maxPoints = variant === 'preview' ? 5 : points.length;
  const showMoreIndicator = variant === 'preview' && points.length > 5;

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>
          <Lightbulb className={styles.icon} />
          关键要点
        </CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        {/* 如果有markdown内容，直接渲染 */}
        {keyPointsContent ? (
          <div className={styles.text}>
            <MarkdownRenderer
              content={keyPointsContent}
              className={`${styles.markdownBase} prose-ul:mb-2 prose-ol:mb-2 prose-ul:mt-0 prose-ol:mt-0`}
            />
          </div>
        ) : (
          /* 如果是要点数组，使用自定义样式 */
          <div className={variant === 'sidebar' ? "space-y-3" : "space-y-2"}>
            {points.length > 0 ? (
              points.slice(0, maxPoints).map((point, index) => (
                <div key={index} className={`flex gap-${variant === 'sidebar' ? '3' : '2'} items-start`}>
                  <div className={`flex-shrink-0 ${
                    variant === 'sidebar' ? 'w-5 h-5' : 'w-4 h-4'
                  } rounded-full ${
                    variant === 'preview' 
                      ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' 
                      : 'bg-neutral-100 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                  } flex items-center justify-center text-xs font-medium mt-0.5`}>
                    {index + 1}
                  </div>
                  <div className={styles.text}>
                    <MarkdownRenderer
                      content={point}
                      className={`${styles.markdownBase.replace('prose-p:mb-2', 'prose-p:mb-1')}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.text}>
                <MarkdownRenderer
                  content={JSON.stringify(keyPoints)}
                  className={styles.markdownBase}
                />
              </div>
            )}
            {showMoreIndicator && (
              <div className="text-xs text-muted-foreground ml-6">
                +{points.length - 5} 个更多要点
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 元数据卡片
export const MetadataCard = ({ 
  metadata,
  variant = 'default'
}: { 
  metadata: UnifiedAnalysisData['metadata'];
  variant?: CardProps['variant'];
}) => {
  if (!metadata) return null;
  
  const { readingTime, difficulty, qualityScore, labels } = metadata;
  const hasMetadata = readingTime || difficulty || qualityScore || (labels && labels.length > 0);

  if (!hasMetadata) return null;

  const styles = getVariantStyles(variant);

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>
          <BarChart3 className={styles.icon} />
          内容分析
        </CardTitle>
      </CardHeader>
      <CardContent className={`${styles.content} space-y-${variant === 'sidebar' ? '3' : '4'}`}>
        {readingTime && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              预计阅读时间: {readingTime} 分钟
            </span>
          </div>
        )}

        {difficulty && (
          <div className="flex items-center gap-2">
            {variant === 'sidebar' && <span className="text-sm text-muted-foreground">难度等级:</span>}
            <Badge
              variant={
                difficulty === "beginner"
                  ? "secondary"
                  : difficulty === "intermediate"
                    ? "default"
                    : "destructive"
              }
            >
              {difficulty === "beginner"
                ? "初级"
                : difficulty === "intermediate"
                  ? "中级"
                  : "高级"}
            </Badge>
          </div>
        )}

        {qualityScore && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">内容质量评分:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const stars = Math.round(qualityScore * 5);
                    const fullStars = Math.floor(stars);
                    return (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < fullStars ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                        }`}
                      />
                    );
                  })}
                  <span className="text-xs text-neutral-600 ml-1">
                    {(qualityScore * 5).toFixed(1)}/5.0
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>内容质量评分</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {labels && labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">标签:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {labels.map((label, index) => (
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
const LoadingSkeleton = ({ layout = 'grid' }: { layout?: 'grid' | 'vertical' | 'compact' }) => {
  const containerClass = layout === 'grid' 
    ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    : "space-y-4";
    
  const cardHeight = layout === 'grid' ? "h-48" : "h-32";

  return (
    <div className={containerClass}>
    {[1, 2, 3].map((i) => (
        <Card key={i} className={cardHeight}>
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
};

// 主要的分析卡片组件
export const AnalysisCards = ({
  data,
  analysisResult, // 向后兼容
  loading,
  layout = 'grid',
  variant = 'default'
}: AnalysisCardsProps) => {
  // 如果传入了新的data，使用data；否则适配旧的analysisResult
  const unifiedData = data || (analysisResult ? adaptAnalysisData(analysisResult) : null);

  if (loading) {
    return <LoadingSkeleton layout={layout} />;
  }

  if (!unifiedData) {
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
  if (unifiedData.summary) {
    cards.push(
      <SummaryCard key="summary" summary={unifiedData.summary} variant={variant} />
    );
  }

  // Key Points 卡片
  if (unifiedData.keyPoints) {
    cards.push(
      <KeyPointsCard key="key-points" keyPoints={unifiedData.keyPoints} variant={variant} />
    );
  }

  // Metadata 卡片
  if (unifiedData.metadata) {
    cards.push(
      <MetadataCard key="metadata" metadata={unifiedData.metadata} variant={variant} />
    );
  }

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

  // 根据布局返回不同的容器
  const containerClass = layout === 'grid' 
    ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    : "space-y-4";

  return <div className={containerClass}>{cards}</div>;
};
