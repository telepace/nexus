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
  Trash2,
  RotateCcw,
  Brain,
  ExternalLink,
  Copy,
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
import { createRipple } from "../utils/ripple";
import type { ContentItemPublic } from "../types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { contentApi } from "@/lib/api/content";
import { toast } from "sonner";
import {
  DeleteConfirmDialog,
  shouldSkipDeleteConfirm,
} from "./DeleteConfirmDialog";
import { useRelativeTime } from "@/hooks/useRelativeTime";

interface Props {
  item: ContentItemPublic;
  selected: boolean;
  hovered: boolean;
  onCardClick: (item: ContentItemPublic, event?: React.MouseEvent) => void;
  onCardHover: (item: ContentItemPublic | null) => void;
  prefetchContent: (item: ContentItemPublic) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemUpdated?: (item: ContentItemPublic) => void;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4 text-neutral-500" />;
    case "url":
      return <Link className="h-4 w-4 text-neutral-500" />;
    case "text":
      return <BookOpen className="h-4 w-4 text-neutral-500" />;
    default:
      return <FileText className="h-4 w-4 text-neutral-500" />;
  }
};

// 星级评分组件 - 更简洁的设计
const StarRating = ({ score }: { score: number }) => {
  const stars = Math.round(score * 5);
  const fullStars = Math.floor(stars);
  const ratingScore = (score * 5).toFixed(1);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < fullStars
                  ? "fill-amber-400 text-amber-400"
                  : "text-neutral-200"
              }`}
            />
          ))}
          <span className="text-xs text-neutral-400 ml-1 font-medium">
            {ratingScore}
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
  onItemDeleted,
  onItemUpdated,
}: Props) => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 相对时间标签
  const relativeLabel = useRelativeTime(item.created_at);

  // 处理点击事件 - 立即跳转到阅读器
  const handleClick = (event: React.MouseEvent) => {
    onCardClick(item, event);
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

  // 处理查看详情
  const handleViewDetails = () => {
    router.push(`/content-library/reader/${item.id}`);
  };

  // 处理重新处理
  const handleReprocess = async () => {
    setIsProcessing(true);
    try {
      const updatedItem = await contentApi.reprocessContentItem(item.id);
      onItemUpdated?.(updatedItem);
      toast.success("重新处理请求已提交");
    } catch (error) {
      console.error("重新处理失败:", error);
      toast.error("重新处理失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理AI分析
  const handleAIAnalysis = async () => {
    try {
      await contentApi.analyzeContent(
        item.id,
        "请分析这个内容的主要观点和见解",
      );
      toast.success("AI 分析已开始，请稍后查看结果");
    } catch (error) {
      console.error("AI 分析失败:", error);
      toast.error("AI 分析失败，请稍后重试");
    }
  };

  // 处理复制链接
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/content-library/reader/${item.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制到剪贴板");
    } catch (error) {
      console.error("复制链接失败:", error);
      toast.error("复制链接失败");
    }
  };

  // 处理删除
  const handleDelete = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (shouldSkipDeleteConfirm()) {
      await performDelete();
    } else {
      setShowDeleteDialog(true);
    }
  };

  // 执行删除操作
  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await contentApi.deleteContentItem(item.id);
      onItemDeleted?.(item.id);
      toast.success("内容已删除");
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const aiResult = item.ai_result;
  const hasQualityScore = aiResult?.content_quality_score != null;
  const hasLabels = aiResult?.labels && aiResult.labels.length > 0;
  const hasReadingTime = aiResult?.reading_time_minutes != null;
  const briefDescription = aiResult?.brief_description;
  const isProcessingFailed = item.processing_status === "failed";

  return (
    <Card
      key={item.id}
      tabIndex={0}
      className={`
        group cursor-pointer relative overflow-hidden
        w-libraryCard
        transition-all duration-200 ease-out
        bg-white border border-black/[0.06]
        hover:border-black/[0.12] hover:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]
        hover:-translate-y-0.5
        active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.08)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 focus-visible:ring-offset-2
        ${
          selected
            ? "border-black/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] -translate-y-0.5"
            : ""
        }
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={createRipple}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* 图标容器 - 更精致的设计 */}
          <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center shrink-0 border border-black/[0.04]">
            {getContentIcon(item.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* 标题和操作区域 */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base leading-tight line-clamp-2 text-neutral-900 max-w-cardTitle break-words flex-1">
                    {item.title || "无标题"}
                  </h3>

                  {/* 收藏按钮 - 更微妙的显示 */}
                  <FavoriteButton
                    itemId={item.id}
                    size="sm"
                    variant="ghost"
                    className={`
                      h-7 w-7 p-0 shrink-0 text-neutral-400 hover:text-neutral-600
                      opacity-0 group-hover:opacity-100 transition-all duration-200
                      hover:bg-neutral-100
                      ${hovered || selected ? "opacity-100" : ""}
                    `}
                  />
                </div>

                {/* 质量评分 */}
                {hasQualityScore && (
                  <StarRating score={aiResult.content_quality_score!} />
                )}
              </div>

              {/* 操作菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`
                      h-8 w-8 shrink-0 text-neutral-400 hover:text-neutral-600
                      opacity-0 group-hover:opacity-100 transition-all duration-200
                      hover:bg-neutral-100 focus-visible:ring-0
                      ${hovered || selected ? "opacity-100" : ""}
                    `}
                    data-dropdown-trigger
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">更多操作</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-white border border-black/[0.08] shadow-lg"
                  sideOffset={8}
                >
                  <DropdownMenuItem
                    onClick={handleViewDetails}
                    className="focus:bg-neutral-50 text-neutral-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-3" />
                    查看详情
                  </DropdownMenuItem>

                  {isProcessingFailed && (
                    <DropdownMenuItem
                      onClick={handleReprocess}
                      disabled={isProcessing}
                      className="focus:bg-neutral-50 text-neutral-700"
                    >
                      <RotateCcw
                        className={`h-4 w-4 mr-3 ${isProcessing ? "animate-spin" : ""}`}
                      />
                      {isProcessing ? "处理中..." : "重新处理"}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={handleAIAnalysis}
                    className="focus:bg-neutral-50 text-neutral-700"
                  >
                    <Brain className="h-4 w-4 mr-3" />
                    AI 分析
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleCopyLink}
                    className="focus:bg-neutral-50 text-neutral-700"
                  >
                    <Copy className="h-4 w-4 mr-3" />
                    复制链接
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-black/[0.06]" />

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(e);
                    }}
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    {isDeleting ? "删除中..." : "删除"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 描述文本 - 更好的可读性 */}
            <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed max-w-cardTitle break-words">
              {briefDescription || item.summary || "暂无描述"}
            </p>

            {/* 标签 - 更精致的设计 */}
            {hasLabels && (
              <div className="flex flex-wrap gap-1.5 max-w-cardTitle">
                {aiResult.labels!.slice(0, 3).map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-50 text-neutral-600 border border-black/[0.04] hover:bg-neutral-100 transition-colors duration-150"
                  >
                    {label}
                  </span>
                ))}
                {aiResult.labels!.length > 3 && (
                  <span className="text-xs text-neutral-400 self-center">
                    +{aiResult.labels!.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* 底部信息栏 - 更清晰的布局 */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-black/[0.04]">
              <div className="flex items-center gap-3">
                {/* 阅读时间 */}
                {hasReadingTime && (
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">
                      {aiResult.reading_time_minutes} 分钟
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <ProcessingStatusBadge
                  status={item.processing_status as ProcessingStatus}
                  size="sm"
                  className="text-neutral-500"
                />
                <span className="text-neutral-400 font-medium">
                  {relativeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={performDelete}
        itemTitle={item.title || "无标题"}
        isDeleting={isDeleting}
      />
    </Card>
  );
};
