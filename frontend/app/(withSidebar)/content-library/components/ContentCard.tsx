"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Clock,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  Brain,
  ExternalLink,
  Copy,
  RefreshCw,
} from "lucide-react";
import { TwitchLogo } from "@phosphor-icons/react";
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
import React, { useState, useCallback, useRef } from "react";
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

const getContentIcon = () => {
  return <TwitchLogo size={20} weight="bold" />;
};

// 星级评分组件 - 更简洁的设计
const StarRating = ({ score }: { score: number }) => {
  const stars = score * 5;
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  const ratingScore = stars.toFixed(1);

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
      <span className="text-xs text-neutral-500 ml-1">{ratingScore}</span>
    </div>
  );
};

export const ContentCard = React.memo(
  ({
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
    const [isRegeneratingAI, setIsRegeneratingAI] = useState(false);

    // 相对时间标签
    const relativeLabel = useRelativeTime(item.created_at);

    // 简化的卡片点击处理 - 只处理卡片主体区域的点击
    const handleCardClick = useCallback(
      (event: React.MouseEvent) => {
        onCardClick(item, event);
      },
      [item, onCardClick],
    );

    // 防抖定时器引用
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 处理鼠标进入事件 - 优化性能，减少不必要的调用
    const handleMouseEnter = useCallback(() => {
      // 清除之前的定时器
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // 立即设置悬浮状态
      onCardHover(item);
      prefetchContent(item);
    }, [item, onCardHover, prefetchContent]);

    // 处理鼠标离开事件 - 粘性预览行为，不清空悬浮状态
    const handleMouseLeave = useCallback(() => {
      // 清除之前的定时器
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      // 不再调用 onCardHover(null)，实现预览内容的粘性显示
      // 预览内容会保持到用户悬浮到下一个卡片为止
    }, []);

    // 清理定时器
    React.useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

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

    // 处理重新生成AI分析
    const handleRegenerateAI = async () => {
      setIsRegeneratingAI(true);
      try {
        await contentApi.regenerateAIAnalysis(item.id);
        toast.success("AI 分析重新生成已开始，请稍后查看结果");
        // 可选：触发数据刷新
        onItemUpdated?.(item);
      } catch (error) {
        console.error("重新生成 AI 分析失败:", error);
        toast.error("重新生成 AI 分析失败，请稍后重试");
      } finally {
        setIsRegeneratingAI(false);
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

    // 处理复制内容
    const handleCopyContent = async () => {
      try {
        let content = "";

        // 构建内容文本
        if (item.title) {
          content += `# ${item.title}\n\n`;
        }

        if (briefDescription) {
          content += `## 摘要\n${briefDescription}\n\n`;
        }

        const fullText = (item as ContentItemPublic & { content_text?: string })
          .content_text;
        if (fullText) {
          content += `## 内容\n${fullText}\n\n`;
        }

        if (hasLabels && aiResult.labels) {
          content += `## 标签\n${aiResult.labels.join(", ")}\n\n`;
        }

        if (item.source_uri) {
          content += `## 来源\n${item.source_uri}`;
        }

        await navigator.clipboard.writeText(content.trim());
        toast.success("内容已复制到剪贴板");
      } catch (error) {
        console.error("复制内容失败:", error);
        toast.error("复制内容失败");
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
        className={`
        group relative overflow-hidden
        w-libraryCard
        transition-all duration-200 ease-out
        rounded-lg overflow-hidden
        ${
          selected
            ? "bg-[var(--color-linear-bg-2)] border-[var(--mac-gray-5)] shadow-md"
            : hovered
              ? "bg-muted/50 border-muted-foreground/20 shadow-sm"
              : "bg-transparent border border-transparent shadow-none hover:bg-transparent hover:border-transparent"
        }
      `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardContent className="p-5 pl-2 flex flex-col h-full relative min-h-[140px]">
          {/* 交互按钮层 - 绝对定位，独立于卡片内容 */}
          <div className="absolute top-4 right-4 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <FavoriteButton
              itemId={item.id}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-accent/50 focus-visible:ring-0 focus-visible:border-transparent"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-accent/50 focus-visible:ring-0 focus-visible:border-transparent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">更多操作</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 z-50">
                <DropdownMenuItem
                  onClick={handleViewDetails}
                  className="focus:bg-accent/50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  查看详情
                </DropdownMenuItem>

                {isProcessingFailed && (
                  <DropdownMenuItem
                    onClick={handleReprocess}
                    disabled={isProcessing}
                    className="focus:bg-accent/50"
                  >
                    <RotateCcw
                      className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`}
                    />
                    {isProcessing ? "处理中..." : "重新处理"}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={handleAIAnalysis}
                  className="focus:bg-accent/50"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI 分析
                </DropdownMenuItem>

                {item.ai_result && item.processing_status === "completed" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRegenerateAI();
                    }}
                    disabled={isRegeneratingAI}
                    className="focus:bg-accent/50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isRegeneratingAI ? "animate-spin" : ""}`}
                    />
                    {isRegeneratingAI ? "重新生成中..." : "重新生成 AI 分析"}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={handleCopyLink}
                  className="focus:bg-accent/50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制链接
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCopyContent}
                  className="focus:bg-accent/50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制内容
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(e);
                  }}
                  disabled={isDeleting}
                  className="text-[var(--destructive)] focus:text-[var(--destructive)] hover:bg-[var(--destructive)/0.1]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "删除中..." : "删除"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 卡片主体内容区域 - 独立的点击区域 */}
          <div
            className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={handleCardClick}
            onMouseDown={(e) => {
              createRipple(e);
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardClick(e as unknown as React.MouseEvent);
              }
            }}
          >
            <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
              {getContentIcon()}
            </div>

            <div className="flex-1 min-w-0 space-y-2 pr-16">
              <div className="space-y-1">
                <h3 className="font-medium text-base line-clamp-3 text-neutral-800 dark:text-neutral-100 max-w-cardTitle break-words leading-snug">
                  {item.title || "无标题"}
                </h3>
              </div>

              <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed max-w-cardTitle break-words">
                {briefDescription || item.summary || "暂无描述"}
              </p>

              {hasLabels && (
                <div className="flex flex-wrap gap-1 max-w-cardTitle">
                  {aiResult.labels!.slice(0, 2).map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--library-tag-bg)] text-muted-foreground hover:bg-[var(--library-tag-bg-hover)] transition-colors duration-150 ease-out"
                    >
                      {label}
                    </span>
                  ))}
                  {aiResult.labels!.length > 2 && (
                    <span className="text-xs text-neutral-400 self-center">
                      +{aiResult.labels!.length - 2}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  {hasQualityScore && (
                    <div className="flex items-center gap-1 text-neutral-400">
                      <StarRating score={aiResult.content_quality_score!} />
                    </div>
                  )}
                  {hasReadingTime && (
                    <div className="flex items-center gap-1 text-neutral-400">
                      <Clock className="h-3 w-3" />
                      <span>{aiResult.reading_time_minutes} 分钟</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ProcessingStatusBadge
                    status={item.processing_status as ProcessingStatus}
                    size="sm"
                    className="text-neutral-500"
                  />
                  <span className="w-5 text-right">{relativeLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={performDelete}
          itemTitle={item.title || "无标题"}
          isDeleting={isDeleting}
        />
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // 性能优化：只在关键属性变化时重新渲染
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.selected === nextProps.selected &&
      prevProps.hovered === nextProps.hovered &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.processing_status === nextProps.item.processing_status &&
      JSON.stringify(prevProps.item.ai_result) ===
        JSON.stringify(nextProps.item.ai_result)
    );
  },
);

ContentCard.displayName = "ContentCard";
