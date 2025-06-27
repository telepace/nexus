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
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ProcessingStatusBadge,
  ProcessingStatus,
} from "@/components/ui/ProcessingStatusBadge";
import { createRipple } from "../utils/ripple";
import type { ContentItemPublic } from "../types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { contentApi } from "@/lib/api/content";
import { toast } from "sonner";
import { DeleteConfirmDialog, shouldSkipDeleteConfirm } from "./DeleteConfirmDialog";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

interface Props {
  item: ContentItemPublic;
  selected: boolean;
  hovered: boolean;
  viewMode?: ViewMode;
  onCardClick: (item: ContentItemPublic, event?: React.MouseEvent) => void;
  onCardHover: (item: ContentItemPublic | null) => void;
  prefetchContent: (item: ContentItemPublic) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemUpdated?: (item: ContentItemPublic) => void;
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
const StarRating = ({ score, compact = false }: { score: number; compact?: boolean }) => {
  const stars = Math.round(score * 5); // 转换为 5 星制
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  const ratingScore = (score * 5).toFixed(1); // 转换为5分制

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-0.5", compact && "gap-0")}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
                i < fullStars
                  ? "fill-amber-400 text-amber-400"
                  : i === fullStars && hasHalfStar
                    ? "fill-amber-200 text-amber-400"
                    : "text-neutral-300"
              )}
            />
          ))}
          {!compact && (
            <span className="text-xs text-neutral-500 ml-1">
              {ratingScore}/5.0
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>内容质量评分: {ratingScore}/5.0</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 格式化时间
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "今天";
  if (diffDays === 2) return "昨天";
  if (diffDays <= 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const ContentCard = ({
  item,
  selected,
  hovered,
  viewMode = "grid",
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

  // 处理点击事件 - 立即跳转到阅读器
  const handleClick = (event: React.MouseEvent) => {
    // 立即调用点击处理函数，提供即时反馈
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
      await contentApi.analyzeContent(item.id, "请分析这个内容的主要观点和见解");
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
    // 阻止事件传播，防止触发卡片点击
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 检查是否跳过确认
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
  const briefDescription = aiResult?.brief_description || item.summary;
  const isProcessingFailed = item.processing_status === "failed";

  // 网格视图布局
  if (viewMode === "grid") {
    return (
      <Card
        key={item.id}
        tabIndex={0}
        className={cn(
          "group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 ease-out",
          "border-0 bg-gradient-to-br from-background via-background to-background/60",
          "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1",
          selected && "bg-accent/30 shadow-md ring-1 ring-primary/20",
          hovered && !selected && "bg-muted/50 shadow-sm"
        )}
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
        <CardContent className="p-6">
          {/* 头部区域 */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              {getContentIcon(item.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base line-clamp-2 text-foreground leading-tight">
                  {item.title || "无标题"}
                </h3>
                
                {/* 三个点菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
                      data-dropdown-trigger
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleViewDetails}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    
                    {isProcessingFailed && (
                      <DropdownMenuItem onClick={handleReprocess} disabled={isProcessing}>
                        <RotateCcw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
                        {isProcessing ? "处理中..." : "重新处理"}
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={handleAIAnalysis}>
                      <Brain className="h-4 w-4 mr-2" />
                      AI 分析
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      复制链接
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className={cn("h-4 w-4 mr-2", isDeleting && "animate-spin")} />
                      {isDeleting ? "删除中..." : "删除"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* 评分 */}
              {hasQualityScore && (
                <div className="mt-2">
                  <StarRating score={aiResult.content_quality_score!} />
                </div>
              )}
            </div>
          </div>

          {/* 描述 */}
          {briefDescription && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
              {briefDescription}
            </p>
          )}

          {/* 标签 */}
          {hasLabels && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {aiResult.labels!.slice(0, 3).map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted/80 transition-colors"
                >
                  {label}
                </Badge>
              ))}
              {aiResult.labels!.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">
                  +{aiResult.labels!.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 底部元信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {hasReadingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{aiResult.reading_time_minutes} 分钟</span>
                </div>
              )}
              <ProcessingStatusBadge status={item.processing_status as ProcessingStatus} />
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(item.created_at)}</span>
            </div>
          </div>
        </CardContent>

        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={performDelete}
          itemTitle={item.title || "无标题"}
        />
      </Card>
    );
  }

  // 列表视图布局
  return (
    <Card
      key={item.id}
      tabIndex={0}
      className={cn(
        "group cursor-pointer transition-all duration-200 ease-out border-0 border-b rounded-none",
        "hover:bg-muted/30",
        selected && "bg-accent/30",
        hovered && !selected && "bg-muted/20"
      )}
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
      <CardContent className="p-4 flex items-center gap-4">
        {/* 图标 */}
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          {getContentIcon(item.type)}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          {/* 标题和描述 */}
          <div className="col-span-6 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm line-clamp-1 text-foreground">
                {item.title || "无标题"}
              </h3>
              {hasQualityScore && (
                <StarRating score={aiResult.content_quality_score!} compact />
              )}
            </div>
            {briefDescription && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {briefDescription}
              </p>
            )}
          </div>

          {/* 标签 */}
          <div className="col-span-3 min-w-0">
            {hasLabels && (
              <div className="flex gap-1 overflow-hidden">
                {aiResult.labels!.slice(0, 2).map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 rounded-full bg-muted/60 shrink-0"
                  >
                    {label}
                  </Badge>
                ))}
                {aiResult.labels!.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{aiResult.labels!.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 元信息 */}
          <div className="col-span-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {hasReadingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{aiResult.reading_time_minutes}分钟</span>
                </div>
              )}
            </div>
            <span>{formatDate(item.created_at)}</span>
          </div>

          {/* 操作按钮 */}
          <div className="col-span-1 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  data-dropdown-trigger
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleViewDetails}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  查看详情
                </DropdownMenuItem>
                
                {isProcessingFailed && (
                  <DropdownMenuItem onClick={handleReprocess} disabled={isProcessing}>
                    <RotateCcw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
                    {isProcessing ? "处理中..." : "重新处理"}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleAIAnalysis}>
                  <Brain className="h-4 w-4 mr-2" />
                  AI 分析
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  复制链接
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className={cn("h-4 w-4 mr-2", isDeleting && "animate-spin")} />
                  {isDeleting ? "删除中..." : "删除"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={performDelete}
          itemTitle={item.title || "无标题"}
        />
      </CardContent>
    </Card>
  );
};
