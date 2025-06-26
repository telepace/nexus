"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Link, BookOpen, Star, Clock } from "lucide-react";
import {
  ProcessingStatusBadge,
  ProcessingStatus,
} from "@/components/ui/ProcessingStatusBadge";
import { createRipple } from "../utils/ripple";
import type { ContentItemPublic } from "../types";

interface Props {
  item: ContentItemPublic;
  selected: boolean;
  hovered: boolean;
  onCardClick: (item: ContentItemPublic) => void;
  onCardHover: (item: ContentItemPublic | null) => void;
  prefetchContent: (item: ContentItemPublic) => void;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "url":
      return <Link className="h-4 w-4" />;
    case "text":
      return <BookOpen className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// 星级评分组件
const StarRating = ({ score }: { score: number }) => {
  const stars = Math.round(score * 5); // 转换为 5 星制
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  const ratingScore = (score * 5).toFixed(1); // 转换为5分制

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < fullStars
                  ? "fill-amber-400 text-amber-400"
                  : i === fullStars && hasHalfStar
                    ? "fill-amber-200 text-amber-400"
                    : "text-neutral-300"
              }`}
            />
          ))}
          <span className="text-xs text-neutral-500 ml-1">
            {ratingScore}/5.0
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>内容质量评分</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const ContentCard = ({
  item,
  selected,
  hovered,
  onCardClick,
  onCardHover,
  prefetchContent,
}: Props) => {
  // 处理点击事件 - 直接跳转到阅读器
  const handleClick = () => {
    onCardClick(item);
  };

  // 处理鼠标进入事件
  const handleMouseEnter = () => {
    onCardHover(item);
    prefetchContent(item);
  };

  // 处理鼠标离开事件
  const handleMouseLeave = () => {
    onCardHover(null);
  };

  const aiResult = item.ai_result;
  const hasQualityScore = aiResult?.content_quality_score != null;
  const hasLabels = aiResult?.labels && aiResult.labels.length > 0;
  const hasReadingTime = aiResult?.reading_time_minutes != null;
  const briefDescription = aiResult?.brief_description;

  return (
    <Card
      key={item.id}
      tabIndex={0}
      className={`cursor-pointer rounded-lg overflow-hidden transition-colors duration-200 ease-out w-libraryCard ${
        selected
          ? "bg-[var(--color-linear-bg-2)] border-[var(--mac-gray-5)] shadow-md"
          : hovered
            ? "bg-muted/50 border-muted-foreground/20 shadow-sm"
            : "bg-transparent border border-transparent shadow-none hover:shadow-none hover:bg-transparent hover:border-transparent"
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={createRipple}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <CardContent className="p-4 pl-1 flex flex-col h-full">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
            {getContentIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {/* 标题和评分 */}
            <div className="space-y-1">
              <h3 className="font-medium text-base line-clamp-2 text-neutral-800 dark:text-neutral-100 max-w-cardTitle break-words">
                {item.title || "无标题"}
              </h3>
              {hasQualityScore && (
                <StarRating score={aiResult.content_quality_score!} />
              )}
            </div>

            {/* 简短描述（优先显示）或摘要 */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed max-w-cardTitle break-words">
              {briefDescription || item.summary || "暂无描述"}
            </p>

            {/* 标签 */}
            {hasLabels && (
              <div className="flex flex-wrap gap-1 max-w-cardTitle">
                {aiResult.labels!.slice(0, 3).map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  >
                    {label}
                  </span>
                ))}
                {aiResult.labels!.length > 3 && (
                  <span className="text-xs text-neutral-400">
                    +{aiResult.labels!.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* 底部信息栏 */}
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-3">
                {/* 阅读时间 */}
                {hasReadingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{aiResult.reading_time_minutes} 分钟</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ProcessingStatusBadge
                  status={item.processing_status as ProcessingStatus}
                  size="sm"
                  className="text-neutral-400"
                />
                <span>
                  {new Date(item.created_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
