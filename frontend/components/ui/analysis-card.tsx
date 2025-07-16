"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MoreHorizontal,
  Copy,
  Share2,
  ExternalLink,
  Eye,
  ChevronDown,
  Quote,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import styles from "./analysis-card.module.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnalysisContentRenderer } from "./AnalysisContentRenderer";

// 卡片基础类型定义
export interface CardAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  separator?: boolean; // 在此项后添加分隔符
  group?: string; // 分组名称
  condition?: boolean; // 条件显示，默认为true
  shortcut?: string; // 快捷键提示
}

export interface ReferenceInfo {
  id: string;
  title: string;
  source?: string;
  url?: string;
  snippet?: string;
  relevanceScore?: number;
}

// JSON 内容项类型定义
export interface JsonContentItem {
  t: string; // 类型：h1, h2, h3, insight, summary, list, code, etc.
  c: string; // 内容
  ref?: string; // 引用（逗号分隔的数字）
  meta?: Record<string, unknown>; // 额外元数据
}

// JSON 内容解析函数
export const parseJsonContent = (content: string): JsonContentItem[] | null => {
  try {
    // 去除 markdown 代码块标记
    let cleanContent = content.trim();

    // 识别并去除 ```json 开头和 ``` 结尾
    const jsonBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanContent.match(jsonBlockRegex);

    if (match) {
      cleanContent = match[1].trim();
    }

    // 分割成单独的 JSON 行
    const lines = cleanContent.split("\n").filter((line) => line.trim());
    const items: JsonContentItem[] = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line.trim()) as JsonContentItem;
        if (item.t && item.c) {
          items.push(item);
        }
      } catch (lineError) {
        console.warn("无法解析 JSON 行:", line, lineError);
      }
    }

    return items.length > 0 ? items : null;
  } catch (error) {
    console.warn("JSON 内容解析失败:", error);
    return null;
  }
};

// 解析引用字符串为数组
const parseReferences = (refString?: string): number[] => {
  if (!refString) return [];
  return refString
    .split(",")
    .map((ref) => parseInt(ref.trim(), 10))
    .filter((num) => !isNaN(num));
};

