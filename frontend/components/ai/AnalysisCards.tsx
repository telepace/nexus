"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Lightbulb, Clock, BarChart3, Tag } from "lucide-react";
import { AIResult } from "@/lib/api/content";

interface AnalysisCardsProps {
  analysisResult: AIResult | null;
  loading?: boolean;
}

const SummaryCard = ({ summary }: { summary: Record<string, unknown> | null }) => {
  if (!summary) return null;

  // 尝试从不同可能的字段中提取摘要文本
  const summaryText = 
    (summary.text as string) ||
    (summary.content as string) ||
    (summary.summary as string) ||
    Object.values(summary).find(val => typeof val === 'string' && val.length > 50) as string ||
    JSON.stringify(summary);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-blue-600" />
          内容摘要
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {summaryText}
        </div>
      </CardContent>
    </Card>
  );
};

const KeyPointsCard = ({ keyPoints }: { keyPoints: Record<string, unknown> | null }) => {
  if (!keyPoints) return null;

  // 尝试从不同可能的字段中提取关键点
  let points: string[] = [];
  
  if (Array.isArray(keyPoints.points)) {
    points = keyPoints.points.map(p => typeof p === 'string' ? p : JSON.stringify(p));
  } else if (Array.isArray(keyPoints.items)) {
    points = keyPoints.items.map(p => typeof p === 'string' ? p : JSON.stringify(p));
  } else if (Array.isArray(keyPoints.key_points)) {
    points = keyPoints.key_points.map(p => typeof p === 'string' ? p : JSON.stringify(p));
  } else {
    // 如果是对象，尝试提取所有字符串值
    points = Object.values(keyPoints)
      .filter(val => typeof val === 'string' && val.length > 10)
      .map(val => val as string);
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          关键要点
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {points.length > 0 ? (
            points.map((point, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">
                  {index + 1}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {point}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              {JSON.stringify(keyPoints)}
            </div>
          )}
        </div>
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-green-600" />
          内容分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Badge 
              variant={
                analysisResult.difficulty_level === 'beginner' ? 'secondary' :
                analysisResult.difficulty_level === 'intermediate' ? 'default' : 'destructive'
              }
            >
              {analysisResult.difficulty_level === 'beginner' ? '初级' :
               analysisResult.difficulty_level === 'intermediate' ? '中级' : '高级'}
            </Badge>
          </div>
        )}

        {analysisResult.content_quality_score && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              内容质量评分: 
            </span>
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

export const AnalysisCards = ({ analysisResult, loading }: AnalysisCardsProps) => {
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
    cards.push(
      <SummaryCard key="summary" summary={analysisResult.summary} />
    );
  }

  // Key Points 卡片
  if (analysisResult.key_points) {
    cards.push(
      <KeyPointsCard key="key-points" keyPoints={analysisResult.key_points} />
    );
  }

  // Metadata 卡片
  cards.push(
    <MetadataCard key="metadata" analysisResult={analysisResult} />
  );

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards}
    </div>
  );
}; 