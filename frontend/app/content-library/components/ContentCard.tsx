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

// 星级评分组件 - 日式简约风格
const StarRating = ({ score, compact = false }: { score: number; compact?: boolean }) => {
  const stars = Math.round(score * 5); // 转换为 5 星制
  const fullStars = Math.floor(stars);
  const ratingScore = (score * 5).toFixed(1); // 转换为5分制

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-1", compact && "gap-0.5")}>
          <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
              <div
              key={i}
                className={cn(
                  compact ? "w-3 h-3" : "w-3 h-3",
                  "relative"
                )}
                style={{
                  clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                }}
              >
                <div 
                  className={cn(
                    "w-full h-full transition-colors duration-200",
                    i < fullStars ? "bg-amber-400" : "bg-black/8"
                  )}
            />
              </div>
          ))}
          </div>
          {!compact && (
            <span className="text-xs text-neutral-500 ml-1 font-light">
              {ratingScore}
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

  // 网格视图布局 - 日式极简风格
  if (viewMode === "grid") {
  return (
    <Card
      key={item.id}
      tabIndex={0}
        className={cn(
          "group cursor-pointer overflow-hidden transition-all duration-300 ease-out relative",
          // 日式极简：纯白背景 + 极细边框
          "bg-white border border-black/6 rounded-md",
          // 悬浮效果：微妙阴影 + 轻微上移
          "hover:border-black/12 hover:shadow-lg hover:shadow-black/8 hover:-translate-y-0.5",
          // 选中和悬浮状态
          selected && "border-black/15 shadow-md shadow-black/8",
          hovered && !selected && "border-black/10 shadow-sm shadow-black/5"
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
        {/* 悬浮时的渐变overlay */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100">
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)"
            }}
          />
        </div>

        <CardContent className="p-5 relative z-10">
          {/* 头部区域 */}
          <div className="flex items-start gap-3 mb-4">
            {/* 优化图标容器 - 更小更精致 */}
            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0 group-hover:bg-black/8 transition-colors duration-200">
              <div className="text-neutral-600 group-hover:text-neutral-700 transition-colors duration-200">
            {getContentIcon(item.type)}
          </div>
            </div>
            
            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                {/* 优化标题样式 - 更好的垂直对齐 */}
                <h3 className="font-medium text-base line-clamp-2 text-neutral-900 leading-tight tracking-tight pt-0.5">
                  {item.title || "无标题"}
                </h3>
              
              {/* 三个点菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 hover:bg-black/5"
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
            </div>

          {/* 描述 */}
          {briefDescription && (
            <p className="text-sm text-neutral-600 line-clamp-2 mb-4 leading-relaxed font-light">
              {briefDescription}
            </p>
          )}

          {/* 标签 - 统一样式，无颜色区分 */}
            {hasLabels && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {aiResult.labels!.slice(0, 3).map((label) => (
                  <span
                  key={label}
                  className="inline-flex items-center px-2 py-1 bg-black/4 text-neutral-600 text-xs font-light rounded-sm border-none transition-all duration-200 hover:bg-black/8 hover:text-neutral-800 hover:-translate-y-px"
                  >
                    {label}
                  </span>
                ))}
                {aiResult.labels!.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 border border-black/8 text-neutral-500 text-xs font-light rounded-sm">
                    +{aiResult.labels!.length - 3}
                  </span>
                )}
              </div>
            )}

          {/* 底部元信息 - 评分、阅读时间、发布时间在一行 */}
          <div className="flex items-center justify-between text-xs text-neutral-400 font-light">
              <div className="flex items-center gap-3">
              {/* 评分 */}
              {hasQualityScore && <StarRating score={aiResult.content_quality_score!} compact />}
              
                {/* 阅读时间 */}
                {hasReadingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{aiResult.reading_time_minutes} 分钟</span>
                  </div>
                )}
              
              {/* 处理状态 */}
              <ProcessingStatusBadge status={item.processing_status as ProcessingStatus} />
              </div>

            {/* 发布时间 */}
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

  // 列表视图布局 - 保持简约风格
  return (
    <Card
      key={item.id}
      tabIndex={0}
      className={cn(
        "group cursor-pointer transition-all duration-200 ease-out border-0 border-b border-black/4 rounded-none",
        "hover:bg-black/2",
        selected && "bg-black/3",
        hovered && !selected && "bg-black/1"
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
        {/* 图标 - 优化尺寸和样式 */}
        <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center shrink-0 group-hover:bg-black/8 transition-colors duration-200">
          <div className="text-neutral-600 group-hover:text-neutral-700 transition-colors duration-200">
            {getContentIcon(item.type)}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          {/* 标题和描述 */}
          <div className="col-span-6 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm line-clamp-1 text-neutral-900">
                {item.title || "无标题"}
              </h3>
              {hasQualityScore && (
                <StarRating score={aiResult.content_quality_score!} compact />
              )}
            </div>
            {briefDescription && (
              <p className="text-xs text-neutral-600 line-clamp-1 font-light">
                {briefDescription}
              </p>
            )}
          </div>

          {/* 标签 */}
          <div className="col-span-3 min-w-0">
            {hasLabels && (
              <div className="flex gap-1 overflow-hidden">
                {aiResult.labels!.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center px-1.5 py-0.5 bg-black/4 text-neutral-600 text-xs font-light rounded-sm shrink-0"
                  >
                    {label}
                  </span>
                ))}
                {aiResult.labels!.length > 2 && (
                  <span className="text-xs text-neutral-400 font-light">
                    +{aiResult.labels!.length - 2}
                </span>
                )}
              </div>
            )}
          </div>

          {/* 元信息 */}
          <div className="col-span-2 flex items-center justify-between text-xs text-neutral-400 font-light">
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
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/5"
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
