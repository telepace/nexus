"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import {
  ExternalLink,
  Heart,
  Calendar,
  Clock,
  Star,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useRouter } from "next/navigation";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";

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
    ai_analysis?: Record<string, unknown>;
  };
  created_at: string;
}

interface Props {
  item: FavoriteItemData | null;
}

export const FavoritePreview = React.memo(
  ({ item }: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    // 修复: 将hooks调用移到条件判断之前，使用默认值避免错误
    const favoriteTime = useRelativeTime(
      item?.created_at || new Date().toISOString(),
    );
    const contentTime = useRelativeTime(
      item?.content_item?.created_at || new Date().toISOString(),
    );

    // Move all hooks before any conditional return
    // 使用 useCallback 优化事件处理函数
    const handleViewContent = useCallback(() => {
      if (item?.content_item?.id) {
        router.push(`/content-library/reader/${item.content_item.id}`);
      }
    }, [router, item?.content_item?.id]);

    // 处理打开源链接
    const handleOpenSource = useCallback(() => {
      if (item?.content_item?.source_uri) {
        window.open(item.content_item.source_uri, "_blank");
      }
    }, [item?.content_item?.source_uri]);

    // 使用 useMemo 缓存摘要内容计算结果
    const summaryContent = useMemo((): string | null => {
      if (!item?.content_item) return null;
      const aiResult = item.content_item.ai_result;
      // 处理 ai_result.summary (可能是对象)
      if (aiResult?.summary) {
        if (typeof aiResult.summary === "string") {
          return aiResult.summary;
        } else if (
          typeof aiResult.summary === "object" &&
          aiResult.summary !== null
        ) {
          // 尝试从对象中提取字符串内容
          const summaryObj = aiResult.summary as Record<string, unknown>;
          return (
            (summaryObj.text as string) ||
            (summaryObj.content as string) ||
            (summaryObj.summary as string) ||
            (summaryObj.main_thesis as string) ||
            // 如果没有找到合适的字符串字段，使用第一个长字符串值
            (Object.values(summaryObj).find(
              (val) => typeof val === "string" && val.length > 20,
            ) as string) ||
            null
          );
        }
      }

      // 后备方案：使用 content_item.summary 或 brief_description
      return item.content_item.summary || aiResult?.brief_description || null;
    }, [item?.content_item]);

    // 使用 useMemo 缓存关键要点计算结果
    const keyPoints = useMemo((): string[] => {
      if (!item?.content_item) return [];
      const aiResult = item.content_item.ai_result;
      // 处理 ai_result.key_points (可能是对象或数组)
      if (aiResult?.key_points) {
        // 如果是字符串数组，直接返回
        if (Array.isArray(aiResult.key_points)) {
          return aiResult.key_points.filter(
            (point) => typeof point === "string",
          );
        }

        // 如果是对象，尝试提取数组或字符串内容
        if (
          typeof aiResult.key_points === "object" &&
          aiResult.key_points !== null
        ) {
          const keyPointsObj = aiResult.key_points as Record<string, unknown>;

          // 尝试找到数组形式的关键要点
          const pointsArray =
            keyPointsObj.points ||
            keyPointsObj.key_points ||
            keyPointsObj.items ||
            keyPointsObj.list;

          if (Array.isArray(pointsArray)) {
            return pointsArray
              .map((point) => {
                if (typeof point === "string") return point;
                if (typeof point === "object" && point !== null) {
                  const pointObj = point as Record<string, unknown>;
                  return pointObj.point || pointObj.text || pointObj.content;
                }
                return null;
              })
              .filter((point): point is string => typeof point === "string");
          }

          // 如果没有找到数组，尝试从对象值中提取字符串数组
          const allValues = Object.values(keyPointsObj);
          for (const value of allValues) {
            if (
              Array.isArray(value) &&
              value.length > 0 &&
              typeof value[0] === "string"
            ) {
              return value.filter((item) => typeof item === "string");
            }
          }
        }
      }

      return [];
    }, [item?.content_item]);

    useEffect(() => {
      // 🎯 优化：使用更平滑的滚动行为，避免突兀的跳转
      if (containerRef.current) {
        containerRef.current.scrollTo({ 
          top: 0, 
          behavior: "smooth" 
        });
      }
    }, [item]);

    if (!item) {
      return (
        <div className="h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between h-header px-4 border-b border-border/30">
            <div className="flex items-center gap-2 text-base font-medium">
              <Heart className="h-5 w-5 text-amber-500" />
              收藏预览
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 px-6">
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

    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        className="h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden"
      >
        {/* Header - 现代化设计 */}
        <div className="flex items-center justify-between h-header px-6 border-b border-border/30 content-glass">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-base font-medium text-neutral-900">
                收藏预览
              </span>
              <span className="text-xs text-muted-foreground">
                收藏于 {favoriteTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewContent}
              className="h-8 px-3 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-200"
            >
              <BookOpen className="h-3 w-3 mr-1.5" />
              阅读
            </Button>
            {content_item.source_uri && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenSource}
                className="h-8 w-8 p-0 hover:bg-neutral-100 transition-all duration-200"
                title="访问原始链接"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            <FavoriteButton itemId={content_item.id} size="sm" />
          </div>
        </div>

        {/* Body - 优雅的内容布局 */}
        <div className="flex-1 overflow-auto scrollbar-hide">
          <div className="p-6 space-y-6 max-w-2xl mx-auto">
            {/* 标题区域 - 更突出 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900 leading-tight line-clamp-3">
                {content_item.title || "无标题"}
              </h2>

              {/* 元信息 - 紧凑布局 */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>创建于 {contentTime}</span>
                </div>
                {aiResult?.reading_time_minutes && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{aiResult.reading_time_minutes} 分钟阅读</span>
                  </div>
                )}
                {aiResult?.content_quality_score && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const stars = Math.round(
                          aiResult.content_quality_score! * 5,
                        );
                        const fullStars = Math.floor(stars);
                        return (
                          <Star
                            key={i}
                            className={`h-3 w-3 transition-colors ${
                              i < fullStars
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-300"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs font-medium">
                      {(aiResult.content_quality_score * 5).toFixed(1)}/5
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 来源链接 - 优雅的卡片设计 */}
            {content_item.source_uri && (
              <div
                className="group p-4 content-section rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={handleOpenSource}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg border border-neutral-200 flex items-center justify-center group-hover:border-neutral-300 transition-colors shadow-sm">
                    <ExternalLink className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 mb-1">
                      原始来源
                    </p>
                    <p className="text-xs text-neutral-600 truncate">
                      {content_item.source_uri}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI 摘要 - 现代卡片设计 */}
            {summaryContent && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-sm">📝</span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    内容摘要
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/40 border border-blue-200/60 rounded-xl p-4 shadow-sm">
                  <div className="prose prose-sm max-w-none text-neutral-700">
                    <UniversalContentRenderer content={summaryContent!} />
                  </div>
                </div>
              </div>
            )}

            {/* 关键要点 - 现代列表设计 */}
            {keyPoints.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-sm">🎯</span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    关键要点
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-green-50/80 to-green-100/40 border border-green-200/60 rounded-xl p-4 space-y-3 shadow-sm">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-3 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0 group-hover:bg-green-600 transition-colors" />
                      <p className="text-sm text-neutral-700 leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 标签 - 优雅的标签设计 */}
            {aiResult?.labels && aiResult.labels.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-sm">🏷️</span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    相关标签
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiResult.labels.map((label, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-white/80 border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-all duration-200 tag-glow shadow-sm"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 处理状态 */}
            <div className="pt-4 border-t border-neutral-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>处理状态:</span>
                  <Badge
                    variant={
                      content_item.processing_status === "completed"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs shadow-sm"
                  >
                    {content_item.processing_status === "completed"
                      ? "已完成"
                      : content_item.processing_status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 底部操作区域 - 现代按钮设计 */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleViewContent}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                阅读完整内容
              </Button>
              {content_item.source_uri && (
                <Button
                  variant="outline"
                  onClick={handleOpenSource}
                  className="flex-1 border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  查看原文
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数，只有在关键属性改变时才重新渲染
    return prevProps.item?.id === nextProps.item?.id;
  },
);

FavoritePreview.displayName = "FavoritePreview";