// JSON 内容项渲染组件
const JsonContentItemRenderer: React.FC<{
  item: JsonContentItem;
  index: number;
  onReferenceClick?: (refNumber: number) => void;
}> = ({ item, index, onReferenceClick }) => {
  const references = parseReferences(item.ref);

  // 根据类型选择样式
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "h1":
        return "text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4";
      case "h2":
        return "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2";
      case "h3":
        return "text-lg font-medium text-gray-800 dark:text-gray-200 mb-2";
      case "insight":
        return "text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-400 dark:border-blue-500";
      case "summary":
        return "text-sm leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg";
      case "list":
        return "text-sm leading-relaxed text-gray-700 dark:text-gray-300";
      case "code":
        return "text-sm font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700";
      case "warning":
        return "text-sm leading-relaxed text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border-l-4 border-orange-400 dark:border-orange-500";
      case "error":
        return "text-sm leading-relaxed text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border-l-4 border-red-400 dark:border-red-500";
      case "success":
        return "text-sm leading-relaxed text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border-l-4 border-green-400 dark:border-green-500";
      default:
        return "text-sm leading-relaxed text-gray-700 dark:text-gray-300";
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "insight":
        return "💡";
      case "h1":
      case "h2":
      case "h3":
        return "📋";
      case "summary":
        return "📝";
      case "warning":
        return "⚠️";
      case "error":
        return "🚨";
      case "success":
        return "✅";
      case "code":
        return "💻";
      default:
        return "📄";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <div className={cn(getTypeStyles(item.t), "relative group")}>
        {/* 类型标识 */}
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">{getTypeIcon(item.t)}</span>
          <div className="flex-1 min-w-0">
            {/* 处理列表内容 */}
            {item.t === "list" ? (
              <div className="space-y-2">
                {item.c.split("\n").map((listItem, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span className="whitespace-pre-wrap">
                      {listItem.trim()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{item.c}</div>
            )}
          </div>
        </div>

        {/* 引用指示器 */}
        {references.length > 0 && (
          <motion.div
            className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-1">
              <Quote className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                引用 {references.length} 项
              </span>
            </div>
            <div className="flex gap-1">
              {references.slice(0, 5).map((refNum) => (
                <motion.button
                  key={refNum}
                  className={cn(
                    "h-6 w-6 rounded-full text-xs font-medium",
                    "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700",
                    "text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50",
                    "transition-all duration-200 hover:scale-110",
                  )}
                  onClick={() => onReferenceClick?.(refNum)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {refNum}
                </motion.button>
              ))}
              {references.length > 5 && (
                <Badge variant="outline" className="h-6 px-2 text-xs">
                  +{references.length - 5}
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// JSON 内容渲染器组件
export const JsonContentRenderer: React.FC<{
  content: string;
  onReferenceClick?: (refNumber: number) => void;
  className?: string;
}> = ({ content, onReferenceClick, className }) => {
  const parsedItems = parseJsonContent(content);

  if (!parsedItems) {
    // 如果不是 JSON 格式，回退到普通文本显示
    return (
      <div
        className={cn(
          "text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {parsedItems.map((item, index) => (
        <JsonContentItemRenderer
          key={`${item.t}-${index}`}
          item={item}
          index={index}
          onReferenceClick={onReferenceClick}
        />
      ))}
    </div>
  );
};

// 更新 ContentBlock 类型以支持 analysis 内容
export interface ContentBlock {
  id: string;
  type: "text" | "title" | "summary" | "list" | "code" | "json" | "analysis"; // 添加 analysis 类型
  content: string | React.ReactNode;
  tooltip?: string;
  expandable?: boolean;
  references?: ReferenceInfo[];
  metadata?: Record<string, unknown>;
}

export interface AnalysisCardProps {
  // 基础属性
  title?: string;
  subtitle?: string;
  emoji?: string;
  icon?: React.ReactNode;

  // 内容
  contentBlocks: ContentBlock[];

  // 操作
  actions?: CardAction[];
  defaultActions?: boolean; // 是否显示默认操作（复制、分享等）
  onCopyContent?: () => Promise<void> | void; // 新增：复制内容回调
  onDelete?: () => void; // 新增：删除回调

  // 样式和状态
  variant?: "default" | "compact" | "detailed" | "featured";
  selected?: boolean;
  loading?: boolean;
  error?: string;

  // 交互
  onCardClick?: () => void;
  onBlockClick?: (blockId: string) => void;
  onReferenceClick?: (reference: ReferenceInfo) => void;

  // 自定义
  className?: string;
  children?: React.ReactNode;
}

// 智能截断函数
const smartTruncate = (
  text: string,
  maxLength: number,
): { truncated: string; needsTruncation: boolean } => {
  if (text.length <= maxLength) {
    return { truncated: text, needsTruncation: false };
  }

  // 尝试在单词边界截断
  let truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  const lastLineIndex = truncated.lastIndexOf("\n");
  const lastBoundary = Math.max(lastSpaceIndex, lastLineIndex);

  // 如果找到合适的边界且不会截断太多内容
  if (lastBoundary > maxLength * 0.8) {
    truncated = text.slice(0, lastBoundary);
  }

  return { truncated, needsTruncation: true };
};

// 卡片变体样式映射
const cardVariants = {
  default: "",
  compact: "space-y-2",
  detailed: "space-y-4",
  featured:
    "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
};

// 内容块组件
const InteractiveContentBlock: React.FC<{
  block: ContentBlock;
  onBlockClick?: (blockId: string) => void;
  onReferenceClick?: (reference: ReferenceInfo) => void;
}> = ({ block, onBlockClick, onReferenceClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleCopyBlock = async () => {
    try {
      const textContent =
        typeof block.content === "string"
          ? block.content
          : block.content?.toString() || "";
      await navigator.clipboard.writeText(textContent);
      toast({
        title: "已复制",
        description: "内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容",
        variant: "destructive",
      });
    }
  };

  // 处理 JSON 引用点击
  const handleJsonReferenceClick = (refNumber: number) => {
    toast({
      title: "引用点击",
      description: `查看引用 #${refNumber}`,
    });
  };

  // 智能截断逻辑
  const maxLength = 240;
  const isStringContent = typeof block.content === "string";
  const { truncated, needsTruncation } = isStringContent
    ? smartTruncate(block.content, maxLength)
    : { truncated: "", needsTruncation: false };

  const shouldShowTruncation = block.expandable && needsTruncation;
  const displayContent =
    shouldShowTruncation && !isExpanded ? truncated : block.content;

  return (
    <motion.div
      className={cn(
        "group relative p-3 rounded-xl transition-all duration-300",
        styles.contentBlock,
      )}
      onClick={() => onBlockClick?.(block.id)}
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 内容主体 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 内容渲染容器 */}
          <div className="relative">
            <motion.div
              className={cn(
                "transition-colors duration-200",
                block.type === "title" &&
                  "text-base font-semibold text-gray-900 dark:text-gray-100",
                block.type === "summary" && "text-gray-600 dark:text-gray-400",
                block.type === "code" &&
                  "font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded-lg",
                block.type === "json" && "", // JSON 类型使用 JsonContentRenderer 自己的样式
                block.type === "analysis" && "", // Analysis 类型使用 AnalysisContentRenderer 自己的样式
                block.type !== "json" &&
                  block.type !== "analysis" &&
                  "text-sm leading-relaxed text-gray-700 dark:text-gray-300",
              )}
              initial={false}
            >
              {/* 根据内容类型选择渲染方式 */}
              {block.type === "json" && typeof displayContent === "string" ? (
                <JsonContentRenderer
                  content={displayContent}
                  onReferenceClick={handleJsonReferenceClick}
                />
              ) : block.type === "analysis" &&
                typeof displayContent === "string" ? (
                <AnalysisContentRenderer content={displayContent} />
              ) : typeof displayContent === "string" ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isExpanded ? "expanded" : "collapsed"}
                    className="whitespace-pre-wrap"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: 0.015,
                          delayChildren: 0.05,
                        },
                      },
                      exit: {
                        transition: {
                          staggerChildren: 0.015,
                          staggerDirection: -1,
                        },
                      },
                    }}
                  >
                    {displayContent.split("\n").map((line, index) => (
                      <motion.div
                        key={index}
                        variants={{
                          hidden: {
                            opacity: 0,
                            y: 8,
                            filter: "blur(3px)",
                          },
                          visible: {
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            transition: {
                              duration: 0.25,
                              ease: "easeOut",
                            },
                          },
                          exit: {
                            opacity: 0,
                            y: -8,
                            filter: "blur(3px)",
                            transition: {
                              duration: 0.25,
                              ease: "easeIn",
                            },
                          },
                        }}
                      >
                        {line || "\u00A0"} {/* 空行用不间断空格占位 */}
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              ) : (
                displayContent
              )}
            </motion.div>

            {/* 渐变遮罩效果 */}
            {shouldShowTruncation && !isExpanded && (
              <motion.div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-8 pointer-events-none",
                  "bg-gradient-to-t from-white via-white/80 to-transparent",
                  "dark:from-gray-950 dark:via-gray-950/80 dark:to-transparent",
                  styles.fadeGradient,
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              />
            )}
          </div>

          {/* 展开/收起按钮 */}
          {shouldShowTruncation && (
            <motion.div
              className="mt-3 flex items-center justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-4 text-xs font-medium rounded-full",
                    "bg-transparent hover:bg-transparent",
                    "border border-transparent hover:border-transparent",
                    "text-muted-foreground hover:text-foreground",
                    "transition-all duration-200",
                    styles.expandButton,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={false}
                      animate={{
                        rotate: isExpanded ? 180 : 0,
                      }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.div>
                    {isExpanded ? (
                      <span>收起内容</span>
                    ) : (
                      <>
                        <span>展开更多</span>
                        <span className="text-xs opacity-70">
                          (+{block.content.toString().length - truncated.length}
                          字)
                        </span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* 引用指示器 */}
          {block.references && block.references.length > 0 && (
            <motion.div
              className="flex items-center gap-2 mt-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1">
                <Quote className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {block.references.length} 个引用
                </span>
              </div>
              <div className="flex gap-1">
                {block.references.slice(0, 3).map((ref, index) => (
                  <ReferenceIndicator
                    key={ref.id}
                    reference={ref}
                    index={index + 1}
                    onClick={() => onReferenceClick?.(ref)}
                  />
                ))}
                {block.references.length > 3 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    +{block.references.length - 3}
                  </Badge>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* 悬浮操作按钮 */}
        <motion.div
          className={cn("flex items-center gap-1", styles.hoverActions)}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 0, x: 0 }}
          whileHover={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Tooltip信息 */}
          {block.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{block.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 复制按钮 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyBlock();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>复制此块内容</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      </div>
    </motion.div>
  );
};

// 引用指示器组件
const ReferenceIndicator: React.FC<{
  reference: ReferenceInfo;
  index: number;
  onClick: () => void;
}> = ({ reference, index, onClick }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded-full text-xs font-medium",
              styles.referenceIndicator,
            )}
          >
            {index}
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm">{reference.title}</h4>
            {reference.relevanceScore && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(reference.relevanceScore * 100)}%
              </Badge>
            )}
          </div>

          {reference.source && (
            <p className="text-xs text-gray-500">{reference.source}</p>
          )}

          {reference.snippet && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {reference.snippet}
            </p>
          )}

          <div className="flex gap-2">
            {reference.url && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => window.open(reference.url, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                查看来源
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onClick}
            >
              <Eye className="h-3 w-3 mr-1" />
              查看详情
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// 卡片操作菜单组件
const CardActionsMenu: React.FC<{
  actions?: CardAction[];
  defaultActions?: boolean;
  onCopyAll?: () => void;
  onCopyContent?: () => void; // 新增：复制卡片内容
  onDelete?: () => void; // 新增：删除功能
  contentTitle?: string; // 用于删除确认
}> = ({
  actions = [],
  defaultActions = true,
  onCopyAll,
  onCopyContent,
  onDelete,
  contentTitle,
}) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleShare = () => {
    toast({
      title: "分享",
      description: "分享功能开发中...",
    });
  };

  const handleCopyContent = async () => {
    if (onCopyContent) {
      try {
        await onCopyContent();
        toast({
          title: "已复制",
          description: "内容已复制到剪贴板",
        });
      } catch {
        toast({
          title: "复制失败",
          description: "无法复制内容",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteDialog(false);
    }
  };

  // 构建完整的操作列表
  const defaultActionsArray: CardAction[] = [];

  if (defaultActions) {
    if (onCopyContent) {
      defaultActionsArray.push({
        id: "copy-content",
        label: "复制内容",
        icon: Copy,
        onClick: handleCopyContent,
        group: "copy",
      });
    }

    if (onCopyAll) {
      defaultActionsArray.push({
        id: "copy-all",
        label: "复制全部",
        icon: Copy,
        onClick: onCopyAll,
        group: "copy",
      });
    }

    defaultActionsArray.push({
      id: "share",
      label: "分享",
      icon: Share2,
      onClick: handleShare,
      group: "share",
      separator: true,
    });

    if (onDelete) {
      defaultActionsArray.push({
        id: "delete",
        label: "删除",
        icon: AlertTriangle,
        onClick: handleDelete,
        variant: "destructive",
        group: "danger",
      });
    }
  }

  // 合并并筛选操作
  const allActions = [...defaultActionsArray, ...actions].filter(
    (action) => action.condition !== false,
  );

  // 按组分组
  const groupedActions = allActions.reduce(
    (groups, action) => {
      const group = action.group || "default";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(action);
      return groups;
    },
    {} as Record<string, CardAction[]>,
  );

  const renderActionGroup = (groupName: string, groupActions: CardAction[]) => (
    <React.Fragment key={groupName}>
      {groupActions.map((action, index) => (
        <React.Fragment key={action.id}>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              if (!action.disabled) {
                action.onClick();
              }
            }}
            disabled={action.disabled}
            className={cn(
              "focus:bg-neutral-50 text-neutral-700 dark:focus:bg-neutral-800 dark:text-neutral-300",
              "transition-colors duration-150 cursor-pointer",
              "flex items-center gap-3 px-3 py-2.5",
              action.variant === "destructive" &&
                "text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-950/20",
              action.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{action.label}</span>
            </div>
            {action.shortcut && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
                {action.shortcut}
              </span>
            )}
          </DropdownMenuItem>
          {action.separator && index < groupActions.length - 1 && (
            <DropdownMenuSeparator className="bg-neutral-100 dark:bg-neutral-700" />
          )}
        </React.Fragment>
      ))}
    </React.Fragment>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                "transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                "rounded-lg",
                styles.actionsMenu,
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">更多操作</span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className={cn(
            "min-w-[200px] bg-white dark:bg-gray-900",
            "border border-neutral-200 dark:border-neutral-700",
            "shadow-lg rounded-xl",
            "p-1",
          )}
        >
          {Object.entries(groupedActions).map(
            ([groupName, groupActions], groupIndex) => (
              <React.Fragment key={groupName}>
                {groupIndex > 0 && (
                  <DropdownMenuSeparator className="bg-neutral-100 dark:bg-neutral-700 my-1" />
                )}
                {renderActionGroup(groupName, groupActions)}
              </React.Fragment>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg">
                    确认删除
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                    此操作无法撤销
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">即将删除：</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {contentTitle || "此内容"}
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

// 主要的增强卡片组件
export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  title,
  subtitle,
  emoji,
  icon,
  contentBlocks = [], // 添加默认值
  actions,
  defaultActions = true,
  onCopyContent,
  onDelete,
  variant = "default",
  selected = false,
  loading = false,
  error,
  onCardClick,
  onBlockClick,
  onReferenceClick,
  className,
  children,
}) => {
  const { toast } = useToast();

  // 处理卡片点击
  const handleCardClick = useCallback(() => {
    onCardClick?.();
  }, [onCardClick]);

  // 处理复制所有内容
  const handleCopyAll = async () => {
    try {
      const allContent = contentBlocks
        .map((block) => {
          if (typeof block.content === "string") {
            return block.content;
          }
          return block.content?.toString() || "";
        })
        .join("\n\n");

      await navigator.clipboard.writeText(allContent);
      toast({
        title: "已复制",
        description: "所有内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容",
        variant: "destructive",
      });
    }
  };

  // 处理复制卡片核心内容
  const handleCopyContent = async () => {
    try {
      if (onCopyContent) {
        await onCopyContent();
      } else {
        // 默认复制逻辑：只复制主要内容块
        const mainContent = contentBlocks
          .filter((block) => block.type !== "title") // 排除标题
          .map((block) =>
            typeof block.content === "string"
              ? block.content
              : block.content?.toString() || "",
          )
          .join("\n\n");

        await navigator.clipboard.writeText(mainContent);
        toast({
          title: "已复制",
          description: "卡片内容已复制到剪贴板",
        });
      }
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制卡片内容",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className={cn("h-32", className)} data-exclude-selection>
        <CardContent className="flex items-center justify-center h-full">
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("border-destructive", className)}
        data-exclude-selection
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          styles.cardWrapper,
          "group cursor-pointer transition-all duration-200 ease-out analysis-card relative overflow-hidden",
          "bg-transparent border-muted-foreground/20 shadow-sm rounded-lg",
          styles.card,
          styles[variant],
          selected && styles.selected,
          error && styles.error,
          className,
        )}
        onClick={handleCardClick}
        data-exclude-selection
      >
        {/* 背景光晕效果 */}
        <div
          className={cn(
            styles.backgroundGlow,
            variant === "featured" && styles.featuredGlow,
          )}
        />

        {/* 加载状态 */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className={styles.loadingOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader className={cn("pb-4 pt-6 px-6", cardVariants[variant])}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* 图标或emoji */}
              {(emoji || icon) && (
                <motion.div
                  className={cn(
                    styles.iconContainer,
                    "flex items-center justify-center",
                  )}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {emoji ? (
                    <span className="text-xl leading-none">{emoji}</span>
                  ) : (
                    icon
                  )}
                </motion.div>
              )}

              {/* 标题和副标题 */}
              <div className="flex-1 min-w-0">
                {title && (
                  <motion.h3
                    className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {title}
                  </motion.h3>
                )}
                {subtitle && (
                  <motion.p
                    className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {subtitle}
                  </motion.p>
                )}
                {error && (
                  <motion.p
                    className="text-sm text-red-600 dark:text-red-400 mt-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </div>

            {/* 操作菜单 */}
            <CardActionsMenu
              actions={actions}
              defaultActions={defaultActions}
              onCopyAll={handleCopyAll}
              onCopyContent={handleCopyContent}
              onDelete={onDelete}
              contentTitle={title}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-2 px-6 pb-6">
          <AnimatePresence>
            {contentBlocks.map((block, index) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <InteractiveContentBlock
                  block={block}
                  onBlockClick={onBlockClick}
                  onReferenceClick={onReferenceClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {children}
        </CardContent>
      </Card>
    </>
  );
};

// 便捷的预设卡片组件
export const SimpleAnalysisCard: React.FC<{
  title: string;
  summary?: string;
  keyPoints?: string[];
  references?: ReferenceInfo[];
  actions?: CardAction[];
  onViewDetails?: () => void;
}> = ({ title, summary, keyPoints, references, actions, onViewDetails }) => {
  const contentBlocks: ContentBlock[] = [];

  if (summary) {
    contentBlocks.push({
      id: "summary",
      type: "summary",
      content: summary,
      tooltip: "内容摘要",
      expandable: summary.length > 200,
      references,
    });
  }

  if (keyPoints && keyPoints.length > 0) {
    contentBlocks.push({
      id: "keypoints",
      type: "list",
      content: (
        <ul className="space-y-2">
          {keyPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ),
      tooltip: "关键要点",
    });
  }

  const cardActions: CardAction[] = [
    ...(onViewDetails
      ? [
          {
            id: "details",
            label: "查看详情",
            icon: Eye,
            onClick: onViewDetails,
          },
        ]
      : []),
    ...(actions || []),
  ];

  return (
    <AnalysisCard
      title={title}
      emoji="🧠"
      contentBlocks={contentBlocks}
      actions={cardActions}
      variant="default"
    />
  );
};

export default AnalysisCard;
