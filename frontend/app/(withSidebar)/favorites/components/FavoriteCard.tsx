"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Link,
  BookOpen,
  Star,
  Clock,
  MoreHorizontal,
  ExternalLink,
  Heart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ProcessingStatusBadge,
  ProcessingStatus,
} from "@/components/ui/ProcessingStatusBadge";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRelativeTime } from "@/hooks/useRelativeTime";

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
    };
  };
  created_at: string;
}

interface Props {
  item: FavoriteItemData;
  selected: boolean;
  hovered: boolean;
  onCardClick: (item: FavoriteItemData, event?: React.MouseEvent) => void;
  onCardHover: (item: FavoriteItemData | null) => void;
  onItemDeleted?: (itemId: string) => void;
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
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-2.5 w-2.5 ${
            i < fullStars
              ? "fill-amber-400 text-amber-400"
              : i === fullStars && hasHalfStar
                ? "fill-amber-200 text-amber-400"
                : "text-neutral-300"
          }`}
        />
      ))}
      <span className="text-xs text-neutral-500 ml-1">
        {ratingScore}
      </span>
    </div>
  );
};

export const FavoriteCard = ({
  item,
  selected,
  hovered,
  onCardClick,
  onCardHover,
  onItemDeleted,
}: Props) => {
  const router = useRouter();

  // 相对时间标签
  const relativeLabel = useRelativeTime(item.created_at);

  // 处理点击事件 - 跳转到内容阅读器
  const handleClick = (event: React.MouseEvent) => {
    onCardClick(item, event);
  };

  // 处理鼠标进入事件
  const handleMouseEnter = () => {
    onCardHover(item);
  };

  // 处理鼠标离开事件
  const handleMouseLeave = () => {
    onCardHover(null);
  };

  // 处理查看原文
  const handleViewContent = () => {
    router.push(`/content-library/reader/${item.content_item.id}`);
  };

  // 处理复制链接
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/content-library/reader/${item.content_item.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制到剪贴板");
    } catch (error) {
      console.error("复制链接失败:", error);
      toast.error("复制链接失败");
    }
  };

  const { content_item } = item;
  const aiResult = content_item.ai_result;
  const hasQualityScore = aiResult?.content_quality_score != null;
  const hasLabels = aiResult?.labels && aiResult.labels.length > 0;
  const hasReadingTime = aiResult?.reading_time_minutes != null;
  const briefDescription = aiResult?.brief_description || content_item.summary;

  return (
    <Card
      className={`group relative bg-white dark:bg-gray-950 border-black/6 dark:border-white/10 rounded-md transition-all duration-200 ease-out cursor-pointer hover:border-black/12 dark:hover:border-white/20 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-white/5 ${
        selected || hovered ? "ring-2 ring-primary/20" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 悬浮时的微妙渐变覆盖层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md pointer-events-none" />

      <CardContent className="p-4 pl-1 flex flex-col h-full relative">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* 内容类型图标 */}
          <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
            {getContentIcon(content_item.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* 标题和菜单区域 */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-medium text-base line-clamp-2 text-neutral-800 dark:text-neutral-100 max-w-cardTitle break-words">
                  {content_item.title || "无标题"}
                </h3>
                {/* 移除这里的评分显示 */}
              </div>

              {/* 操作菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 hover:bg-accent/50"
                    data-dropdown-trigger
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">更多操作</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48"
                  sideOffset={5}
                >
                  <DropdownMenuItem
                    onClick={handleViewContent}
                    className="focus:bg-accent/50"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    查看原文
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleCopyLink}
                    className="focus:bg-accent/50"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    复制链接
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <div className="px-2 py-1.5">
                    <FavoriteButton
                      itemId={content_item.id}
                      size="sm"
                      className="w-full justify-start h-8"
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 描述 */}
            {briefDescription && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                {briefDescription}
              </p>
            )}

            {/* 来源链接 */}
            {content_item.source_uri && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Link className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" title={content_item.source_uri}>
                  {content_item.source_uri}
                </span>
              </div>
            )}

            {/* 标签 */}
            {hasLabels && (
              <div className="flex flex-wrap gap-1">
                {aiResult.labels!.slice(0, 3).map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-black/4 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                  >
                    {label}
                  </span>
                ))}
                {aiResult.labels!.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-black/4 dark:bg-white/10 text-neutral-500">
                    +{aiResult.labels!.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* 底部信息行 */}
            <div className="flex items-center justify-between text-xs text-neutral-500 mt-auto pt-2">
              <div className="flex items-center gap-3">
                {/* 评分信息 */}
                {hasQualityScore && (
                  <div className="flex items-center gap-1">
                    <StarRating score={aiResult.content_quality_score!} />
                  </div>
                )}
                
                {/* 处理状态 */}
                <ProcessingStatusBadge
                  status={content_item.processing_status as any}
                  size="sm"
                />

                {/* 阅读时间 */}
                {hasReadingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{aiResult.reading_time_minutes} 分钟</span>
                  </div>
                )}
              </div>

              {/* 收藏时间 */}
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-amber-500" />
                <span>{relativeLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
