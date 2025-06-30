"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Heart, Calendar, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useRouter } from "next/navigation";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import {
  SummaryCard,
  KeyPointsCard,
  adaptAnalysisData,
} from "@/components/ai/AnalysisCards";

interface FavoriteItemData {
  id: string;
  content_item: {
    id: string;
    title?: string;
    type: string;
    source_uri?: string;
    summary?: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
    ai_result?: {
      content_quality_score?: number;
      labels?: string[];
      brief_description?: string;
      reading_time_minutes?: number;
      summary?: string;
      key_points?: string[];
    };
    ai_analysis?: any;
  };
  created_at: string;
}

interface Props {
  item: FavoriteItemData | null;
}

export const FavoritePreview = ({ item }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // 修复: 将hooks调用移到条件判断之前，使用默认值避免错误
  // 这确保了hooks始终按相同顺序调用，符合React的Hook规则
  const favoriteTime = useRelativeTime(item?.created_at || new Date().toISOString());
  const contentTime = useRelativeTime(item?.content_item?.created_at || new Date().toISOString());

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, [item]);

  if (!item) {
    return (
      <div className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-visible">
        <div className="flex items-center justify-between h-header px-4">
          <div className="flex items-center gap-2 text-base font-medium">
            <Heart className="h-5 w-5 text-amber-500" />
            收藏预览
          </div>
        </div>
        <div className="pb-4 px-6 flex-1 overflow-auto mt-12">
          <div className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground">
              悬浮或选择收藏内容查看预览
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { content_item } = item;
  const aiResult = content_item.ai_result;
  const aiAnalysis = content_item.ai_analysis;
  
  // 使用适配器函数统一数据格式
  const unifiedData = adaptAnalysisData(aiResult, aiAnalysis);

  // 处理查看原文
  const handleViewContent = () => {
    router.push(`/content-library/reader/${content_item.id}`);
  };

  // 处理打开源链接
  const handleOpenSource = () => {
    if (content_item.source_uri) {
      window.open(content_item.source_uri, "_blank");
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-visible"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-header px-4 border-b border-border/40">
        <div className="flex items-center gap-2 text-base font-medium">
          <Heart className="h-5 w-5 text-amber-500" />
          收藏预览
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewContent}
            className="h-8"
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            查看原文
          </Button>
          <FavoriteButton 
            itemId={content_item.id} 
            size="sm"
          />
        </div>
      </div>

      {/* Body */}
      <div className="pb-4 px-6 flex-1 overflow-auto">
        <div className="space-y-6 max-w-[28rem] mx-auto">
          {/* 标题和基本信息 */}
          <div className="mt-8">
            <h3 className="font-semibold text-xl mb-3 leading-tight">
              {content_item.title || "无标题"}
            </h3>
            
            {/* 质量评分 */}
            {aiResult?.content_quality_score != null && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">质量评分:</span>
                <div className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const stars = Math.round(aiResult.content_quality_score! * 5);
                    const fullStars = Math.floor(stars);
                    return (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < fullStars
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300"
                        }`}
                      />
                    );
                  })}
                  <span className="text-xs text-neutral-600 ml-1">
                    {(aiResult.content_quality_score * 5).toFixed(1)}/5.0
                  </span>
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-amber-500" />
                <span>收藏于 {favoriteTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>创建于 {contentTime}</span>
              </div>
              {aiResult?.reading_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>阅读时间 {aiResult.reading_time_minutes} 分钟</span>
                </div>
              )}
            </div>
          </div>

          {/* 来源链接 */}
          {content_item.source_uri && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">
                来源
              </label>
              <div 
                className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleOpenSource}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {content_item.source_uri}
                </span>
              </div>
            </div>
          )}

          {/* AI 摘要和关键要点 */}
          <div className="space-y-4">
            {/* 内容摘要 */}
            {unifiedData.summary && (
              <SummaryCard summary={unifiedData.summary} variant="preview" />
            )}

            {/* 关键要点 */}
            {unifiedData.keyPoints && (
              <KeyPointsCard
                keyPoints={unifiedData.keyPoints}
                variant="preview"
              />
            )}
          </div>

          {/* 标签 */}
          {aiResult?.labels && aiResult.labels.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground block">
                标签
              </label>
              <div className="flex flex-wrap gap-2">
                {aiResult.labels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-muted/20 hover:bg-muted/40 transition-colors cursor-default"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 处理状态 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground block">
              处理状态
            </label>
            <Badge 
              variant={content_item.processing_status === "completed" ? "default" : "secondary"}
              className="text-xs"
            >
              {content_item.processing_status === "completed" ? "已完成" : content_item.processing_status}
            </Badge>
          </div>

          {/* 底部操作区域 */}
          <div className="flex gap-2 pt-4 border-t border-border/40">
            <Button
              onClick={handleViewContent}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              阅读完整内容
            </Button>
            {content_item.source_uri && (
              <Button
                variant="outline"
                onClick={handleOpenSource}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                访问原始链接
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 